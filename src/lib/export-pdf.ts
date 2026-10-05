import {
  beginText,
  endText,
  moveText,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFOperator,
  PDFOperatorNames,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  setFontAndSize,
  setTextRenderingMode,
  showText,
  StandardFonts,
  TextRenderingMode,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";
import { coverRows, expandTabs, type AssignmentDoc } from "./assignment";
import { coverSpec, coverTitle, pageBorder, type CoverSpec } from "./cover-styles";
import { highlight, type Token } from "./highlight";
import { ideTheme, type IdeTheme, type TokenStyle } from "./ide-themes";
import { dataUrlToBytes } from "./images";
import type { CoverDetails, Language } from "./types";

const PAGE: [number, number] = [595.28, 841.89];
const MARGIN = 56;
const CONTENT_W = PAGE[0] - MARGIN * 2;
const BOTTOM = 60;

/** JetBrains Mono and Courier glyphs are both exactly 0.6em wide; the code layout relies on it. */
const CHAR_EM = 0.6;
const CODE_SIZE = 8.5;
const CODE_MIN_SIZE = 6;
const CODE_PAD = 10;
const GUTTER = 30;
const NUMBER_SIZE = 7;
const TAB_BAR = 19;
const TOOLBAR = 15;
const NBSP = " ";

const ink = rgb(0.14, 0.1, 0.12);
const muted = rgb(0.45, 0.4, 0.42);
const accent = rgb(0.71, 0.31, 0.17);
const codeBorder = rgb(0.9, 0.85, 0.82);
const gutterInk = rgb(0.66, 0.6, 0.62);

function hex(color: string) {
  const n = parseInt(color, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** The tokens covering characters [start, end) of a line, cut at the edges. */
function sliceTokens(tokens: Token[], start: number, end: number) {
  const out: Token[] = [];
  let at = 0;
  for (const token of tokens) {
    const from = Math.max(start, at);
    const to = Math.min(end, at + token.text.length);
    if (from < to) out.push({ text: token.text.slice(from - at, to - at), kind: token.kind });
    at += token.text.length;
  }
  return out;
}

type Variant = "regular" | "bold" | "italic" | "boldItalic";

/** The part of a fontkit font used to draw glyphs as shapes. */
type GlyphFont = {
  unitsPerEm: number;
  glyphForCodePoint(codePoint: number): { path: { scale(x: number, y: number): { toSVG(): string } } };
};

type CodeFonts = Record<Variant, PDFFont> & {
  unicode: boolean;
  /** The same fonts' outlines, for drawing code as shapes; null with the Courier fallback. */
  shapes: Record<Variant, GlyphFont> | null;
};

const VARIANTS: [Variant, string][] = [
  ["regular", "Regular"],
  ["bold", "Bold"],
  ["italic", "Italic"],
  ["boldItalic", "BoldItalic"],
];

/**
 * JetBrains Mono for code, fetched from /fonts and embedded (only the
 * characters used). Outside a browser, or if the fetch fails, the standard
 * Courier fonts, which only cover Latin-1.
 */
async function codeFonts(pdf: PDFDocument): Promise<CodeFonts> {
  if (typeof window !== "undefined") {
    try {
      const fontkit = (await import("@pdf-lib/fontkit")).default;
      pdf.registerFontkit(fontkit);
      const loaded = await Promise.all(
        VARIANTS.map(async ([, file]) => {
          const response = await fetch(`/fonts/JetBrainsMono-${file}.ttf`);
          if (!response.ok) throw new Error(`Font ${file} missing`);
          const bytes = new Uint8Array(await response.arrayBuffer());
          // Ligatures off: JetBrains Mono would join <= into ≤, which the IDEs don't.
          const font = await pdf.embedFont(bytes, { subset: true, features: { calt: false, liga: false, clig: false } });
          return { font, shape: fontkit.create(bytes) as unknown as GlyphFont };
        }),
      );
      const pick = <T,>(get: (l: (typeof loaded)[number]) => T) =>
        Object.fromEntries(VARIANTS.map(([variant], i) => [variant, get(loaded[i])])) as Record<Variant, T>;
      return { ...pick((l) => l.font), unicode: true, shapes: pick((l) => l.shape) };
    } catch (error) {
      console.warn("Falling back to Courier for code:", error);
    }
  }
  const [regular, bold, italic, boldItalic] = await Promise.all(
    [StandardFonts.Courier, StandardFonts.CourierBold, StandardFonts.CourierOblique, StandardFonts.CourierBoldOblique].map((f) =>
      pdf.embedFont(f),
    ),
  );
  return { regular, bold, italic, boldItalic, unicode: false, shapes: null };
}

function variantOf(style: TokenStyle): Variant {
  if (style.bold && style.italic) return "boldItalic";
  if (style.bold) return "bold";
  if (style.italic) return "italic";
  return "regular";
}

/** The standard PDF fonts only cover Latin-1; anything else would throw. */
function safe(text: string) {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

function wrapText(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  for (const paragraph of safe(text).split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > width && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    lines.push(line);
  }
  return lines;
}

class Writer {
  page!: PDFPage;
  y = 0;
  pageNo = 0;

  constructor(
    private pdf: PDFDocument,
    public fonts: { regular: PDFFont; bold: PDFFont; mono: PDFFont; code: CodeFonts },
  ) {}

  /** Border drawn on every new page; the cover draws its own, so this is set after it. */
  pageBorder: CoverSpec["border"] = "none";

  frame(border: CoverSpec["border"]) {
    const rect = (inset: number, thickness: number) =>
      this.page.drawRectangle({
        x: inset,
        y: inset,
        width: PAGE[0] - inset * 2,
        height: PAGE[1] - inset * 2,
        borderColor: ink,
        borderWidth: thickness,
      });
    if (border === "single") rect(BORDER_INSET, 1.2);
    if (border === "double") {
      rect(BORDER_INSET, 0.8);
      rect(BORDER_INSET + 4, 0.8);
    }
    if (border === "thick") rect(BORDER_INSET, 3);
  }

  /** Every page, the cover included, gets its number centred at the bottom. */
  newPage() {
    this.page = this.pdf.addPage(PAGE);
    this.y = PAGE[1] - MARGIN;
    this.frame(this.pageBorder);
    this.pageNo++;
    const text = String(this.pageNo);
    this.page.drawText(text, {
      x: (PAGE[0] - this.fonts.regular.widthOfTextAtSize(text, 9)) / 2,
      y: 30,
      size: 9,
      font: this.fonts.regular,
      color: gutterInk,
    });
  }

  ensure(height: number) {
    if (this.y - height < BOTTOM) this.newPage();
  }

  text(content: string, opts: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; gap?: number }) {
    const font = opts.font ?? this.fonts.regular;
    const size = opts.size ?? 11;
    const lineHeight = size * 1.4;
    for (const line of wrapText(content, font, size, CONTENT_W)) {
      this.ensure(lineHeight);
      this.y -= lineHeight;
      this.page.drawText(line, { x: MARGIN, y: this.y + size * 0.3, size, font, color: opts.color ?? ink });
    }
    this.y -= opts.gap ?? 0;
  }

  private numberImages = new Map<string, PDFImage | null>();

  /**
   * Line numbers are drawn as tiny pictures, not text, so copying code out of
   * the PDF never picks them up. Outside a browser (no canvas) they're left out.
   */
  private async lineNumber(no: number, color: string) {
    const key = `${color}:${no}`;
    if (this.numberImages.has(key)) return this.numberImages.get(key)!;
    let image: PDFImage | null = null;
    if (typeof document !== "undefined") {
      const scale = 4;
      const canvas = document.createElement("canvas");
      canvas.width = (GUTTER - 8) * scale;
      canvas.height = NUMBER_SIZE * 1.3 * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.font = `${NUMBER_SIZE * scale}px "ZH Code", Consolas, "Courier New", monospace`;
      ctx.fillStyle = `#${color}`;
      ctx.textAlign = "right";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(String(no), canvas.width, NUMBER_SIZE * scale);
      image = await this.pdf.embedPng(dataUrlToBytes(canvas.toDataURL("image/png")));
    }
    this.numberImages.set(key, image);
    return image;
  }

  /**
   * Draws text whose copied form is `copyAs` rather than what PDF readers
   * rebuild from the glyphs (an ActualText span). Chrome and Edge squeeze
   * spaces and drop blank lines when they rebuild it, which breaks pasted code.
   */
  private drawWithCopyText(copyAs: string, draw: () => void) {
    const props = this.pdf.context.obj({ ActualText: PDFHexString.fromText(copyAs) });
    // The PDF spec allows an inline dictionary here and pdf-lib writes it
    // correctly; its types just don't list dictionaries as operator arguments.
    const args = [PDFName.of("Span"), props] as unknown as PDFName[];
    this.page.pushOperators(PDFOperator.of(PDFOperatorNames.BeginMarkedContentSequence, args));
    draw();
    this.page.pushOperators(PDFOperator.of(PDFOperatorNames.EndMarkedContent));
  }

  private glyphPaths = new Map<string, string>();

  /**
   * Draws text as filled glyph outlines rather than text, so it looks the same
   * but can't be selected. Each glyph is one monospace cell wide.
   */
  private drawShapes(text: string, x: number, baseline: number, size: number, variant: Variant, color: string) {
    const font = this.fonts.code.shapes![variant];
    const scale = size / font.unitsPerEm;
    let cx = x;
    for (const char of text) {
      if (char !== " ") {
        const key = `${variant}:${char}`;
        let path = this.glyphPaths.get(key);
        if (path === undefined) {
          // Font outlines point y up; drawSvgPath expects SVG's y down.
          path = font.glyphForCodePoint(char.codePointAt(0)!).path.scale(1, -1).toSVG();
          this.glyphPaths.set(key, path);
        }
        if (path) this.page.drawSvgPath(path, { x: cx, y: baseline, scale, color: hex(color) });
      }
      cx += size * CHAR_EM;
    }
  }

  private invisibleFontKeys = new Map<PDFPage, PDFName>();

  /**
   * Invisible text over the shapes: this is what selecting and copying picks
   * up. One piece of text per row, so a whole line selects at once.
   */
  private drawInvisibleText(text: string, x: number, baseline: number, size: number) {
    const font = this.fonts.code.regular;
    let key = this.invisibleFontKeys.get(this.page);
    if (!key) {
      key = this.page.node.newFontDictionary(font.name, font.ref);
      this.invisibleFontKeys.set(this.page, key);
    }
    // The rendering mode outlives the text block, so save and restore the
    // graphics state around it, or every later piece of text would be invisible.
    this.page.pushOperators(
      pushGraphicsState(),
      beginText(),
      setFontAndSize(key, size),
      setTextRenderingMode(TextRenderingMode.Invisible),
      moveText(x, baseline),
      showText(font.encodeText(text.replace(/[\u0000-\u001f]/g, " "))),
      endText(),
      popGraphicsState(),
    );
  }

  /** The IDE's file tab (and NetBeans' Source/History strip) above the code. */
  private codeHeader(fileName: string, theme: IdeTheme) {
    const bar = theme.tabBar;
    const tabSize = 7.5;
    const labelFont = bar.bold ? this.fonts.bold : this.fonts.regular;
    const label = `${safe(fileName)}   ×`;
    const tabWidth = labelFont.widthOfTextAtSize(label, tabSize) + 24;
    const top = this.y;

    this.page.drawRectangle({ x: MARGIN, y: top - TAB_BAR, width: CONTENT_W, height: TAB_BAR, color: hex(bar.background) });
    this.page.drawRectangle({
      x: MARGIN,
      y: top - TAB_BAR,
      width: tabWidth,
      height: TAB_BAR - 3,
      color: hex(bar.tab),
      borderColor: bar.border ? hex(bar.border) : undefined,
      borderWidth: bar.border ? 0.6 : 0,
    });
    if (bar.accent) {
      this.page.drawRectangle({ x: MARGIN, y: top - 4, width: tabWidth, height: 1.2, color: hex(bar.accent) });
    }
    this.page.drawText(label, { x: MARGIN + 12, y: top - TAB_BAR + 6, size: tabSize, font: labelFont, color: hex(bar.text) });
    this.y -= TAB_BAR;

    if (theme.toolbar) {
      const bar2 = theme.toolbar;
      this.page.drawRectangle({ x: MARGIN, y: this.y - TOOLBAR, width: CONTENT_W, height: TOOLBAR, color: hex(bar2.background) });
      this.page.drawRectangle({ x: MARGIN + 4, y: this.y - TOOLBAR + 2.5, width: 34, height: TOOLBAR - 5, color: hex("FFFFFF"), borderColor: hex("C0C0C0"), borderWidth: 0.5 });
      this.page.drawText("Source", { x: MARGIN + 9, y: this.y - TOOLBAR + 5, size: 6.5, font: this.fonts.regular, color: hex(bar2.text) });
      this.page.drawText("History", { x: MARGIN + 46, y: this.y - TOOLBAR + 5, size: 6.5, font: this.fonts.regular, color: hex(bar2.text) });
      this.y -= TOOLBAR;
    }
  }

  /**
   * Code is drawn the way the chosen IDE shows it: its file tab, gutter,
   * background and syntax colours. Each line still copies out exactly as
   * written (indentation, spacing and blank lines kept, line numbers left
   * out). Long lines shrink the font (down to 6pt) rather than wrap; a line
   * that still doesn't fit wraps on screen at a space but copies as one line,
   * and never splits across pages.
   */
  async code(file: { name: string; content: string; language: Language }, theme: IdeTheme) {
    const source = file.content
      .replace(/\r\n?/g, "\n")
      .replace(/\n+$/, "")
      .split("\n")
      .map((raw) => expandTabs(raw).replace(/\s+$/, ""));
    const tokens = highlight(source.join("\n"), file.language);
    const codeX = MARGIN + GUTTER + CODE_PAD;
    const width = MARGIN + CONTENT_W - CODE_PAD - codeX;
    const longest = Math.max(1, ...source.map((line) => line.length));
    const size = Math.max(CODE_MIN_SIZE, Math.min(CODE_SIZE, width / (longest * CHAR_EM)));
    const charWidth = size * CHAR_EM;
    const lineHeight = size * 1.45;
    const perRow = Math.floor(width / charWidth);

    const lines = source.map((text, i) => {
      // Break points for a line too long for the page, at a space where possible.
      const cuts: number[] = [0];
      while (text.length - cuts.at(-1)! > perRow) {
        const from = cuts.at(-1)!;
        const space = text.lastIndexOf(" ", from + perRow);
        cuts.push(space > from + perRow * 0.5 ? space + 1 : from + perRow);
      }
      const rows = cuts.map((start, r) => sliceTokens(tokens[i] ?? [], start, cuts[r + 1] ?? text.length));
      // Readers keep non-breaking spaces (and paste them as normal spaces)
      // but squeeze ordinary ones. A blank line needs two to survive at all.
      const copy = text ? text.replace(/ /g, NBSP) : NBSP + NBSP;
      return { no: i + 1, rows, copy };
    });

    const headerHeight = TAB_BAR + (theme.toolbar ? TOOLBAR : 0);
    const border = hex(theme.gutter.border ?? "3C3C3C");
    let first = true;
    let index = 0;
    while (index < lines.length) {
      this.ensure((first ? headerHeight : 0) + lineHeight * 3 + CODE_PAD * 2);
      const blockTop = this.y;
      if (first) this.codeHeader(file.name, theme);
      const fit = Math.floor((this.y - BOTTOM - CODE_PAD * 2) / lineHeight);
      // Whole lines only, so a wrapped line stays on one page.
      const chunk: typeof lines = [];
      let used = 0;
      while (index + chunk.length < lines.length) {
        const next = lines[index + chunk.length];
        if (chunk.length && used + next.rows.length > fit) break;
        chunk.push(next);
        used += next.rows.length;
      }
      const height = used * lineHeight + CODE_PAD * 2;
      const bottom = this.y - height;
      this.page.drawRectangle({ x: MARGIN, y: bottom, width: CONTENT_W, height, color: hex(theme.background) });
      this.page.drawRectangle({ x: MARGIN, y: bottom, width: GUTTER, height, color: hex(theme.gutter.background) });
      if (theme.gutter.border) {
        this.page.drawLine({ start: { x: MARGIN + GUTTER, y: bottom }, end: { x: MARGIN + GUTTER, y: this.y }, thickness: 0.6, color: border });
      }
      const marginX = codeX + 80 * charWidth;
      if (theme.rightMargin && marginX < MARGIN + CONTENT_W - 2) {
        this.page.drawLine({ start: { x: marginX, y: bottom }, end: { x: marginX, y: this.y }, thickness: 0.6, color: hex(theme.rightMargin) });
      }
      this.page.drawRectangle({ x: MARGIN, y: bottom, width: CONTENT_W, height: blockTop - bottom, borderColor: border, borderWidth: 0.6 });

      let rowY = this.y - CODE_PAD - lineHeight + size * 0.4;
      for (const line of chunk) {
        const baselines = line.rows.map((_, r) => rowY - r * lineHeight);
        if (this.fonts.code.shapes) {
          // Shapes you see (numbers and coloured code), and invisible text
          // you select and copy: one text run per row, so a whole line
          // selects at once and copies exactly as written.
          const no = String(line.no);
          this.drawShapes(no, MARGIN + GUTTER - 5 - no.length * NUMBER_SIZE * CHAR_EM, rowY, NUMBER_SIZE, "regular", theme.gutter.number);
          line.rows.forEach((row, r) => {
            let x = codeX;
            for (const token of row) {
              const style = theme.tokens[token.kind];
              this.drawShapes(token.text, x, baselines[r], size, variantOf(style), style.color);
              x += token.text.length * charWidth;
            }
          });
          // One span around all of a line's rows, so a wrapped line copies as one.
          // A blank row still gets two spaces: Chrome drops blank lines with less.
          this.drawWithCopyText(line.copy, () =>
            line.rows.forEach((row, r) =>
              this.drawInvisibleText(row.map((t) => t.text).join("") || "  ", codeX, baselines[r], size),
            ),
          );
        } else {
          // Courier fallback: the coloured text itself is what copies.
          const image = await this.lineNumber(line.no, theme.gutter.number);
          if (image) {
            const h = NUMBER_SIZE * 1.3;
            this.page.drawImage(image, { x: MARGIN + 3, y: rowY - h + NUMBER_SIZE, width: GUTTER - 8, height: h });
          }
          this.drawWithCopyText(line.copy, () =>
            line.rows.forEach((row, r) => {
              let x = codeX;
              if (!row.length) {
                this.page.drawText("  ", { x, y: baselines[r], size, font: this.fonts.code.regular, color: hex(theme.tokens.plain.color) });
              }
              for (const token of row) {
                const style = theme.tokens[token.kind];
                this.page.drawText(safe(token.text), { x, y: baselines[r], size, font: this.fonts.code[variantOf(style)], color: hex(style.color) });
                x += token.text.length * charWidth;
              }
            }),
          );
        }
        rowY -= line.rows.length * lineHeight;
      }
      this.y = bottom;
      index += chunk.length;
      first = false;
    }
  }

  async image(dataUrl: string, maxW = CONTENT_W, centered = false, maxH = PAGE[1] - MARGIN - BOTTOM) {
    const png = await this.pdf.embedPng(dataUrlToBytes(dataUrl));
    const scale = Math.min(1, maxW / png.width, maxH / png.height);
    const width = png.width * scale;
    const height = png.height * scale;
    this.ensure(height);
    this.y -= height;
    this.page.drawImage(png, { x: centered ? (PAGE[0] - width) / 2 : MARGIN, y: this.y, width, height });
    if (!centered) {
      this.page.drawRectangle({ x: MARGIN, y: this.y, width, height, borderColor: codeBorder, borderWidth: 0.6 });
    }
  }

  centered(content: string, font: PDFFont, size: number, color = ink) {
    const text = safe(content);
    this.y -= size * 1.5;
    this.page.drawText(text, { x: (PAGE[0] - font.widthOfTextAtSize(text, size)) / 2, y: this.y, size, font, color });
  }
}

/** Distance of the cover border from the page edge; the page number sits just below it. */
const BORDER_INSET = 46;

/**
 * Cover page: everything centred. The logo (or the university name without
 * one), the assignment and subject, then the student's details. The cover
 * style adds a border, capitals, a rule or a details table.
 */
async function drawCover(w: Writer, cover: CoverDetails) {
  const spec = coverSpec(cover);
  const title = coverTitle(cover);
  w.newPage();
  w.frame(spec.border);

  if (cover.logo) await w.image(cover.logo, 180, true, 165);
  if (!cover.logo || spec.universityLine) {
    if (cover.logo) w.y -= 8;
    if (cover.university) w.centered(cover.university.toUpperCase(), w.fonts.bold, 16);
    if (cover.campus) w.centered(cover.campus, w.fonts.bold, 12);
  }
  w.y -= 18;
  if (title.big) w.centered(title.big, w.fonts.bold, 22);
  if (title.small) w.centered(title.small, w.fonts.bold, 12);

  if (spec.divider) {
    w.y -= 26;
    w.page.drawLine({ start: { x: PAGE[0] / 2 - 80, y: w.y }, end: { x: PAGE[0] / 2 + 80, y: w.y }, thickness: 0.8, color: ink });
  }

  w.y = Math.min(w.y - (spec.divider ? 50 : 70), 470);
  const rows = coverRows(cover);
  if (spec.details === "table") {
    const size = 13;
    const left = PAGE[0] / 2 - 175;
    const right = PAGE[0] / 2 + 175;
    const valueX = PAGE[0] / 2 - 15;
    const rule = (y: number) => w.page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: muted });
    rule(w.y + size + 8);
    for (const [label, value] of rows) {
      w.page.drawText(safe(label), { x: left + 8, y: w.y, size, font: w.fonts.bold, color: ink });
      w.page.drawText(safe(value), { x: valueX, y: w.y, size, font: w.fonts.regular, color: ink });
      rule(w.y - 10);
      w.y -= size + 18;
    }
    return;
  }
  for (const [label, value] of rows) {
    const size = 19;
    const labelText = `${label}:`;
    const valueText = safe(value);
    // A fixed gap rather than a trailing space, whose width varies between PDF viewers.
    const labelWidth = w.fonts.bold.widthOfTextAtSize(labelText, size) + size * 0.3;
    const x = (PAGE[0] - labelWidth - w.fonts.regular.widthOfTextAtSize(valueText, size)) / 2;
    w.page.drawText(labelText, { x, y: w.y, size, font: w.fonts.bold, color: ink });
    w.page.drawText(valueText, { x: x + labelWidth, y: w.y, size, font: w.fonts.regular, color: ink });
    w.y -= 32;
  }
}

export async function buildPdf(doc: AssignmentDoc) {
  const pdf = await PDFDocument.create();
  pdf.setTitle([doc.cover.subject, doc.cover.assignment].filter(Boolean).join(" ") || "Assignment");
  pdf.setCreator("ZH Converter");

  const w = new Writer(pdf, {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    mono: await pdf.embedFont(StandardFonts.Courier),
    code: await codeFonts(pdf),
  });
  const theme = ideTheme(doc.ide);

  await drawCover(w, doc.cover);
  w.pageBorder = pageBorder(doc.cover);

  for (const question of doc.questions) {
    w.newPage();
    w.text(`Question ${question.number}`, { font: w.fonts.bold, size: 19, gap: 6 });
    if (question.statement.trim()) w.text(question.statement.trim(), { size: 11, color: muted, gap: 4 });

    w.y -= 10;
    w.text("Code", { font: w.fonts.bold, size: 12, color: accent, gap: 6 });
    // Each file sits under its own IDE tab, which carries its name.
    for (const file of question.files) {
      await w.code(file, theme);
      w.y -= 12;
    }

    if (question.output.status === "done") {
      w.y -= 6;
      w.ensure(80);
      w.text("Output", { font: w.fonts.bold, size: 12, color: accent, gap: 6 });
      await w.image(question.output.image);
    }

    // A rule across the page closes the question, like Word's "---" line.
    w.y -= 18;
    w.ensure(4);
    w.page.drawLine({ start: { x: MARGIN, y: w.y }, end: { x: MARGIN + CONTENT_W, y: w.y }, thickness: 0.8, color: ink });
  }

  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

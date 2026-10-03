import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { coverRows, expandTabs, type AssignmentDoc } from "./assignment";
import { dataUrlToBytes } from "./images";

const PAGE: [number, number] = [595.28, 841.89];
const MARGIN = 56;
const CONTENT_W = PAGE[0] - MARGIN * 2;
const BOTTOM = 60;

const CODE_SIZE = 8.5;
const CODE_LINE = 12;
const CODE_PAD = 10;
const GUTTER = 26;
/** Courier glyphs are exactly 0.6em wide. */
const CODE_CHARS = Math.floor((CONTENT_W - CODE_PAD * 2 - GUTTER) / (CODE_SIZE * 0.6));

const ink = rgb(0.14, 0.1, 0.12);
const muted = rgb(0.45, 0.4, 0.42);
const accent = rgb(0.71, 0.31, 0.17);
const navy = rgb(0.17, 0.3, 0.55);
const codeBg = rgb(0.98, 0.965, 0.953);
const codeBorder = rgb(0.9, 0.85, 0.82);
const gutterInk = rgb(0.66, 0.6, 0.62);

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
    public fonts: { regular: PDFFont; bold: PDFFont; mono: PDFFont },
  ) {}

  newPage(numbered = true) {
    this.page = this.pdf.addPage(PAGE);
    this.y = PAGE[1] - MARGIN;
    if (numbered) {
      this.pageNo++;
      const text = `Page ${this.pageNo}`;
      this.page.drawText(text, {
        x: PAGE[0] - MARGIN - this.fonts.regular.widthOfTextAtSize(text, 8.5),
        y: 30,
        size: 8.5,
        font: this.fonts.regular,
        color: gutterInk,
      });
    }
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

  /** Code is drawn row by row so a long file flows across pages naturally. */
  code(content: string) {
    const rows: { no: number | null; text: string }[] = [];
    content
      .replace(/\n+$/, "")
      .split("\n")
      .forEach((raw, i) => {
        const line = safe(expandTabs(raw));
        if (!line.length) rows.push({ no: i + 1, text: "" });
        for (let start = 0; start < line.length; start += CODE_CHARS) {
          rows.push({ no: start === 0 ? i + 1 : null, text: line.slice(start, start + CODE_CHARS) });
        }
      });

    let index = 0;
    while (index < rows.length) {
      this.ensure(CODE_LINE * 3 + CODE_PAD * 2);
      const fit = Math.floor((this.y - BOTTOM - CODE_PAD * 2) / CODE_LINE);
      const chunk = rows.slice(index, index + fit);
      const height = chunk.length * CODE_LINE + CODE_PAD * 2;
      this.page.drawRectangle({
        x: MARGIN,
        y: this.y - height,
        width: CONTENT_W,
        height,
        color: codeBg,
        borderColor: codeBorder,
        borderWidth: 0.6,
      });
      let rowY = this.y - CODE_PAD - CODE_LINE + 3;
      for (const row of chunk) {
        if (row.no !== null) {
          const no = String(row.no);
          this.page.drawText(no, {
            x: MARGIN + CODE_PAD + GUTTER - 8 - this.fonts.mono.widthOfTextAtSize(no, 7.5),
            y: rowY,
            size: 7.5,
            font: this.fonts.mono,
            color: gutterInk,
          });
        }
        if (row.text) {
          this.page.drawText(row.text, {
            x: MARGIN + CODE_PAD + GUTTER,
            y: rowY,
            size: CODE_SIZE,
            font: this.fonts.mono,
            color: ink,
          });
        }
        rowY -= CODE_LINE;
      }
      this.y -= height;
      index += chunk.length;
    }
  }

  async image(dataUrl: string, maxW = CONTENT_W, centered = false) {
    const png = await this.pdf.embedPng(dataUrlToBytes(dataUrl));
    const maxH = PAGE[1] - MARGIN - BOTTOM;
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

export async function buildPdf(doc: AssignmentDoc) {
  const pdf = await PDFDocument.create();
  pdf.setTitle([doc.cover.subject, doc.cover.assignment].filter(Boolean).join(" ") || "Assignment");
  pdf.setCreator("ZH Converter");

  const w = new Writer(pdf, {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    mono: await pdf.embedFont(StandardFonts.Courier),
  });

  // Cover page, laid out like the standard university title page.
  const { cover } = doc;
  w.newPage(false);
  w.y -= 10;
  if (cover.university) w.centered(cover.university.toUpperCase(), w.fonts.bold, 16, navy);
  if (cover.logo) {
    w.y -= 30;
    await w.image(cover.logo, 150, true);
  }
  w.y -= 30;
  for (const line of [cover.campus, cover.assignment, cover.subject]) {
    if (line) {
      w.centered(line.toUpperCase(), w.fonts.bold, 14);
      w.y -= 6;
    }
  }
  w.y = Math.min(w.y - 80, 330);
  for (const [label, value] of coverRows(cover)) {
    const labelText = `${label}: `;
    w.page.drawText(labelText, { x: MARGIN, y: w.y, size: 13, font: w.fonts.bold, color: ink });
    w.page.drawText(safe(value), {
      x: MARGIN + w.fonts.bold.widthOfTextAtSize(labelText, 13),
      y: w.y,
      size: 13,
      font: w.fonts.regular,
      color: ink,
    });
    w.y -= 30;
  }

  for (const question of doc.questions) {
    w.newPage();
    w.text(`Question ${question.number}`, { font: w.fonts.bold, size: 19, gap: 6 });
    if (question.statement.trim()) w.text(question.statement.trim(), { size: 11, color: muted, gap: 4 });

    w.y -= 10;
    w.text("Code", { font: w.fonts.bold, size: 12, color: accent, gap: 6 });
    for (const file of question.files) {
      if (question.files.length > 1) w.text(file.name, { font: w.fonts.mono, size: 9, color: muted, gap: 3 });
      w.code(file.content);
      w.y -= 10;
    }

    if (question.output.status === "done") {
      w.y -= 6;
      w.ensure(80);
      w.text("Output", { font: w.fonts.bold, size: 12, color: accent, gap: 6 });
      await w.image(question.output.image);
    }
  }

  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

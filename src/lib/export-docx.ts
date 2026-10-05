import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  LineRuleType,
  Packer,
  PageBorderDisplay,
  PageBorderOffsetFrom,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { coverRows, expandTabs, questionParts, type AssignmentDoc } from "./assignment";
import { coverSpec, coverTitle, pageBorder, type CoverSpec } from "./cover-styles";
import { highlight } from "./highlight";
import { ideTheme, type IdeTheme } from "./ide-themes";
import { dataUrlToBytes, imageSize } from "./images";
import type { Language } from "./types";

/** A4 with 1" margins leaves ~6.27" of width; at 96 dpi that's ~600px. */
const CONTENT_WIDTH_PX = 600;
const MAX_IMAGE_HEIGHT_PX = 820;
const CODE_FONT = "Consolas";
const TAB_FONT = "Segoe UI";

function fit(width: number, height: number, maxW: number, maxH: number) {
  const scale = Math.min(1, maxW / width, maxH / height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

async function imageParagraph(
  dataUrl: string,
  maxW: number,
  maxH: number,
  align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.CENTER,
) {
  const size = await imageSize(dataUrl);
  return new Paragraph({
    alignment: align,
    children: [
      new ImageRun({
        type: "png",
        data: dataUrlToBytes(dataUrl),
        transformation: fit(size.width, size.height, maxW, maxH),
      }),
    ],
  });
}

const COVER_FONT = "Arial";

/** Page number centred at the bottom of every page, the cover included. */
const pageFooter = () =>
  new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "9A8A8E" })],
      }),
    ],
  });

/** Page border for the cover, in Word's units (size in eighths of a point). */
function coverBorders(border: CoverSpec["border"]) {
  if (border === "none") return undefined;
  const side = {
    single: { style: BorderStyle.SINGLE, size: 12 },
    double: { style: BorderStyle.DOUBLE, size: 6 },
    thick: { style: BorderStyle.SINGLE, size: 30 },
  }[border];
  const edge = { ...side, color: "000000", space: 24 };
  return {
    pageBorders: { display: PageBorderDisplay.ALL_PAGES, offsetFrom: PageBorderOffsetFrom.PAGE },
    pageBorderTop: edge,
    pageBorderRight: edge,
    pageBorderBottom: edge,
    pageBorderLeft: edge,
  };
}

/**
 * Everything centred: the logo, the assignment and subject, then the
 * student's details. Without a logo, the university name takes its place.
 * The cover style adds a border, capitals, a rule or a details table.
 */
async function coverSection(doc: AssignmentDoc) {
  const { cover } = doc;
  const spec = coverSpec(cover);
  const title = coverTitle(cover);
  const center = (runs: TextRun[], before: number, after: number) =>
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before, after }, children: runs });
  const run = (text: string, size: number, bold = true) => new TextRun({ text, bold, size, font: COVER_FONT });

  const children: (Paragraph | Table)[] = [];
  if (cover.logo) children.push(await imageParagraph(cover.logo, 240, 220));
  if (!cover.logo || spec.universityLine) {
    if (cover.university) children.push(center([run(cover.university.toUpperCase(), 32)], cover.logo ? 160 : 0, 60));
    if (cover.campus) children.push(center([run(cover.campus, 24)], 0, 60));
  }
  if (title.big) children.push(center([run(title.big, 44)], 360, 40));
  if (title.small) children.push(center([run(title.small, 24)], title.big ? 0 : 360, 0));
  if (spec.divider) {
    children.push(
      new Paragraph({
        spacing: { before: 480 },
        indent: { left: 3200, right: 3200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: "000000", space: 1 } },
        children: [],
      }),
    );
  }

  const rows = coverRows(cover);
  const gap = spec.divider ? 1100 : 1700;
  if (spec.details === "table") {
    const line = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
    const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
    children.push(new Paragraph({ spacing: { before: gap }, children: [] }));
    children.push(
      new Table({
        alignment: AlignmentType.CENTER,
        width: { size: 78, type: WidthType.PERCENTAGE },
        borders: { top: line, bottom: line, left: none, right: none, insideHorizontal: line, insideVertical: none },
        rows: rows.map(
          ([label, value]) =>
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 45, type: WidthType.PERCENTAGE },
                  margins: { top: 100, bottom: 100, left: 120, right: 120 },
                  children: [new Paragraph({ children: [run(label, 26)] })],
                }),
                new TableCell({
                  width: { size: 55, type: WidthType.PERCENTAGE },
                  margins: { top: 100, bottom: 100, left: 120, right: 120 },
                  children: [new Paragraph({ children: [run(value, 26, false)] })],
                }),
              ],
            }),
        ),
      }),
    );
  } else {
    rows.forEach(([label, value], i) => {
      children.push(center([run(`${label}: `, 38), run(value, 38, false)], i === 0 ? gap : 0, 160));
    });
  }

  const borders = coverBorders(spec.border);
  return { properties: borders ? { page: { borders } } : {}, footers: { default: pageFooter() }, children };
}

/** A4 width minus the default 1" margins, in twips. */
const CONTENT_WIDTH_TWIPS = 11906 - 1440 * 2;
const NUMBERS_WIDTH_TWIPS = 620;
const CODE_PAD_TWIPS = 160;
/** Room for code on one line, in points. */
const CODE_TEXT_PT = (CONTENT_WIDTH_TWIPS - NUMBERS_WIDTH_TWIPS - CODE_PAD_TWIPS * 2 - 80) / 20;
/** Consolas glyphs are 0.55em wide. */
const CONSOLAS_EM = 0.55;

const fill = (color: string) => ({ type: ShadingType.CLEAR, fill: color, color: "auto" });
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };

/** The IDE's file tab (and NetBeans' Source/History strip) as rows across the top of the code table. */
function codeHeaderRows(fileName: string, theme: IdeTheme) {
  const bar = theme.tabBar;
  const tabBorder = bar.border ? { style: BorderStyle.SINGLE, size: 4, color: bar.border, space: 0 } : undefined;
  const rows = [
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 2,
          shading: fill(bar.background),
          margins: { top: 40, bottom: 0, left: 0, right: 0 },
          children: [
            new Paragraph({
              spacing: { after: 0 },
              children: [
                new TextRun({
                  text: `   ${fileName}    ×   `,
                  font: TAB_FONT,
                  size: 16,
                  bold: bar.bold,
                  color: bar.text,
                  shading: fill(bar.tab),
                  border: tabBorder,
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  ];
  if (theme.toolbar) {
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            shading: fill(theme.toolbar.background),
            margins: { top: 30, bottom: 30, left: 60, right: 0 },
            children: [
              new Paragraph({
                spacing: { after: 0 },
                children: [
                  new TextRun({
                    text: " Source ",
                    font: TAB_FONT,
                    size: 14,
                    color: theme.toolbar.text,
                    shading: fill("FFFFFF"),
                    border: { style: BorderStyle.SINGLE, size: 4, color: "C0C0C0", space: 0 },
                  }),
                  new TextRun({ text: "   History", font: TAB_FONT, size: 14, color: theme.toolbar.text }),
                ],
              }),
            ],
          }),
        ],
      }),
    );
  }
  return rows;
}

/**
 * The code drawn the way the chosen IDE shows it: its file tab, gutter,
 * background and syntax colours. The code sits in one table cell and the
 * line numbers in a narrow cell beside it, so selecting the code copies only
 * the code, indentation intact. Long files shrink the font (9pt down to 7pt)
 * so lines don't wrap; a line that still wraps gets blank rows beside it to
 * keep the numbers in line.
 */
function codeBlock(file: { name: string; content: string; language: Language }, theme: IdeTheme) {
  const lines = file.content
    .replace(/\r\n?/g, "\n")
    .replace(/\n+$/, "")
    .split("\n")
    .map((line) => expandTabs(line).replace(/\s+$/, ""));
  const tokens = highlight(lines.join("\n"), file.language);
  const longest = Math.max(1, ...lines.map((line) => line.length));
  // Font size in half-points, in whole half-point steps between 7pt and 9pt.
  const size = Math.max(14, Math.min(18, Math.floor((CODE_TEXT_PT / (CONSOLAS_EM * longest)) * 2)));
  const perLine = Math.floor(CODE_TEXT_PT / (CONSOLAS_EM * (size / 2)));
  // Exact spacing on both cells keeps every number level with its line.
  const spacing = { after: 0, line: Math.round((size / 2) * 1.35 * 20), lineRule: LineRuleType.EXACT };

  const numbers: Paragraph[] = [];
  lines.forEach((line, i) => {
    numbers.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing,
        children: [new TextRun({ text: String(i + 1), font: CODE_FONT, size: size - 2, color: theme.gutter.number })],
      }),
    );
    for (let extra = 1; extra < Math.ceil(line.length / perLine); extra++) numbers.push(new Paragraph({ spacing, children: [] }));
  });

  const code = lines.map(
    (_, i) =>
      new Paragraph({
        spacing,
        children: (tokens[i] ?? []).map((token) => {
          const style = theme.tokens[token.kind];
          return new TextRun({ text: token.text, font: CODE_FONT, size, color: style.color, bold: style.bold, italics: style.italic });
        }),
      }),
  );

  const edge = { style: BorderStyle.SINGLE, size: 4, color: theme.gutter.border ?? "3C3C3C" };
  const gutterEdge = theme.gutter.border ? { style: BorderStyle.SINGLE, size: 4, color: theme.gutter.border } : NO_BORDER;
  return new Table({
    width: { size: CONTENT_WIDTH_TWIPS, type: WidthType.DXA },
    columnWidths: [NUMBERS_WIDTH_TWIPS, CONTENT_WIDTH_TWIPS - NUMBERS_WIDTH_TWIPS],
    borders: { top: edge, bottom: edge, left: edge, right: edge, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
    rows: [
      ...codeHeaderRows(file.name, theme),
      new TableRow({
        children: [
          new TableCell({
            width: { size: NUMBERS_WIDTH_TWIPS, type: WidthType.DXA },
            shading: fill(theme.gutter.background),
            borders: { right: gutterEdge },
            margins: { top: 120, bottom: 120, left: 60, right: 120 },
            children: numbers,
          }),
          new TableCell({
            width: { size: CONTENT_WIDTH_TWIPS - NUMBERS_WIDTH_TWIPS, type: WidthType.DXA },
            shading: fill(theme.background),
            margins: { top: 120, bottom: 120, left: CODE_PAD_TWIPS, right: CODE_PAD_TWIPS },
            children: code,
          }),
        ],
      }),
    ],
  });
}

function label(text: string) {
  return new Paragraph({
    spacing: { before: 280, after: 100 },
    children: [new TextRun({ text, bold: true, size: 24, color: "B4502C" })],
  });
}

async function questionsSection(doc: AssignmentDoc) {
  const children: (Paragraph | Table)[] = [];
  const theme = ideTheme(doc.ide);

  for (const [index, question] of doc.questions.entries()) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: index > 0,
        spacing: { after: 160 },
        children: [new TextRun({ text: `Question ${question.number}`, bold: true, size: 34, color: "241A1E" })],
      }),
    );
    if (question.statement.trim()) {
      for (const line of question.statement.trim().split("\n")) {
        children.push(new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: line, size: 23 })] }));
      }
    }

    // Each part: its code, its output, then a rule across the page like
    // Word's "---" line. Each file sits under its own IDE tab, which carries its name.
    for (const part of questionParts(question)) {
      children.push(label("Code"));
      part.files.forEach((file, i) => {
        if (i > 0) children.push(new Paragraph({ spacing: { after: 0 }, children: [] }));
        children.push(codeBlock(file, theme));
      });

      if (part.output) {
        children.push(label("Output"));
        children.push(await imageParagraph(part.output.image, CONTENT_WIDTH_PX, MAX_IMAGE_HEIGHT_PX, AlignmentType.LEFT));
      }

      children.push(
        new Paragraph({
          spacing: { before: 240, after: 120 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 1 } },
          children: [],
        }),
      );
    }
  }

  // Numbering continues from the cover, which is page 1.
  const borders = coverBorders(pageBorder(doc.cover));
  return { properties: borders ? { page: { borders } } : {}, footers: { default: pageFooter() }, children };
}

export async function buildDocx(doc: AssignmentDoc) {
  const document = new Document({
    creator: "ZH Converter",
    title: [doc.cover.subject, doc.cover.assignment].filter(Boolean).join(" ") || "Assignment",
    styles: { default: { document: { run: { font: "Calibri" } } } },
    sections: [await coverSection(doc), await questionsSection(doc)],
  });
  return Packer.toBlob(document);
}

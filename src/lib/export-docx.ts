import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { coverRows, expandTabs, type AssignmentDoc } from "./assignment";
import { dataUrlToBytes, imageSize } from "./images";

/** A4 with 1" margins leaves ~6.27" of width; at 96 dpi that's ~600px. */
const CONTENT_WIDTH_PX = 600;
const MAX_IMAGE_HEIGHT_PX = 820;
const CODE_FONT = "Consolas";

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

async function coverSection(doc: AssignmentDoc) {
  const { cover } = doc;
  const center = (text: string, size: number, color = "000000", before = 120) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before, after: 60 },
      children: [new TextRun({ text, bold: true, size, color })],
    });

  const children: Paragraph[] = [];
  if (cover.university) children.push(center(cover.university.toUpperCase(), 30, "2B4C8C", 0));
  if (cover.logo) {
    children.push(new Paragraph({ spacing: { before: 240 }, children: [] }));
    children.push(await imageParagraph(cover.logo, 200, 200));
  }
  children.push(new Paragraph({ spacing: { before: 360 }, children: [] }));
  for (const line of [cover.campus, cover.assignment, cover.subject]) {
    if (line) children.push(center(line.toUpperCase(), 28));
  }
  children.push(new Paragraph({ spacing: { before: 1400 }, children: [] }));
  for (const [label, value] of coverRows(cover)) {
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({ text: `${label}: `, bold: true, size: 26 }),
          new TextRun({ text: value, size: 26 }),
        ],
      }),
    );
  }
  return { properties: {}, children };
}

function codeBlock(content: string) {
  const lines = content.replace(/\n+$/, "").split("\n");
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "E6D8D0" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "E6D8D0" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "E6D8D0" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "E6D8D0" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: "FAF6F3", color: "auto" },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: lines.map(
              (line, i) =>
                new Paragraph({
                  spacing: { after: 0, line: 260 },
                  children: [
                    new TextRun({ text: `${String(i + 1).padStart(3, " ")}  `, font: CODE_FONT, size: 17, color: "A89A9E" }),
                    new TextRun({ text: expandTabs(line), font: CODE_FONT, size: 18 }),
                  ],
                }),
            ),
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

    children.push(label("Code"));
    for (const file of question.files) {
      if (question.files.length > 1) {
        children.push(
          new Paragraph({
            spacing: { before: 160, after: 80 },
            children: [new TextRun({ text: file.name, font: CODE_FONT, size: 19, bold: true, color: "74656A" })],
          }),
        );
      }
      children.push(codeBlock(file.content));
    }

    if (question.output.status === "done") {
      children.push(label("Output"));
      children.push(await imageParagraph(question.output.image, CONTENT_WIDTH_PX, MAX_IMAGE_HEIGHT_PX, AlignmentType.LEFT));
    }
  }

  return {
    // Numbering restarts after the cover, so the first question is page 1.
    properties: { page: { pageNumbers: { start: 1 } } },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ children: ["Page ", PageNumber.CURRENT], size: 18, color: "9A8A8E" })],
          }),
        ],
      }),
    },
    children,
  };
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

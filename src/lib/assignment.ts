import { coverSpec } from "./cover-styles";
import type { IdeStyle } from "./ide-themes";
import type { CodeFile, CoverDetails, OutputState } from "./types";

/** Everything an exporter needs, already grouped and ordered. */
export type AssignmentDoc = {
  cover: CoverDetails;
  /** Which IDE the code is drawn like. */
  ide: IdeStyle;
  questions: {
    number: number;
    statement: string;
    files: CodeFile[];
    output: OutputState;
  }[];
};

type Shot = { image: string; width: number; height: number };

/**
 * A question laid out as parts: each part's code, then its output. Usually
 * one part with every file. A question with several separate programs (part
 * A, part B…) gets one per program, so each output sits under its own code.
 */
export function questionParts(question: AssignmentDoc["questions"][number]): { files: CodeFile[]; output: Shot | null }[] {
  const { output, files } = question;
  if (output.status !== "done") return [{ files, output: null }];
  if (!output.parts?.length) return [{ files, output }];

  const parts = output.parts.map((part) => ({
    files: files.filter((f) => part.files.includes(f.name)),
    output: { image: part.image, width: part.width, height: part.height },
  }));
  // Files no program used (notes, a stray stylesheet) go with the first part.
  const placed = new Set(parts.flatMap((p) => p.files));
  parts[0].files.push(...files.filter((f) => !placed.has(f)));
  return parts;
}

export function assignmentFilename(cover: CoverDetails, ext: "docx" | "pdf") {
  const base = [cover.subject, cover.assignment, cover.regNo]
    .filter(Boolean)
    .join(" ")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `${base || "assignment"}.${ext}`;
}

/** The student's details as [label, value], labelled the way the cover style labels them. */
export function coverRows(cover: CoverDetails): [string, string][] {
  const { labels } = coverSpec(cover);
  return (
    [
      [labels.name, cover.name],
      [labels.regNo, cover.regNo],
      [labels.section, cover.section],
      [labels.instructor, cover.instructor],
      [labels.date, cover.date],
    ] as [string, string][]
  ).filter(([, value]) => value.trim());
}

export function expandTabs(line: string) {
  return line.replace(/\t/g, "    ");
}

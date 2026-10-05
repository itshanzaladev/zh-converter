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

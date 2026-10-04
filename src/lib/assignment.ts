import type { CodeFile, CoverDetails, OutputState } from "./types";

/** Everything an exporter needs, already grouped and ordered. */
export type AssignmentDoc = {
  cover: CoverDetails;
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

export function coverRows(cover: CoverDetails): [string, string][] {
  return (
    [
      ["Name", cover.name],
      ["Registration No", cover.regNo],
      ["Section", cover.section],
      ["Submitted To", cover.instructor],
      ["Date", cover.date],
    ] as [string, string][]
  ).filter(([, value]) => value.trim());
}

export function expandTabs(line: string) {
  return line.replace(/\t/g, "    ");
}

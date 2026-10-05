import type { CoverDetails, CoverStyle } from "./types";

/**
 * How each cover style differs from the plain centred title page. The Word
 * and PDF exporters and the on-screen preview all read this, so they match.
 */
export type CoverSpec = {
  name: string;
  note: string;
  /** Border around the whole cover page. */
  border: "none" | "single" | "double" | "thick";
  /** University name (and campus) under the logo even when there is a logo. */
  universityLine: boolean;
  /** Assignment and subject in capitals. */
  upperTitle: boolean;
  /** Subject as the big heading, assignment under it. */
  subjectFirst: boolean;
  /** A short rule between the title and the student's details. */
  divider: boolean;
  /** Details as centred "Label: value" lines, or a two-column table. */
  details: "centered" | "table";
  labels: { name: string; regNo: string; section: string; instructor: string; date: string };
};

const PLAIN_LABELS = {
  name: "Name",
  regNo: "Registration No",
  section: "Section",
  instructor: "Submitted To",
  date: "Date",
};

export const COVER_STYLES: Record<CoverStyle, CoverSpec> = {
  classic: {
    name: "Classic",
    note: "Clean and centred",
    border: "none",
    universityLine: false,
    upperTitle: false,
    subjectFirst: false,
    divider: false,
    details: "centered",
    labels: PLAIN_LABELS,
  },
  bordered: {
    name: "Bordered",
    note: "A thin page border",
    border: "single",
    universityLine: true,
    upperTitle: false,
    subjectFirst: false,
    divider: false,
    details: "centered",
    labels: PLAIN_LABELS,
  },
  framed: {
    name: "Framed",
    note: "Double border, capitals",
    border: "double",
    universityLine: true,
    upperTitle: true,
    subjectFirst: false,
    divider: true,
    details: "centered",
    labels: PLAIN_LABELS,
  },
  formal: {
    name: "Formal",
    note: "Thick border, details table",
    border: "thick",
    universityLine: true,
    upperTitle: true,
    subjectFirst: true,
    divider: true,
    details: "table",
    labels: {
      name: "Submitted By",
      regNo: "Registration No",
      section: "Class / Section",
      instructor: "Submitted To",
      date: "Submission Date",
    },
  },
};

export function coverSpec(cover: Pick<CoverDetails, "style">) {
  return COVER_STYLES[cover.style] ?? COVER_STYLES.classic;
}

/** The border for the pages after the cover: the cover style's own, or a thin one if it has none. */
export function pageBorder(cover: Pick<CoverDetails, "style" | "pageBorder">): CoverSpec["border"] {
  if (!cover.pageBorder) return "none";
  const { border } = coverSpec(cover);
  return border === "none" ? "single" : border;
}

/** The two title lines, biggest first, in the style's case. */
export function coverTitle(cover: CoverDetails) {
  const spec = coverSpec(cover);
  const [big, small] = spec.subjectFirst ? [cover.subject, cover.assignment] : [cover.assignment, cover.subject];
  const upper = (text: string) => (spec.upperTitle ? text.toUpperCase() : text);
  return { big: upper(big), small: upper(small) };
}

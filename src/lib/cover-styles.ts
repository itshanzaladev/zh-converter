import type { CoverDetails, CoverStyle } from "./types";

/**
 * How each cover style differs from the plain centred title page. The Word
 * and PDF exporters and the on-screen preview all read this, so they match.
 */
export type CoverSpec = {
  name: string;
  note: string;
  /** Typeface: Arial/Helvetica, Times New Roman/Times, or Courier (typewriter). */
  font: "sans" | "serif" | "mono";
  /** Colour of the title, the rule and the border (hex without "#"). */
  accent: string;
  /** Border around the whole cover page. */
  border: "none" | "single" | "double" | "thick" | "dashed";
  /** University name (and campus) under the logo even when there is a logo. */
  universityLine: boolean;
  /** Assignment and subject in capitals. */
  upperTitle: boolean;
  /** Subject as the big heading, assignment under it. */
  subjectFirst: boolean;
  /** A short rule between the title and the student's details. */
  divider: boolean;
  /**
   * The student's details: centred "Label: value" lines, a two-column table
   * with rules between rows, or two aligned columns without rules.
   */
  details: "centered" | "table" | "aligned";
  labels: { name: string; regNo: string; section: string; instructor: string; date: string };
};

const PLAIN_LABELS = {
  name: "Name",
  regNo: "Registration No",
  section: "Section",
  instructor: "Submitted To",
  date: "Date",
};

const FORMAL_LABELS = {
  name: "Submitted By",
  regNo: "Registration No",
  section: "Class / Section",
  instructor: "Submitted To",
  date: "Submission Date",
};

const BLACK = "000000";
const NAVY = "1F3864";
const MAROON = "7B1E1E";
const TEAL = "0F6E66";
const GREEN = "1E5631";

/** The plain centred page; each style changes only what makes it different. */
const base: Omit<CoverSpec, "name" | "note"> = {
  font: "sans",
  accent: BLACK,
  border: "none",
  universityLine: false,
  upperTitle: false,
  subjectFirst: false,
  divider: false,
  details: "centered",
  labels: PLAIN_LABELS,
};

/** The first four are shown up front; the rest open under the arrow. */
export const COVER_STYLES: Record<CoverStyle, CoverSpec> = {
  classic: { ...base, name: "Classic", note: "Clean and centred" },
  bordered: { ...base, name: "Bordered", note: "A thin page border", border: "single", universityLine: true },
  framed: {
    ...base,
    name: "Framed",
    note: "Double border, capitals",
    border: "double",
    universityLine: true,
    upperTitle: true,
    divider: true,
  },
  formal: {
    ...base,
    name: "Formal",
    note: "Thick border, details table",
    border: "thick",
    universityLine: true,
    upperTitle: true,
    subjectFirst: true,
    divider: true,
    details: "table",
    labels: FORMAL_LABELS,
  },
  times: { ...base, name: "Times Classic", note: "Times New Roman, no border", font: "serif", universityLine: true },
  royal: {
    ...base,
    name: "Royal Navy",
    note: "Navy double border, serif",
    font: "serif",
    accent: NAVY,
    border: "double",
    universityLine: true,
    upperTitle: true,
    divider: true,
  },
  maroon: {
    ...base,
    name: "Maroon",
    note: "Maroon frame, details table",
    font: "serif",
    accent: MAROON,
    border: "thick",
    universityLine: true,
    upperTitle: true,
    divider: true,
    details: "table",
    labels: FORMAL_LABELS,
  },
  minimal: {
    ...base,
    name: "Minimal",
    note: "No border, aligned details",
    divider: true,
    details: "aligned",
  },
  dashed: {
    ...base,
    name: "Dashed",
    note: "Dashed page border",
    border: "dashed",
    universityLine: true,
    divider: true,
  },
  typewriter: {
    ...base,
    name: "Typewriter",
    note: "Courier font, thin border",
    font: "mono",
    border: "single",
    universityLine: true,
    upperTitle: true,
    details: "aligned",
  },
  executive: {
    ...base,
    name: "Executive",
    note: "Navy, serif, aligned details",
    font: "serif",
    accent: NAVY,
    border: "single",
    universityLine: true,
    subjectFirst: true,
    divider: true,
    details: "aligned",
    labels: FORMAL_LABELS,
  },
  teal: {
    ...base,
    name: "Teal",
    note: "Teal border and title",
    accent: TEAL,
    border: "single",
    universityLine: true,
    upperTitle: true,
    divider: true,
    details: "table",
  },
  elegant: {
    ...base,
    name: "Elegant",
    note: "Serif, subject first, double border",
    font: "serif",
    border: "double",
    universityLine: true,
    subjectFirst: true,
    divider: true,
  },
  forest: {
    ...base,
    name: "Forest",
    note: "Green thick border, capitals",
    accent: GREEN,
    border: "thick",
    universityLine: true,
    upperTitle: true,
    subjectFirst: true,
    details: "table",
    labels: FORMAL_LABELS,
  },
};

/** How many styles show before the arrow. */
export const FEATURED_STYLES = 4;

export function coverSpec(cover: Pick<CoverDetails, "style">) {
  return COVER_STYLES[cover.style] ?? COVER_STYLES.classic;
}

/** The border for the pages after the cover: the cover style's own, or a thin one if it has none. */
export function pageBorder(cover: Pick<CoverDetails, "style" | "pageBorder">): { border: CoverSpec["border"]; color: string } {
  const spec = coverSpec(cover);
  if (!cover.pageBorder) return { border: "none", color: spec.accent };
  return { border: spec.border === "none" ? "single" : spec.border, color: spec.accent };
}

/** The two title lines, biggest first, in the style's case. */
export function coverTitle(cover: CoverDetails) {
  const spec = coverSpec(cover);
  const [big, small] = spec.subjectFirst ? [cover.subject, cover.assignment] : [cover.assignment, cover.subject];
  const upper = (text: string) => (spec.upperTitle ? text.toUpperCase() : text);
  return { big: upper(big), small: upper(small) };
}

/** Font names for each typeface in Word and on screen. */
export const COVER_FONTS = {
  sans: { word: "Arial", css: "Arial, Helvetica, sans-serif" },
  serif: { word: "Times New Roman", css: '"Times New Roman", Times, serif' },
  mono: { word: "Courier New", css: '"Courier New", Courier, monospace' },
};

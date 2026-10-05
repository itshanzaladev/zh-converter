export type Language =
  | "html"
  | "css"
  | "js"
  | "python"
  | "c"
  | "cpp"
  | "java"
  | "csharp"
  | "dart"
  | "kotlin"
  | "php"
  | "go"
  | "typescript"
  | "ruby"
  | "rust"
  | "swift"
  | "r"
  | "sql"
  | "bash"
  | "octave"
  | "vb"
  | "haskell";

export type CodeFile = {
  id: string;
  name: string;
  content: string;
  language: Language;
  /** null until the student places it in a question. */
  question: number | null;
  /** A number guessed from a loose filename (e.g. "2.html"), shown as a suggestion. */
  suggested: number | null;
};

export type OutputState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; image: string; width: number; height: number; source: "auto" | "upload" }
  | { status: "error"; message: string };

export type Question = {
  number: number;
  statement: string;
  stdin: string;
  /** True while `stdin` is the sample input ZH Converter filled in, not the student's own. */
  stdinIsSample?: boolean;
  output: OutputState;
};

export type CoverStyle = "classic" | "bordered" | "framed" | "formal";

export type CoverDetails = {
  style: CoverStyle;
  /** Repeat the cover style's border (or a thin one) on every page after the cover. */
  pageBorder: boolean;
  university: string;
  campus: string;
  assignment: string;
  subject: string;
  name: string;
  regNo: string;
  section: string;
  instructor: string;
  date: string;
  /** Data URL of the uploaded university logo. */
  logo: string | null;
};

export const EMPTY_COVER: CoverDetails = {
  style: "classic",
  pageBorder: false,
  university: "",
  campus: "",
  assignment: "",
  subject: "",
  name: "",
  regNo: "",
  section: "",
  instructor: "",
  date: "",
  logo: null,
};

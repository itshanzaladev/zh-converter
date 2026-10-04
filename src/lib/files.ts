import type { CodeFile, Language } from "./types";

const EXTENSIONS: Record<string, Language> = {
  html: "html",
  htm: "html",
  css: "css",
  js: "js",
  mjs: "js",
  py: "python",
  c: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  h: "c",
  hpp: "cpp",
  java: "java",
  cs: "csharp",
  dart: "dart",
  kt: "kotlin",
  php: "php",
  go: "go",
  ts: "typescript",
  rb: "ruby",
  rs: "rust",
  swift: "swift",
  r: "r",
  sql: "sql",
  sh: "bash",
  m: "octave",
  vb: "vb",
  hs: "haskell",
};

export const ACCEPT = Object.keys(EXTENSIONS)
  .map((ext) => `.${ext}`)
  .join(",");

export const LANGUAGE_LABEL: Record<Language, string> = {
  html: "HTML",
  css: "CSS",
  js: "JavaScript",
  python: "Python",
  c: "C",
  cpp: "C++",
  java: "Java",
  csharp: "C#",
  dart: "Dart",
  kotlin: "Kotlin",
  php: "PHP",
  go: "Go",
  typescript: "TypeScript",
  ruby: "Ruby",
  rust: "Rust",
  swift: "Swift",
  r: "R",
  sql: "SQL",
  bash: "Bash",
  octave: "MATLAB / Octave",
  vb: "VB.NET",
  haskell: "Haskell",
};

export const MAX_FILE_BYTES = 512 * 1024;

export function languageOf(filename: string): Language | null {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSIONS[ext] ?? null;
}

/** Words that introduce a question number in a filename. */
const QUESTION_PATTERN =
  /(?:^|[^a-z])(?:question|ques|qno|qn|q|task|problem|prob|exercise|ex)[\s_.#-]*(?:no[\s_.#-]*)?0*(\d{1,3})(?!\d)/gi;

/**
 * Reads a question number from a filename.
 * "q1.html", "Question_2.css", "task3.py" are certain and get placed directly.
 * "2.html" or "lab_2.js" only produce a suggestion the student confirms.
 */
export function detectQuestion(filename: string): { certain: number | null; suggested: number | null } {
  const stem = filename
    .replace(/\.[^.]+$/, "")
    .replace(/([a-z])([A-Z])/g, "$1_$2");

  const explicit = new Set<number>();
  for (const match of stem.matchAll(QUESTION_PATTERN)) {
    const value = Number(match[1]);
    if (value > 0) explicit.add(value);
  }
  if (explicit.size === 1) return { certain: [...explicit][0], suggested: null };
  if (explicit.size > 1) return { certain: null, suggested: null };

  const numbers = stem.match(/\d+/g) ?? [];
  if (numbers.length === 1 && Number(numbers[0]) > 0) {
    return { certain: null, suggested: Number(numbers[0]) };
  }
  return { certain: null, suggested: null };
}

export async function readCodeFile(file: File): Promise<CodeFile> {
  const language = languageOf(file.name);
  if (!language) {
    throw new Error(
      `${file.name} isn't a code file ZH Converter can read. Supported: ${[...new Set(Object.values(LANGUAGE_LABEL))].join(", ")}.`,
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`${file.name} is larger than 512 KB. Split it or remove generated code.`);
  }
  const { certain, suggested } = detectQuestion(file.name);
  return {
    id: crypto.randomUUID(),
    name: file.name,
    content: (await file.text()).replace(/\r\n?/g, "\n"),
    language,
    question: certain,
    suggested,
  };
}

/** HTML first, then CSS, then JS, then everything else, alphabetically within each. */
export function sortFiles(files: CodeFile[]) {
  // The order LANGUAGE_LABEL lists them in: HTML, CSS, JS first.
  const order = Object.keys(LANGUAGE_LABEL) as Language[];
  return [...files].sort(
    (a, b) => order.indexOf(a.language) - order.indexOf(b.language) || a.name.localeCompare(b.name),
  );
}

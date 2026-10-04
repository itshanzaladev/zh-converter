import type { CodeFile, Language } from "./types";

/** Languages that are compiled or run on the code runner and shown as a terminal. */
export type ConsoleLanguage = Exclude<Language, "html" | "css">;

export type SourceFile = { name: string; content: string };

/** One program to run: the file with its entry point, plus the files it uses. */
export type Program = {
  language: ConsoleLanguage;
  entry: SourceFile;
  files: SourceFile[];
};

export type OutputPlan =
  | { kind: "web" }
  /** `assets` are stylesheets and scripts a PHP page links to, used when its output is HTML. */
  | { kind: "console"; programs: Program[]; assets: CodeFile[] }
  | { kind: "none"; reason: "flutter" | "empty" };

type Rules = {
  /** Code that marks the file a program starts from. Scripts have none: any file nothing else imports is a program. */
  entry?: RegExp;
  /** Code that reads from the keyboard. */
  reads: RegExp;
  /** How comments start, so commented-out code is ignored. */
  comments: "c" | "hash" | "sql" | "haskell" | "matlab" | "vb";
};

const RULES: Record<ConsoleLanguage, Rules> = {
  c: { entry: /\bmain\s*\(/, reads: /\b(?:scanf|gets|getchar)\s*\(|\bfgets\s*\([^)]*stdin/, comments: "c" },
  cpp: {
    entry: /\bmain\s*\(/,
    reads: /\bcin\s*>>|\bgetline\s*\(\s*(?:std::)?cin|\b(?:scanf|gets|getchar)\s*\(/,
    comments: "c",
  },
  java: { entry: /\bstatic\s+(?:final\s+)?void\s+main\s*\(/, reads: /System\.in\b/, comments: "c" },
  csharp: {
    entry: /\bstatic\s+(?:async\s+)?(?:void|int|Task(?:<int>)?)\s+Main\s*\(/,
    reads: /Console\.Read(?:Line)?\s*\(/,
    comments: "c",
  },
  dart: { entry: /(?:^|\s)(?:void\s+|Future<void>\s+)?main\s*\(/m, reads: /stdin\.read/, comments: "c" },
  kotlin: { entry: /\bfun\s+main\s*\(/, reads: /\breadLine\s*\(|\breadln\s*\(|Scanner\s*\(\s*System\.`?in/, comments: "c" },
  go: { entry: /\bfunc\s+main\s*\(/, reads: /fmt\.Scan|fmt\.Fscan|os\.Stdin/, comments: "c" },
  rust: { entry: /\bfn\s+main\s*\(/, reads: /stdin\s*\(/, comments: "c" },
  vb: { entry: /\bSub\s+Main\s*\(/i, reads: /Console\.Read(?:Line)?\s*\(/i, comments: "vb" },
  haskell: { entry: /^main\s*(?:::|=)/m, reads: /\b(?:getLine|readLn|getContents|interact)\b/, comments: "haskell" },
  python: { reads: /\binput\s*\(|sys\.stdin/, comments: "hash" },
  js: { reads: /process\.stdin|require\(\s*["'](?:node:)?readline|prompt-sync/, comments: "c" },
  typescript: { reads: /process\.stdin|["'](?:node:)?readline["']|prompt-sync/, comments: "c" },
  php: { reads: /\bSTDIN\b|\breadline\s*\(|php:\/\/stdin/, comments: "c" },
  ruby: { reads: /\bgets\b|\bSTDIN\b|\$stdin/, comments: "hash" },
  swift: { reads: /\breadLine\s*\(/, comments: "c" },
  r: { reads: /\breadline\s*\(|\breadLines\s*\(|\bscan\s*\(/, comments: "hash" },
  sql: { reads: /$^/, comments: "sql" },
  bash: { reads: /^\s*read\b|[;&|]\s*read\b/m, comments: "hash" },
  octave: { reads: /\binput\s*\(|\bkeyboard\b/, comments: "matlab" },
};

function stem(name: string) {
  return name.replace(/\.[^.]+$/, "");
}

/** Comments are dropped so a commented-out main() or input() isn't mistaken for real code. */
export function codeOnly(content: string, language: ConsoleLanguage) {
  switch (RULES[language].comments) {
    case "hash":
      return content.replace(/(^|\s)#.*$/gm, "$1");
    case "sql":
      return content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--.*$/gm, "");
    case "haskell":
      return content.replace(/\{-[\s\S]*?-\}/g, "").replace(/--.*$/gm, "");
    case "matlab":
      return content.replace(/(^|\s)[%#].*$/gm, "$1");
    case "vb":
      return content.replace(/'.*$/gm, "");
    default: {
      const code = content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'])\/\/.*$/gm, "$1");
      // PHP also allows # comments; "#include" and "#define" must survive for C.
      return language === "php" ? code.replace(/(^|\s)#(?!\[).*$/gm, "$1") : code;
    }
  }
}

/** A script that another file in the question imports or includes is a module, not a program. */
function isImported(file: SourceFile, others: SourceFile[]) {
  const name = stem(file.name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?:import|require|include|source|from|load|run)\\b.*\\b${name}\\b`);
  return others.some((other) => other !== file && other.content.split("\n").some((line) => pattern.test(line)));
}

function toSource(file: CodeFile): SourceFile {
  return { name: file.name, content: file.content };
}

export function isFlutter(files: CodeFile[]) {
  return files.some((f) => f.language === "dart" && /package:flutter\//.test(f.content));
}

/**
 * Works out how a question's output is produced.
 * Pages (any HTML or CSS, unless there's PHP) are screenshotted; everything
 * else is split into programs, one per entry point, and run on the code runner.
 */
export function planOutput(files: CodeFile[]): OutputPlan {
  const hasPhp = files.some((f) => f.language === "php");
  if (!hasPhp && files.some((f) => f.language === "html" || f.language === "css")) return { kind: "web" };
  if (isFlutter(files)) return { kind: "none", reason: "flutter" };

  // A PHP page's stylesheets and scripts aren't programs; they style its output.
  const assets = hasPhp ? files.filter((f) => ["html", "css", "js"].includes(f.language)) : [];
  const hasCpp = files.some((f) => f.language === "cpp");
  const groups = new Map<ConsoleLanguage, CodeFile[]>();
  for (const file of files) {
    if (file.language === "html" || file.language === "css" || assets.includes(file)) continue;
    // Headers (.h) are read as C; they belong with the C++ files when there are any.
    const language: ConsoleLanguage = file.language === "c" && hasCpp ? "cpp" : file.language;
    groups.set(language, [...(groups.get(language) ?? []), file]);
  }

  const programs: Program[] = [];
  for (const [language, group] of groups) {
    const sources = group.map(toSource);
    const { entry: entryPattern } = RULES[language];
    let entries = entryPattern
      ? sources.filter((s) => entryPattern.test(codeOnly(s.content, language)))
      : sources.filter((s) => !isImported(s, sources));
    // No recognisable entry: run the first file so the student sees the real compiler error.
    if (!entries.length) entries = sources.filter((s) => !/\.h(pp)?$/i.test(s.name)).slice(0, 1);
    for (const entry of entries) {
      programs.push({
        language,
        entry,
        // Other entry points stay out, or the compiler sees two main() functions.
        files: sources.filter((s) => s !== entry && !entries.includes(s)),
      });
    }
  }
  return programs.length ? { kind: "console", programs, assets } : { kind: "none", reason: "empty" };
}

export function readsInput(programs: Program[]) {
  return programs.some((p) =>
    [p.entry, ...p.files].some((f) => RULES[p.language].reads.test(codeOnly(f.content, p.language))),
  );
}

/* ------------------------------------------------------------------------- */
/* Sample input                                                               */
/* ------------------------------------------------------------------------- */

type Kind = "int" | "float" | "word" | "line" | "char";

/** One read in the code: where it is, what it reads, and words (variable name, prompt) hinting at a good value. */
type Read = { at: number; kinds: Kind[]; hint: string };

const INTS = [5, 3, 8, 2, 7, 4, 6, 9];
const FLOATS = ["2.5", "4.75", "10.5", "3.25"];

/** A believable value for one read, so the output reads like a real run. */
function sampleValue(kind: Kind, hint: string, index: number): string {
  const h = hint.toLowerCase();
  if (/y\/n|yes|again|continue|repeat|more|another/.test(h) && kind !== "int" && kind !== "float") return "n";
  if (kind === "char") {
    if (/grade/.test(h)) return "A";
    if (/oper|op\b|sign|[+\-*/]\s*[,)]/.test(h)) return "+";
    if (/gender|sex/.test(h)) return "M";
    return "a";
  }
  if (kind === "word" || kind === "line") {
    if (/(first|user)?\s*name/.test(h)) return kind === "line" ? "Ali Khan" : "Ali";
    if (/city/.test(h)) return "Lahore";
    if (/country/.test(h)) return "Pakistan";
    if (/grade/.test(h)) return "A";
    if (/email/.test(h)) return "ali@example.com";
    if (/pass(word)?/.test(h)) return "secret123";
    if (/day/.test(h)) return "Monday";
    if (/colou?r/.test(h)) return "Blue";
    if (/oper/.test(h)) return "+";
    if (/(number|num|value|integer|age|marks|count|size|digit)/.test(h)) return String(INTS[index % INTS.length]);
    return kind === "line" ? "Hello World" : "Hello";
  }
  if (/\bage\b|age\s*[:=]/.test(h) || /\bage$/.test(h)) return "20";
  if (/mark|score|percent|obtain/.test(h)) return "85";
  if (/year/.test(h)) return "2024";
  if (/month/.test(h)) return "6";
  if (/choice|option|menu|select/.test(h)) return "1";
  if (/salary|price|amount|balance|bill|cost|income/.test(h)) return kind === "float" ? "1500.50" : "5000";
  if (/radius/.test(h)) return "7";
  if (/temp|celsius|fahrenheit/.test(h)) return "36.5";
  if (/\bsize\b|count|how many|\bterms\b|\brows\b|\blimit\b|\bn\b/.test(h)) return "5";
  return kind === "float" ? FLOATS[index % FLOATS.length] : String(INTS[index % INTS.length]);
}

/** The nearest string literal before a read, usually the prompt the program printed. */
function promptBefore(code: string, at: number) {
  const before = code.slice(Math.max(0, at - 240), at);
  const strings = [...before.matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'/g)];
  const last = strings.at(-1);
  return last ? (last[1] ?? last[2] ?? "") : "";
}

/** Finds a variable's declared type in C-like code. */
function declaredKind(code: string, name: string): Kind {
  const decl = new RegExp(
    `\\b(int|long|short|unsigned|float|double|char|string|bool|float64|float32|int64|int32)\\b[^;(){}=]*?\\b${name}\\b`,
  ).exec(code)?.[1];
  // Go puts the type after the name: var a, b int
  const goDecl = new RegExp(`\\bvar\\s+[\\w\\s,]*\\b${name}\\b[\\w\\s,]*?\\s(int|float64|float32|string)\\b`).exec(code)?.[1];
  const type = decl ?? goDecl ?? "";
  if (/float|double/.test(type)) return "float";
  if (type === "char") return "char";
  if (type === "string") return "word";
  return "int";
}

/** What kind of value the code on this line converts its input to. Strings (prompts) don't count. */
function lineKind(source: string): Kind {
  const line = source.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, "");
  if (/\b(?:float|double|Double|Float|decimal|Decimal|to_f|toDouble|toFloat|parseFloat|float64|as\.numeric)\b/.test(line)) return "float";
  if (/\b(?:int|Int|Integer|Int32|Int64|long|Long|to_i|toInt|toLong|parseInt|atoi|stoi|readInt|readLn|as\.integer|intval|i32|i64|u32|usize)\b/.test(line)) return "int";
  if (/\b(?:char|Char|toChar|ToChar|charAt)\b/.test(line)) return "char";
  return "line";
}

function readsIn(code: string, language: ConsoleLanguage): Read[] {
  const reads: Read[] = [];
  const add = (at: number, kinds: Kind[], name = "") =>
    reads.push({ at, kinds, hint: `${name} ${promptBefore(code, at)}` });

  if (language === "c" || language === "cpp") {
    const specKind = (spec: string): Kind =>
      spec.startsWith("%[") ? "line" : /[feg]$/.test(spec) ? "float" : spec.endsWith("c") ? "char" : spec.endsWith("s") ? "word" : "int";
    for (const m of code.matchAll(/\bscanf\s*\(\s*"([^"]*)"\s*,([^;]*)\)/g)) {
      const specs = [...m[1].replace(/%%/g, "").matchAll(/%(?:\[[^\]]*\]|\d*(?:hh|h|ll|l|L)?[a-zA-Z])/g)].map((s) => s[0]);
      const names = m[2].split(",").map((a) => a.replace(/[&\s]|\[.*\]/g, ""));
      add(m.index, specs.map(specKind), names.join(" "));
    }
    for (const m of code.matchAll(/\bcin\s*((?:>>\s*[\w.[\]]+\s*)+)/g)) {
      const names = m[1].split(">>").map((n) => n.trim().replace(/\[.*\]/, "")).filter(Boolean);
      add(m.index, names.map((n) => declaredKind(code, n)), names.join(" "));
    }
    for (const m of code.matchAll(/\b(?:getline\s*\(\s*(?:std::)?cin\s*,\s*(\w+)|gets\s*\(\s*(\w+)|fgets\s*\(\s*(\w+))/g)) {
      add(m.index, ["line"], m[1] ?? m[2] ?? m[3]);
    }
    return reads.sort((a, b) => a.at - b.at);
  }

  if (language === "go") {
    for (const m of code.matchAll(/fmt\.Scan(?:ln|f)?\s*\(([^)]*)\)/g)) {
      const names = m[1].split(",").filter((a) => a.includes("&")).map((a) => a.replace(/[&\s]/g, ""));
      add(m.index, names.map((n) => declaredKind(code, n)), names.join(" "));
    }
    return reads;
  }

  if (language === "python") {
    for (const m of code.matchAll(/^.*\binput\s*\(.*$/gm)) {
      const line = m[0];
      const target = /^\s*([\w\s,]+?)\s*=/.exec(line)?.[1] ?? "";
      if (/\.split\s*\(/.test(line)) {
        const count = target.includes(",") ? target.split(",").length : 5;
        add(m.index, Array(count).fill(/float/.test(line) ? "float" : /int/.test(line) ? "int" : "word"), target);
      } else {
        add(m.index, [/\bfloat\s*\(/.test(line) ? "float" : /\b(?:int|eval)\s*\(/.test(line) ? "int" : "line"], target);
      }
    }
    return reads;
  }

  // Everything else reads a line at a time; the rest of the line says what it becomes.
  const call: Partial<Record<ConsoleLanguage, RegExp>> = {
    java: /\.(nextInt|nextLong|nextShort|nextByte|nextDouble|nextFloat|nextBoolean|nextLine|next)\s*\(\s*\)|readLine\s*\(\s*\)/g,
    kotlin: /\breadLine\s*\(\s*\)|\breadln\s*\(\s*\)|\.(nextInt|nextDouble|nextLine|next)\s*\(\s*\)/g,
    csharp: /Console\.ReadLine\s*\(\s*\)/g,
    vb: /Console\.ReadLine\s*\(\s*\)/gi,
    dart: /stdin\.readLineSync\s*\(/g,
    rust: /read_line\s*\(/g,
    swift: /\breadLine\s*\(/g,
    ruby: /\bgets\b/g,
    php: /\bfgets\s*\(\s*STDIN|\breadline\s*\(|\bfscanf\s*\(\s*STDIN/g,
    r: /\breadline\s*\(|\breadLines\s*\(/g,
    octave: /\binput\s*\(/g,
    haskell: /\bgetLine\b|\breadLn\b/g,
    bash: /(?:^|[;&|][ \t]*)read\b(?:[ \t]+-\w+(?:[ \t]+"[^"]*")?)*[ \t]+(\w+(?:[ \t]+\w+)*)/gm,
    js: /\.question\s*\(|prompt\s*\(/g,
    typescript: /\.question\s*\(|prompt\s*\(/g,
  };
  const pattern = call[language];
  if (!pattern) return reads;
  for (const m of code.matchAll(pattern)) {
    const lineStart = code.lastIndexOf("\n", m.index) + 1;
    const lineEnd = code.indexOf("\n", m.index);
    let line = code.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    // Rust parses on a later line: let n: i32 = s.trim().parse()
    if (language === "rust") {
      const parse = code.slice(m.index, m.index + 300).split("\n").slice(1, 4).find((l) => /\.parse\b/.test(l));
      if (parse) line = parse;
    }
    const target = /(\w+)\s*(?::[^=]*)?(?:=|<-)\s*[^=]/.exec(line)?.[1] ?? "";
    const method = m[1] ?? "";
    let kind: Kind = lineKind(line);
    if (/Int|Long|Short|Byte/.test(method)) kind = "int";
    else if (/Double|Float/.test(method)) kind = "float";
    else if (method === "next") kind = "word";
    else if (method === "nextBoolean") kind = "word";
    if (language === "octave") kind = /['"]s['"]\s*\)/.test(line) ? "line" : "int";
    if (language === "haskell" && /readLn/.test(m[0])) kind = "int";
    if (language === "bash") {
      const names = (m[1] ?? "").trim().split(/\s+/);
      add(m.index, names.map(() => "int" as Kind), names.join(" "));
      continue;
    }
    add(m.index, [kind], target);
  }
  return reads;
}

/**
 * Sample input for a program that reads from the keyboard, so the student
 * never has to type it. Values come from what each read converts to and the
 * prompt before it (a name gets "Ali", marks get 85, a y/n question gets "n").
 * Extra lines repeat the last read, for programs that read in a loop.
 *
 * `reads` is how many lines the code visibly asks for, before those extras.
 */
export function sampleInput(programs: Program[]): { text: string; reads: number } {
  const program = programs.find((p) => readsInput([p]));
  if (!program) return { text: "", reads: 0 };
  const code = [program.entry, ...program.files].map((f) => codeOnly(f.content, program.language)).join("\n");
  const reads = readsIn(code, program.language);
  if (!reads.length) return { text: INTS.slice(0, 6).join("\n"), reads: 1 };

  let index = 0;
  const lineFor = (read: Read) => read.kinds.map((kind) => sampleValue(kind, read.hint, index++)).join(" ");
  const lines = reads.map(lineFor);
  const last = reads.at(-1)!;
  // A y/n answer already ends the loop; anything else gets a few more values.
  if (!/^n$/.test(lines.at(-1) ?? "")) for (let i = 0; i < 6; i++) lines.push(lineFor(last));
  return { text: lines.join("\n"), reads: reads.length };
}

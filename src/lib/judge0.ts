import { strToU8, zipSync } from "fflate";
import { C_ECHO, CPP_ECHO, CSHARP_ECHO, javaMain, kotlinMain, replaceInCode, RUBY_ECHO } from "./judge0-echo";
import type { ConsoleLanguage, Program, SourceFile } from "./programs";

/**
 * Runs programs on a Judge0 server (https://judge0.com). Server-only: the API
 * key must never reach the browser.
 *
 * JUDGE0_URL      defaults to the public test instance, https://ce.judge0.com
 * JUDGE0_API_KEY  sent as X-RapidAPI-Key for RapidAPI, otherwise as X-Auth-Token
 */
const JUDGE0_URL = (process.env.JUDGE0_URL || "https://ce.judge0.com").replace(/\/$/, "");
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY;

export const LANGUAGE_ID: Record<ConsoleLanguage, number> = {
  c: 103, // C (GCC 14.1.0)
  cpp: 105, // C++ (GCC 14.1.0)
  java: 91, // Java (JDK 17.0.6)
  python: 100, // Python (3.12.5)
  csharp: 51, // C# (Mono 6.6.0.161)
  dart: 90, // Dart (2.19.2)
  js: 102, // JavaScript (Node.js 22.08.0)
  kotlin: 111, // Kotlin (2.1.10)
  php: 98, // PHP (8.3.11)
  go: 107, // Go (1.23.5)
  typescript: 101, // TypeScript (5.6.2)
  ruby: 72, // Ruby (2.7.0)
  rust: 108, // Rust (1.85.0)
  swift: 83, // Swift (5.2.3)
  r: 99, // R (4.4.1)
  sql: 82, // SQL (SQLite 3.27.2)
  bash: 46, // Bash (5.0.0)
  octave: 66, // Octave (5.1.0), runs most MATLAB scripts
  vb: 84, // Visual Basic.Net (vbnc 0.0.0.5943)
  haskell: 61, // Haskell (GHC 8.8.1)
};

export type RunResult = {
  status: "ok" | "compile_error" | "runtime_error" | "timeout";
  stdout: string;
  stderr: string;
  compileOutput: string;
  /** True when the input was already echoed into stdout, as a real terminal shows it. */
  inputEchoed: boolean;
};

type Submission = {
  language_id: number;
  source_code: string;
  stdin: string;
  additional_files?: string;
  compiler_options?: string;
  cpu_time_limit: number;
  wall_time_limit: number;
};

type Prepared = { source: string; files: SourceFile[]; compilerOptions?: string; inputEchoed?: boolean };

const SOURCE_EXT = /\.(c|cc|cpp|cxx|cs|java)$/i;

/** Compiler arguments are filenames, so keep them to characters every shell treats literally. */
function safeName(name: string) {
  return name.replace(/[^\w.-]/g, "_");
}

/**
 * Turbo C / Visual Studio habits that GCC on Linux rejects. Every replacement
 * stays on its own line so compiler errors still point at the student's line numbers.
 */
function adaptC(content: string, cpp: boolean) {
  let out = content
    .replace(
      /^[ \t]*#[ \t]*include[ \t]*<conio\.h>.*$/gim,
      "static int getch(void){return 0;} static int _getch(void){return 0;} static int getche(void){return 0;} static void clrscr(void){}",
    )
    .replace(/\bsystem\s*\(\s*"(?:pause|cls)"\s*\)/gi, "0");
  if (cpp) out = out.replace(/\bvoid(\s+main\s*\()/g, "int$1");
  return out;
}

function prepareC(program: Program, cpp: boolean): Prepared {
  const all = [program.entry, ...program.files].map((f) => f.content).join("\n");
  const included = new Set([...all.matchAll(/#\s*include\s*"([^"]+)"/g)].map((m) => m[1].split("/").pop()));
  // A source file the student #includes directly must not also be compiled on its own.
  const files = program.files.map((f) => {
    const compile = SOURCE_EXT.test(f.name) && !included.has(f.name);
    return { name: compile ? safeName(f.name) : f.name, content: adaptC(f.content, cpp), compile };
  });
  const echo = { name: cpp ? "zh_echo.cpp" : "zh_echo.c", content: cpp ? CPP_ECHO : C_ECHO, compile: true };
  return {
    source: adaptC(program.entry.content, cpp),
    files: [...files, echo],
    compilerOptions: [...files, echo].filter((f) => f.compile).map((f) => f.name).join(" "),
    inputEchoed: true,
  };
}

function prepareJava(program: Program): Prepared {
  // Judge0 compiles Main.java and runs `java Main`. Main is ours: it sets up
  // the input echo, then starts the student's class.
  const strip = (content: string) => content.replace(/^[ \t]*package\s+[\w.]+\s*;/m, "");
  const fileName = (f: SourceFile) => {
    const publicType = f.content.match(/^\s*public\s+(?:(?:final|abstract|sealed)\s+)*(?:class|interface|enum|record)\s+(\w+)/m);
    return publicType ? `${publicType[1]}.java` : safeName(f.name);
  };

  let entry = strip(program.entry.content);
  const mainAt = entry.search(/\bstatic\s+(?:final\s+)?void\s+main\s*\(/);
  const classes = [...entry.slice(0, Math.max(0, mainAt)).matchAll(/\b(?:class|enum|record|interface)\s+(\w+)/g)];
  let entryClass = classes.at(-1)?.[1] ?? "Main";
  if (entryClass === "Main") {
    // Our wrapper needs the name; the student's class becomes ZhStudentMain.
    entry = replaceInCode(entry, /\bMain\b/g, "ZhStudentMain");
    entryClass = "ZhStudentMain";
  }

  const files = program.files.map((f) => ({ name: fileName(f), content: strip(f.content) }));
  files.push({ name: fileName({ ...program.entry, content: entry }), content: entry });
  return {
    source: javaMain(entryClass),
    files,
    compilerOptions: files.map((f) => f.name).join(" "),
    inputEchoed: true,
  };
}

function prepareKotlin(program: Program): Prepared {
  const entry = program.entry.content;
  // Only a top-level main can be renamed and wrapped; anything else runs as is.
  const main = /^fun\s+main\s*\(\s*(\)?)/m.exec(entry);
  if (!main) return { source: entry, files: program.files };
  const renamed = replaceInCode(entry, /^fun\s+main\s*\(/m, "fun zhStudentMain(", 1);
  return { source: renamed + kotlinMain(!main[1]), files: program.files, inputEchoed: true };
}

function prepareRuby(program: Program): Prepared {
  return { source: `${RUBY_ECHO}\n${program.entry.content}`, files: program.files, inputEchoed: true };
}

const IMPLICIT_USINGS = "using System; using System.IO; using System.Linq; using System.Collections.Generic; using System.Threading.Tasks;";

function adaptCSharp(content: string) {
  // ReadKey and Clear need a real console; with redirected input they throw.
  return content
    .replace(/(^|[;{}]\s*)Console\.ReadKey\s*\([^)]*\)\s*;/gm, "$1;")
    .replace(/(^|[;{}]\s*)Console\.Clear\s*\(\s*\)\s*;/gm, "$1;");
}

/** Judge0's Mono predates top-level statements, so wrap them in a Main the way .NET 6+ does. */
function wrapTopLevel(content: string) {
  const lines = content.split("\n");
  const usings: string[] = [];
  let start = 0;
  while (start < lines.length && /^\s*(using\s+[\w.=\s]+;|\/\/.*|)\s*$/.test(lines[start])) usings.push(lines[start++]);
  const typeAt = lines.findIndex(
    (line, i) => i >= start && /^(?:(?:public|internal|static|abstract|sealed|partial)\s+)*(?:class|struct|interface|enum)\s/.test(line),
  );
  const body = lines.slice(start, typeAt === -1 ? undefined : typeAt).join("\n");
  const types = typeAt === -1 ? "" : lines.slice(typeAt).join("\n");
  const main = /\bawait\b/.test(body) ? "static async Task Main(string[] args)" : "static void Main(string[] args)";
  return `${usings.join("\n")}\n${IMPLICIT_USINGS}\nclass ZhProgram { ${main} {\n${body}\n}}\n${types}`;
}

function prepareCSharp(program: Program): Prepared {
  const hasMain = [program.entry, ...program.files].some((f) =>
    /\bstatic\s+(?:async\s+)?(?:void|int|Task(?:<int>)?)\s+Main\s*\(/.test(f.content),
  );
  const entry = adaptCSharp(program.entry.content);
  const files = [
    ...program.files.map((f) => ({ name: safeName(f.name), content: adaptCSharp(f.content) })),
    { name: "ZhEcho.cs", content: CSHARP_ECHO },
  ];
  return {
    source: hasMain ? entry : wrapTopLevel(entry),
    files,
    // Without -out, Mono names the program after the first file and Judge0
    // can't find it. ZhEntry (in ZhEcho.cs) starts the student's Main.
    compilerOptions: ["-out:Main.exe", "-main:ZhEntry", ...files.filter((f) => /\.cs$/i.test(f.name)).map((f) => f.name)].join(" "),
    inputEchoed: true,
  };
}

function preparePython(program: Program): Prepared {
  // The student's file runs unchanged; this launcher only makes input() echo
  // what it reads, so the output looks like the terminal the student saw.
  const name = JSON.stringify(program.entry.name);
  const source = [
    "import builtins, sys",
    "_zh_input = builtins.input",
    "def _zh_echo(prompt=''):",
    "    value = _zh_input(prompt)",
    "    print(value)",
    "    return value",
    "builtins.input = _zh_echo",
    `sys.argv = [${name}]`,
    `with open(${name}, encoding='utf-8') as _zh_f: _zh_code = _zh_f.read()`,
    `exec(compile(_zh_code, ${name}, 'exec'), {'__name__': '__main__', '__file__': ${name}, '__builtins__': builtins})`,
  ].join("\n");
  return { source, files: [program.entry, ...program.files], inputEchoed: true };
}

function prepareR(program: Program): Prepared {
  // readline() returns "" outside the R console; this one reads stdin and
  // echoes the answer the way the console would. Kept on line 1 so error
  // line numbers move by one at most.
  const shim =
    '.zh_in <- file("stdin", "r"); readline <- function(prompt = "") { cat(prompt); v <- readLines(.zh_in, n = 1); if (!length(v)) v <- ""; cat(v, "\\n", sep = ""); v }';
  return { source: `${shim}\n${program.entry.content}`, files: program.files, inputEchoed: true };
}

function prepareSql(program: Program): Prepared {
  // SQLite runs the script. Show results as a table with headers, and drop
  // the MySQL-only statements most lab scripts start with.
  const script = program.entry.content
    .replace(/^\s*(?:CREATE|DROP)\s+(?:DATABASE|SCHEMA)\b[^;]*;/gim, "")
    .replace(/^\s*USE\s+\w+\s*;/gim, "")
    .replace(/\bAUTO_INCREMENT\b/gi, "")
    .replace(/\)\s*ENGINE\s*=\s*\w+[^;]*;/gi, ");");
  return { source: `.headers on\n.mode column\n${script}`, files: [] };
}

function prepare(program: Program): Prepared {
  switch (program.language) {
    case "r":
      return prepareR(program);
    case "kotlin":
      return prepareKotlin(program);
    case "ruby":
      return prepareRuby(program);
    case "sql":
      return prepareSql(program);
    case "c":
      return prepareC(program, false);
    case "cpp":
      return prepareC(program, true);
    case "java":
      return prepareJava(program);
    case "csharp":
      return prepareCSharp(program);
    case "python":
      return preparePython(program);
    default:
      return { source: program.entry.content, files: program.files };
  }
}

/** Drops the launcher's own frame from Python tracebacks, so the error reads as the student's. */
function cleanPythonTraceback(stderr: string) {
  const lines = stderr.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^ {2}File "[^"]*script\.py", line \d+, in <module>$/.test(lines[i])) {
      while (i + 1 < lines.length && /^ {4}/.test(lines[i + 1])) i++;
      continue;
    }
    out.push(lines[i]);
  }
  return out.join("\n");
}

const toBase64 = (text: string) => Buffer.from(text, "utf8").toString("base64");
const fromBase64 = (text: string | null) => (text ? Buffer.from(text, "base64").toString("utf8") : "");

export class RunnerError extends Error {}

export async function runProgram(program: Program, stdin: string): Promise<RunResult> {
  const prepared = prepare(program);
  const submission: Submission = {
    language_id: LANGUAGE_ID[program.language],
    source_code: toBase64(prepared.source),
    stdin: toBase64(stdin.replace(/\r\n?/g, "\n").replace(/\n?$/, "\n")),
    // CPU time stops infinite loops; the longer wall time covers slow
    // start-ups (R, Kotlin) on a busy runner.
    cpu_time_limit: 5,
    wall_time_limit: 15,
  };
  if (prepared.files.length) {
    const zip = zipSync(Object.fromEntries(prepared.files.map((f) => [f.name, strToU8(f.content)])));
    submission.additional_files = Buffer.from(zip).toString("base64");
  }
  if (prepared.compilerOptions) submission.compiler_options = prepared.compilerOptions;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (JUDGE0_API_KEY) {
    if (JUDGE0_URL.includes("rapidapi.com")) {
      headers["X-RapidAPI-Key"] = JUDGE0_API_KEY;
      headers["X-RapidAPI-Host"] = new URL(JUDGE0_URL).host;
    } else {
      headers["X-Auth-Token"] = JUDGE0_API_KEY;
    }
  }

  let response: Response;
  try {
    response = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=true&wait=true`, {
      method: "POST",
      headers,
      body: JSON.stringify(submission),
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    throw new RunnerError("The code runner didn't answer in time. Try again in a minute.");
  }
  if (response.status === 429) throw new RunnerError("The code runner is busy right now. Try again in a minute.");
  if (!response.ok) throw new RunnerError(`The code runner returned an error (${response.status}). Try again in a minute.`);

  const data: {
    stdout: string | null;
    stderr: string | null;
    compile_output: string | null;
    message: string | null;
    status: { id: number; description: string };
  } = await response.json();

  const id = data.status?.id;
  // 1–2 are still queued/processing, 13–14 are Judge0's own failures.
  if (!id || id <= 2 || id >= 13) {
    throw new RunnerError(`The code runner couldn't run this program (${data.status?.description ?? "no status"}).`);
  }
  let stderr = fromBase64(data.stderr);
  if (program.language === "python") stderr = cleanPythonTraceback(stderr);
  // Judge0 saves the program as main.c / main.cpp; errors should name the student's file.
  let compileOutput = fromBase64(data.compile_output);
  if (program.language === "c" || program.language === "cpp") {
    compileOutput = compileOutput.replace(/\bmain\.(?:c|cpp)(?=[:\s])/g, program.entry.name);
  }
  // The echo line in front of a Ruby program shifts its line numbers by one.
  if (program.language === "ruby") {
    stderr = stderr.replace(/script\.rb:(\d+)/g, (_, line) => `${program.entry.name}:${Number(line) - 1}`);
  }
  return {
    status: id === 5 ? "timeout" : id === 6 ? "compile_error" : id === 3 ? "ok" : "runtime_error",
    stdout: fromBase64(data.stdout),
    stderr,
    compileOutput,
    inputEchoed: !!prepared.inputEchoed,
  };
}

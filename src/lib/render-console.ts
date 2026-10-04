import { expandTabs } from "./assignment";
import type { RunResult } from "./judge0";
import type { Program } from "./programs";
import { captureWebOutput } from "./render-web";
import type { CodeFile } from "./types";

const FONT_SIZE = 14;
const LINE_HEIGHT = 20;
const FONT = `${FONT_SIZE}px Consolas, "Cascadia Mono", Menlo, "DejaVu Sans Mono", "Courier New", monospace`;
const PAD = 16;
const TITLE_BAR = 30;
const MAX_COLUMNS = 92;
const MIN_COLUMNS = 56;
const MAX_LINES = 80;
const SCALE = 2;

type Section = { title: string; lines: { text: string; error?: boolean }[] };

/**
 * Judge0 never sees a keyboard, so typed input is missing from stdout
 * ("Enter a number: Square = 49"). Put each input line back after the prompt
 * that asked for it: text ending in ":", "?", ">" or "=" plus a space that the
 * program carried on from without starting a new line.
 */
export function withInput(stdout: string, stdin: string, limit = Infinity) {
  const inputs = stdin.replace(/\r\n?/g, "\n").replace(/\n+$/, "").split("\n").slice(0, limit);
  if (!stdin.trim()) return stdout;
  let next = 0;
  // A prompt is ":", "?", ">" or "=" and one space, followed by more output
  // on the same line (or the end): the input goes right after it. Only one
  // space: more is usually the program's own padding (a table, a matrix).
  // A line ending in ":" or "?" also asks, with the answer typed on the next line.
  return stdout.replace(/[:?>=][ \t](?!\n)|[:?][ \t]*(?=\n)/g, (prompt, offset: number, all: string) => {
    if (next >= inputs.length) return prompt;
    if (all[offset + prompt.length] === "\n") return `${prompt}\n${inputs[next++]}`;
    const atEnd = offset + prompt.length === all.length;
    return `${prompt}${inputs[next++]}${atEnd ? "" : "\n"}`;
  });
}

function clean(text: string) {
  // Colour codes some programs print, then Windows line endings.
  return text
    .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n+$/, "");
}

function wrap(text: string, columns: number) {
  const rows: string[] = [];
  for (const raw of expandTabs(text).split("\n")) {
    if (!raw.length) rows.push("");
    for (let i = 0; i < raw.length; i += columns) rows.push(raw.slice(i, i + columns));
  }
  return rows;
}

function sectionFor(program: Program, result: RunResult, stdin: string, inputLimit?: number): Section {
  const stdout = clean(result.inputEchoed ? result.stdout : withInput(result.stdout, stdin, inputLimit));
  const stderr = clean(result.stderr);
  const lines = [
    ...(stdout ? wrap(stdout, MAX_COLUMNS).map((text) => ({ text })) : []),
    ...(stderr ? wrap(stderr, MAX_COLUMNS).map((text) => ({ text, error: true })) : []),
  ];
  if (!lines.length) lines.push({ text: "(The program printed nothing.)" });
  if (lines.length > MAX_LINES) {
    const hidden = lines.length - MAX_LINES + 1;
    lines.splice(MAX_LINES - 1, Infinity, { text: `… ${hidden} more lines` });
  }
  return { title: program.entry.name, lines };
}

/** Draws each program's output as a terminal window, stacked, as one PNG. */
function drawTerminals(sections: Section[]) {
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = FONT;
  const charWidth = measure.measureText("M").width;
  const columns = Math.max(
    MIN_COLUMNS,
    Math.min(MAX_COLUMNS, ...sections.flatMap((s) => s.lines.map((l) => l.text.length)).concat(MIN_COLUMNS)),
  );
  const width = Math.ceil(columns * charWidth + PAD * 2);
  const heights = sections.map((s) => TITLE_BAR + PAD * 2 + s.lines.length * LINE_HEIGHT);
  const gap = 18;
  const height = heights.reduce((a, b) => a + b, 0) + gap * (sections.length - 1);

  const canvas = document.createElement("canvas");
  canvas.width = width * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  let top = 0;
  sections.forEach((section, i) => {
    const h = heights[i];
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0.5, top + 0.5, width - 1, h - 1, 8);
    ctx.clip();
    ctx.fillStyle = "#0c0c0c";
    ctx.fillRect(0, top, width, h);
    ctx.fillStyle = "#2b2b2b";
    ctx.fillRect(0, top, width, TITLE_BAR);
    ctx.restore();

    ["#ff5f57", "#febc2e", "#28c840"].forEach((color, dot) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(PAD + dot * 18, top + TITLE_BAR / 2, 5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.font = `12px ${FONT.split("px ")[1]}`;
    ctx.fillStyle = "#b9b9b9";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${section.title} — Output`, width / 2, top + TITLE_BAR / 2);

    ctx.font = FONT;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    section.lines.forEach((line, row) => {
      ctx.fillStyle = line.error ? "#ff7b72" : "#e6e6e6";
      ctx.fillText(line.text, PAD, top + TITLE_BAR + PAD + row * LINE_HEIGHT + FONT_SIZE);
    });
    top += h + gap;
  });

  return { image: canvas.toDataURL("image/png"), width, height };
}

async function run(program: Program, stdin: string): Promise<RunResult> {
  const response = await fetch("/api/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ program, stdin }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(data?.error ?? "The code runner couldn't be reached.");
  return data as RunResult;
}

/** A PHP page's output is HTML; screenshot it like a web page instead of printing the tags. */
function looksLikeHtml(text: string) {
  return /<(?:!doctype|html|body|div|p|h[1-6]|table|form|ul|ol|br|span|img|a)\b/i.test(text);
}

/**
 * Runs every program in the question, one after another, and returns the
 * terminal screenshot. `assets` are the CSS/JS a PHP page links to.
 * `inputLimit` caps how many input lines are placed into output that wasn't
 * echoed: sample input carries spare lines the program may never read.
 */
export async function captureConsoleOutput(
  programs: Program[],
  stdin: string,
  assets: CodeFile[] = [],
  inputLimit?: number,
) {
  const sections: Section[] = [];
  for (const program of programs) {
    const result = await run(program, stdin);
    if (program.language === "php" && result.status === "ok" && looksLikeHtml(result.stdout)) {
      const page: CodeFile = {
        id: program.entry.name,
        name: program.entry.name.replace(/\.php$/i, ".html"),
        content: result.stdout,
        language: "html",
        question: null,
        suggested: null,
      };
      return captureWebOutput([page, ...assets]);
    }
    if (result.status === "compile_error") {
      const details = clean(result.compileOutput || result.stderr).split("\n").slice(0, 12).join("\n");
      throw new Error(`${program.entry.name} has an error and didn't compile:\n${details}\n\nFix it and upload the file again.`);
    }
    if (result.status === "timeout") {
      throw new Error(
        `${program.entry.name} ran for too long and was stopped. If it asks for input, add it under Program input; if it has a loop, check that the loop ends.`,
      );
    }
    sections.push(sectionFor(program, result, stdin, inputLimit));
  }
  return drawTerminals(sections);
}

import type { Language } from "./types";

/**
 * A small syntax highlighter for the code in the Word and PDF exports. It
 * doesn't parse; it recognises comments, strings, numbers, keywords and
 * calls well enough to colour code the way an IDE does.
 */
export type TokenKind =
  | "plain"
  | "variable"
  | "keyword"
  | "control"
  | "type"
  | "string"
  | "comment"
  | "number"
  | "preproc"
  | "function"
  | "annotation"
  | "punct"
  | "tag"
  | "tagpunct"
  | "attr"
  | "selector"
  | "property"
  | "value";

export type Token = { text: string; kind: TokenKind };

type Rules = {
  line: string[];
  block: [string, string][];
  /** Quote characters; a doubled-up entry like `"""` is a multi-line string. */
  quotes: string[];
  keywords: string;
  control?: string;
  types?: string;
  /** `#include` and friends: the whole line is a preprocessor directive. */
  preproc?: boolean;
  caseInsensitive?: boolean;
  /** Capitalised names are types (classes), as in Java or C#. */
  capitalTypes?: boolean;
  annotations?: boolean;
};

const CONTROL = "if else for while do switch case break continue return goto try catch finally throw default";

const C_LIKE: Omit<Rules, "keywords"> = { line: ["//"], block: [["/*", "*/"]], quotes: ['"', "'"] };

const RULES: Partial<Record<Language, Rules>> = {
  c: {
    ...C_LIKE,
    preproc: true,
    keywords: "auto const enum extern inline register signed sizeof static struct typedef union unsigned volatile NULL",
    control: CONTROL,
    types: "int char float double long short void bool size_t FILE",
  },
  cpp: {
    ...C_LIKE,
    preproc: true,
    keywords:
      "auto const enum extern inline register signed sizeof static struct typedef union unsigned volatile class namespace using public private protected virtual template typename new delete this operator friend nullptr true false const_cast static_cast dynamic_cast override final explicit mutable NULL",
    control: CONTROL,
    types: "int char float double long short void bool string vector map set size_t",
  },
  java: {
    ...C_LIKE,
    capitalTypes: true,
    annotations: true,
    keywords:
      "abstract assert class const enum extends final implements import instanceof interface native new package private protected public static super synchronized this throws transient volatile true false null var record",
    control: CONTROL,
    types: "int char float double long short void boolean byte",
  },
  csharp: {
    ...C_LIKE,
    capitalTypes: true,
    keywords:
      "using namespace class public private protected internal static new this base override virtual abstract async await const readonly out ref params struct enum interface get set var null true false is as in sealed partial",
    control: `${CONTROL} foreach`,
    types: "int char float double long short void bool string decimal object byte",
  },
  js: {
    ...C_LIKE,
    quotes: ['"', "'", "`"],
    keywords:
      "var let const function new this class extends import export from async await typeof instanceof in of null undefined true false static get set delete void yield",
    control: CONTROL,
  },
  typescript: {
    ...C_LIKE,
    quotes: ['"', "'", "`"],
    capitalTypes: true,
    keywords:
      "var let const function new this class extends implements import export from async await typeof instanceof in of null undefined true false static interface type enum public private protected readonly as keyof",
    control: CONTROL,
    types: "number string boolean any void unknown never",
  },
  kotlin: {
    ...C_LIKE,
    quotes: ['"', "'"],
    capitalTypes: true,
    annotations: true,
    keywords: "fun val var class object interface data import package private public protected override in is as null true false this",
    control: `${CONTROL} when`,
  },
  go: {
    ...C_LIKE,
    quotes: ['"', "'", "`"],
    keywords: "package import func var const type struct interface map chan go defer range nil true false",
    control: CONTROL,
    types: "int int64 int32 float64 float32 string bool byte rune error",
  },
  rust: {
    ...C_LIKE,
    quotes: ['"'],
    capitalTypes: true,
    keywords: "fn let mut pub use mod struct enum impl trait as ref self Self true false const static where crate move",
    control: `${CONTROL} loop match in`,
    types: "i8 i16 i32 i64 u8 u16 u32 u64 usize f32 f64 bool char str String Vec",
  },
  swift: {
    ...C_LIKE,
    quotes: ['"'],
    capitalTypes: true,
    keywords: "func let var import class struct enum protocol extension true false nil self in guard",
    control: CONTROL,
  },
  dart: {
    ...C_LIKE,
    capitalTypes: true,
    annotations: true,
    keywords: "import var final const class extends implements new true false null async await this late required",
    control: CONTROL,
    types: "void int double num bool dynamic",
  },
  php: {
    ...C_LIKE,
    line: ["//", "#"],
    keywords: "echo print function new class public private protected static true false null array require include as use namespace",
    control: `${CONTROL} elseif foreach`,
  },
  python: {
    line: ["#"],
    block: [],
    quotes: ['"""', "'''", '"', "'"],
    keywords: "def class import from as lambda pass global nonlocal and or not is in True False None with yield del assert",
    control: "if elif else for while break continue return try except finally raise",
  },
  ruby: {
    line: ["#"],
    block: [],
    quotes: ['"', "'"],
    keywords: "def end class module do then require true false nil self yield begin rescue ensure puts print",
    control: "if elsif else unless while until for in return break next case when",
  },
  r: {
    line: ["#"],
    block: [],
    quotes: ['"', "'"],
    keywords: "function TRUE FALSE NULL NA library in",
    control: "if else for while repeat next break return",
  },
  bash: {
    line: ["#"],
    block: [],
    quotes: ['"', "'"],
    keywords: "function echo read local export then fi done esac in",
    control: "if else elif for while do case return",
  },
  sql: {
    line: ["--"],
    block: [["/*", "*/"]],
    quotes: ["'", '"'],
    caseInsensitive: true,
    keywords:
      "select from where insert into values update set delete create table drop alter primary key foreign references not null and or order by group having join inner left right on as default unique auto_increment distinct limit like in between is database use index view asc desc",
    types: "int integer varchar char text date float double decimal boolean",
  },
  vb: {
    line: ["'"],
    block: [],
    quotes: ['"'],
    caseInsensitive: true,
    keywords: "module sub end function dim as public private class new true false not and or imports byval byref",
    control: "if then else elseif for next to while loop do return select case",
    types: "integer string double boolean single long char",
  },
  haskell: {
    line: ["--"],
    block: [["{-", "-}"]],
    quotes: ['"'],
    capitalTypes: true,
    keywords: "module where import data type newtype let in do class instance deriving",
    control: "case of if then else",
  },
  octave: {
    line: ["%", "#"],
    block: [],
    quotes: ['"', "'"],
    keywords: "function end disp fprintf input",
    control: "if else elseif for while return break continue switch case",
  },
};

const sets = new Map<Rules, { keywords: Set<string>; control: Set<string>; types: Set<string> }>();
function wordsOf(rules: Rules) {
  let found = sets.get(rules);
  if (!found) {
    const split = (text = "") => new Set(text.split(/\s+/).filter(Boolean));
    found = { keywords: split(rules.keywords), control: split(rules.control), types: split(rules.types) };
    sets.set(rules, found);
  }
  return found;
}

const NUMBER = /^(?:0[xX][\da-fA-F]+|\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?)[fFlLuUdDmM]*/;
const IDENT = /^[A-Za-z_$][\w$]*/;

function scanCode(src: string, rules: Rules): Token[] {
  const out: Token[] = [];
  const { keywords, control, types } = wordsOf(rules);
  const push = (text: string, kind: TokenKind) => {
    const last = out.at(-1);
    if (last && last.kind === kind) last.text += text;
    else out.push({ text, kind });
  };
  const atLineStart = (i: number) => /(^|\n)[ \t]*$/.test(src.slice(Math.max(0, i - 200), i));

  let i = 0;
  scan: while (i < src.length) {
    const rest = src.slice(i, i + 3);
    for (const [open, close] of rules.block) {
      if (src.startsWith(open, i)) {
        const end = src.indexOf(close, i + open.length);
        const stop = end === -1 ? src.length : end + close.length;
        push(src.slice(i, stop), "comment");
        i = stop;
        continue scan;
      }
    }
    for (const marker of rules.line) {
      if (src.startsWith(marker, i)) {
        const end = src.indexOf("\n", i);
        const stop = end === -1 ? src.length : end;
        push(src.slice(i, stop), "comment");
        i = stop;
        continue scan;
      }
    }
    if (rules.preproc && src[i] === "#" && atLineStart(i)) {
      const end = src.indexOf("\n", i);
      const stop = end === -1 ? src.length : end;
      push(src.slice(i, stop), "preproc");
      i = stop;
      continue;
    }
    for (const quote of rules.quotes) {
      if (!src.startsWith(quote, i)) continue;
      const multiline = quote.length === 3 || quote === "`";
      let j = i + quote.length;
      while (j < src.length && !src.startsWith(quote, j)) {
        if (src[j] === "\\") j++;
        else if (src[j] === "\n" && !multiline) break;
        j++;
      }
      const stop = Math.min(src.length, src.startsWith(quote, j) ? j + quote.length : j);
      push(src.slice(i, stop), "string");
      i = stop;
      continue scan;
    }
    if (rules.annotations && src[i] === "@") {
      const name = IDENT.exec(src.slice(i + 1));
      if (name) {
        push(`@${name[0]}`, "annotation");
        i += name[0].length + 1;
        continue;
      }
    }
    if (/\d/.test(rest[0]) && !/[\w$]/.test(src[i - 1] ?? "")) {
      const number = NUMBER.exec(src.slice(i));
      if (number) {
        push(number[0], "number");
        i += number[0].length;
        continue;
      }
    }
    const ident = IDENT.exec(src.slice(i, i + 200));
    if (ident) {
      const word = ident[0];
      const key = rules.caseInsensitive ? word.toLowerCase() : word;
      const next = src.slice(i + word.length).match(/^\s*(.)/)?.[1];
      let kind: TokenKind = "variable";
      if (control.has(key)) kind = "control";
      else if (keywords.has(key)) kind = "keyword";
      else if (types.has(key)) kind = "type";
      else if (next === "(") kind = "function";
      else if (rules.capitalTypes && /^[A-Z][a-z]/.test(word)) kind = "type";
      push(word, kind);
      i += word.length;
      continue;
    }
    const space = /^\s+/.exec(src.slice(i, i + 200));
    if (space) {
      push(space[0], "plain");
      i += space[0].length;
      continue;
    }
    push(src[i], "punct");
    i++;
  }
  return out;
}

function scanCss(src: string): Token[] {
  const out: Token[] = [];
  const push = (text: string, kind: TokenKind) => {
    const last = out.at(-1);
    if (last && last.kind === kind) last.text += text;
    else out.push({ text, kind });
  };
  let depth = 0;
  let i = 0;
  while (i < src.length) {
    if (src.startsWith("/*", i)) {
      const end = src.indexOf("*/", i + 2);
      const stop = end === -1 ? src.length : end + 2;
      push(src.slice(i, stop), "comment");
      i = stop;
      continue;
    }
    const ch = src[i];
    if (ch === '"' || ch === "'") {
      const end = src.indexOf(ch, i + 1);
      const stop = end === -1 ? src.length : end + 1;
      push(src.slice(i, stop), "string");
      i = stop;
      continue;
    }
    if (ch === "{" || ch === "}" || ch === ";" || ch === ":" || ch === ",") {
      if (ch === "{") depth++;
      if (ch === "}") depth = Math.max(0, depth - 1);
      push(ch, "punct");
      i++;
      continue;
    }
    if (/\s/.test(ch)) {
      const space = /^\s+/.exec(src.slice(i))![0];
      push(space, "plain");
      i += space.length;
      continue;
    }
    if (ch === "@") {
      const word = /^@[\w-]+/.exec(src.slice(i))![0];
      push(word, "keyword");
      i += word.length;
      continue;
    }
    if (depth === 0) {
      const selector = /^[^{};,/'"\s]+/.exec(src.slice(i))?.[0] ?? ch;
      push(selector, "selector");
      i += selector.length;
      continue;
    }
    // Inside a rule: a name before ":" is a property, everything else a value.
    const word = /^[^\s{};:,'"]+/.exec(src.slice(i))?.[0] ?? ch;
    const isProperty = /^\s*:/.test(src.slice(i + word.length)) && !/:\s*$/.test(src.slice(Math.max(0, i - 40), i));
    push(word, isProperty ? "property" : /^[-+]?[\d.#]/.test(word) ? "number" : "value");
    i += word.length;
  }
  return out;
}

function scanHtml(src: string): Token[] {
  const out: Token[] = [];
  const push = (text: string, kind: TokenKind) => {
    if (!text) return;
    const last = out.at(-1);
    if (last && last.kind === kind) last.text += text;
    else out.push({ text, kind });
  };
  let i = 0;
  while (i < src.length) {
    if (src.startsWith("<!--", i)) {
      const end = src.indexOf("-->", i + 4);
      const stop = end === -1 ? src.length : end + 3;
      push(src.slice(i, stop), "comment");
      i = stop;
      continue;
    }
    const open = /^<(\/?)(!?[A-Za-z][\w-]*)/.exec(src.slice(i, i + 100));
    if (open) {
      push(`<${open[1]}`, "tagpunct");
      push(open[2], open[2].startsWith("!") ? "keyword" : "tag");
      i += open[0].length;
      // Attributes up to the closing ">".
      while (i < src.length && src[i] !== ">") {
        if (src.startsWith("/>", i)) break;
        const quote = src[i] === '"' || src[i] === "'" ? src[i] : null;
        if (quote) {
          const end = src.indexOf(quote, i + 1);
          const stop = end === -1 ? src.length : end + 1;
          push(src.slice(i, stop), "string");
          i = stop;
        } else if (/\s/.test(src[i])) {
          const space = /^\s+/.exec(src.slice(i))![0];
          push(space, "plain");
          i += space.length;
        } else if (src[i] === "=") {
          push("=", "plain");
          i++;
        } else {
          const name = /^[^\s=>"'/]+/.exec(src.slice(i))?.[0] ?? src[i];
          push(name, open[2].startsWith("!") ? "keyword" : "attr");
          i += name.length;
        }
      }
      const close = src.startsWith("/>", i) ? "/>" : src[i] === ">" ? ">" : "";
      push(close, "tagpunct");
      i += close.length;
      // Style and script contents are highlighted as CSS and JavaScript.
      const name = open[2].toLowerCase();
      if (!open[1] && (name === "style" || name === "script")) {
        const end = src.toLowerCase().indexOf(`</${name}`, i);
        const stop = end === -1 ? src.length : end;
        const inner = src.slice(i, stop);
        out.push(...(name === "style" ? scanCss(inner) : scanCode(inner, RULES.js!)));
        i = stop;
      }
      continue;
    }
    const text = /^[^<]+/.exec(src.slice(i))?.[0] ?? src[i];
    push(text, "plain");
    i += text.length;
  }
  return out;
}

/** The file's tokens, split into lines (tokens never contain a line break). */
export function highlight(content: string, language: Language): Token[][] {
  const src = content.replace(/\r\n?/g, "\n");
  let tokens: Token[];
  if (language === "html") tokens = scanHtml(src);
  else if (language === "css") tokens = scanCss(src);
  else if (language === "php" && /<\w/.test(src.split("<?php")[0] ?? "")) tokens = scanHtml(src);
  else tokens = RULES[language] ? scanCode(src, RULES[language]!) : [{ text: src, kind: "plain" }];

  const lines: Token[][] = [[]];
  for (const token of tokens) {
    token.text.split("\n").forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part) lines.at(-1)!.push({ text: part, kind: token.kind });
    });
  }
  return lines;
}

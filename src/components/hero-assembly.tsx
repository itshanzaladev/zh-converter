"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { FileDown } from "lucide-react";

type Sample = {
  file: string;
  question: number;
  statement: string;
  lang: "py" | "cpp" | "html";
  code: string[];
  output: { kind: "terminal"; lines: string[] } | { kind: "browser" };
};

const SAMPLES: Sample[] = [
  {
    file: "q1.py",
    question: 1,
    statement: "Write a program that prints the factorial of a number entered by the user.",
    lang: "py",
    code: [
      'n = int(input("Enter a number: "))',
      "fact = 1",
      "for i in range(1, n + 1):",
      "    fact *= i",
      'print("Factorial =", fact)',
    ],
    output: { kind: "terminal", lines: ["Enter a number: 5", "Factorial = 120"] },
  },
  {
    file: "q2.cpp",
    question: 2,
    statement: "Print the first five terms of the Fibonacci series.",
    lang: "cpp",
    code: [
      "int main() {",
      "  int a = 0, b = 1;",
      "  for (int i = 0; i < 5; i++) {",
      '    cout << a << " ";',
      "    int t = a + b; a = b; b = t;",
      "  }",
      "}",
    ],
    output: { kind: "terminal", lines: ["0 1 1 2 3"] },
  },
  {
    file: "q3.html",
    question: 3,
    statement: "Create a login card with a heading and a sign-in button.",
    lang: "html",
    code: [
      '<div class="card">',
      "  <h2>Login</h2>",
      '  <input placeholder="Email">',
      "  <button>Sign in</button>",
      "</div>",
    ],
    output: { kind: "browser" },
  },
];

const KEYWORDS = /\b(int|for|in|range|print|input|main|return|cout|using|namespace|if|else|def|while)\b/g;

/** Tiny highlighter: strings, tags, keywords and numbers are enough for a demo. */
function Highlight({ line, lang }: { line: string; lang: Sample["lang"] }) {
  const parts: { text: string; color?: string }[] = [];
  const pattern =
    lang === "html"
      ? /("[^"]*")|(<\/?[a-z0-9]+)|(>)/gi
      : new RegExp(`("[^"]*")|${KEYWORDS.source}|(\\b\\d+\\b)`, "g");
  let last = 0;
  for (const match of line.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ text: line.slice(last, index) });
    const color = match[1]
      ? "#f7c59f"
      : lang === "html"
        ? "#f5a07f"
        : match[2]
          ? "#f5a07f"
          : "#c9b3f2";
    parts.push({ text: match[0], color });
    last = index + match[0].length;
  }
  if (last < line.length) parts.push({ text: line.slice(last) });
  return (
    <>
      {parts.map((part, i) => (
        <span key={i} style={part.color ? { color: part.color } : undefined}>
          {part.text}
        </span>
      ))}
    </>
  );
}

/** Timeline per sample: 0 file lands, 1 heading, 2..n code lines, n+1 output, n+2 downloads. */
function stepsFor(sample: Sample) {
  return sample.code.length + 4;
}

function delayFor(step: number, sample: Sample) {
  const total = stepsFor(sample);
  if (step === 0) return 900;
  if (step === 1) return 700;
  if (step < sample.code.length + 2) return 230;
  if (step === total - 2) return 1100;
  return 2600;
}

export function HeroAssembly() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState(0);
  const sample = SAMPLES[index];
  const shownStep = reduced ? stepsFor(sample) - 1 : step;
  const codeShown = Math.max(0, Math.min(sample.code.length, shownStep - 1));
  const showOutput = shownStep >= sample.code.length + 2;
  const showDownloads = shownStep >= sample.code.length + 3;

  useEffect(() => {
    if (reduced) return;
    const timer = window.setTimeout(() => {
      if (step + 1 >= stepsFor(sample)) {
        setIndex((i) => (i + 1) % SAMPLES.length);
        setStep(0);
      } else {
        setStep(step + 1);
      }
    }, delayFor(step, sample));
    return () => window.clearTimeout(timer);
  }, [step, sample, reduced]);

  return (
    <LayoutGroup>
      <div className="relative mx-auto w-full max-w-[460px]" aria-hidden>
        {/* The tray of files still waiting to be written up. */}
        <div className="mb-5 flex h-9 items-center justify-center gap-2">
          {SAMPLES.map((s, i) =>
            i === index ? (
              <span key={s.file} className="h-9 w-[88px]" />
            ) : (
              <motion.span
                key={s.file}
                layoutId={`chip-${s.file}`}
                className="rounded-full border border-line bg-surface px-3.5 py-1.5 font-mono text-[13px] text-muted shadow-sm"
              >
                {s.file}
              </motion.span>
            ),
          )}
        </div>

        {/* The A4 page. It stays paper-white in both themes, like a real document. */}
        <motion.div
          className="relative aspect-[1/1.2] overflow-hidden rounded-[10px] bg-white p-6 text-[#241a1e] shadow-[0_30px_60px_-30px_rgba(120,60,40,0.45),0_0_0_1px_rgba(36,26,30,0.06)] sm:p-7"
          initial={{ rotate: -1.5 }}
          animate={{ rotate: [-1.5, -0.5, -1.5] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="mb-5 flex items-center justify-between border-b border-[#f0ddd3] pb-2.5 font-mono text-[10.5px] text-[#9a8a8e]">
            <span>Assignment #03 · PF/ITCP</span>
            <motion.span
              layoutId={`chip-${sample.file}`}
              className="rounded-full bg-[#fde8dc] px-2.5 py-0.5 text-[11px] text-[#b4502c]"
            >
              {sample.file}
            </motion.span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={sample.file}
              exit={{ opacity: 0, y: -10, transition: { duration: 0.25 } }}
            >
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={shownStep >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                transition={{ duration: 0.4 }}
              >
                <h3 className="font-display text-[22px] font-semibold leading-none">
                  Question {sample.question}
                </h3>
                <p className="mt-2 text-[12.5px] leading-snug text-[#74656a]">{sample.statement}</p>
              </motion.div>

              <motion.p
                className="mb-1.5 mt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#9a8a8e]"
                animate={{ opacity: shownStep >= 2 ? 1 : 0 }}
              >
                Code
              </motion.p>
              <div className="min-h-[132px] rounded-md bg-[#2a2024] px-3.5 py-3 font-mono text-[10.5px] leading-[1.7] text-[#f6e9e2]">
                {sample.code.slice(0, codeShown).map((line, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex gap-3 whitespace-pre"
                  >
                    <span className="w-3 select-none text-right text-[#6f5b60]">{i + 1}</span>
                    <span>
                      <Highlight line={line} lang={sample.lang} />
                    </span>
                  </motion.div>
                ))}
                {codeShown < sample.code.length && shownStep >= 1 && (
                  <motion.span
                    className="ml-6 inline-block h-3 w-1.5 bg-[#f5a07f]"
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                  />
                )}
              </div>

              <motion.p
                className="mb-1.5 mt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#9a8a8e]"
                animate={{ opacity: showOutput ? 1 : 0 }}
              >
                Output
              </motion.p>
              <AnimatePresence>
                {showOutput && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.94, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 22 }}
                    className="origin-top-left"
                  >
                    {sample.output.kind === "terminal" ? (
                      <div className="rounded-md border border-[#e9d9d1] bg-[#191214] px-3.5 py-2.5 font-mono text-[10.5px] leading-[1.7] text-[#e7f0d8]">
                        {sample.output.lines.map((line) => (
                          <div key={line}>{line}</div>
                        ))}
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-md border border-[#e9d9d1]">
                        <div className="flex items-center gap-1 bg-[#f6eee9] px-2 py-1.5">
                          <i className="h-1.5 w-1.5 rounded-full bg-[#f5a07f]" />
                          <i className="h-1.5 w-1.5 rounded-full bg-[#e9d9d1]" />
                          <i className="h-1.5 w-1.5 rounded-full bg-[#e9d9d1]" />
                        </div>
                        <div className="grid place-items-center bg-[#faf6f3] py-3">
                          <div className="w-36 rounded-md bg-white p-2.5 shadow-sm">
                            <div className="text-[11px] font-semibold">Login</div>
                            <div className="mt-1.5 h-4 rounded border border-[#e9d9d1] px-1 text-[8px] leading-4 text-[#9a8a8e]">
                              Email
                            </div>
                            <div className="mt-1.5 rounded bg-[#241a1e] py-0.5 text-center text-[8px] text-white">
                              Sign in
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>

          <div className="absolute bottom-3 right-6 font-mono text-[10px] text-[#b9abae]">
            Page {sample.question + 1}
          </div>
        </motion.div>

        {/* What you walk away with. */}
        <div className="mt-5 flex h-10 justify-center gap-2.5">
          <AnimatePresence>
            {showDownloads &&
              ["assignment.docx", "assignment.pdf"].map((name, i) => (
                <motion.span
                  key={name}
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ delay: i * 0.1, type: "spring", stiffness: 300, damping: 20 }}
                  className="flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 font-mono text-[12px] text-paper"
                >
                  <FileDown size={13} /> {name}
                </motion.span>
              ))}
          </AnimatePresence>
        </div>
      </div>
    </LayoutGroup>
  );
}

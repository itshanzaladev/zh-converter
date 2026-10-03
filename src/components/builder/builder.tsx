"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileDown, Loader2, X } from "lucide-react";
import type { CodeFile, CoverDetails, Question } from "@/lib/types";
import { EMPTY_COVER } from "@/lib/types";
import { readCodeFile, sortFiles, WEB_LANGUAGES } from "@/lib/files";
import { captureWebOutput } from "@/lib/render-web";
import { assignmentFilename, type AssignmentDoc } from "@/lib/assignment";
import { downloadBlob } from "@/lib/images";
import { CoverPage } from "@/components/cover-page";
import { CoverForm } from "./cover-form";
import { DropZone } from "./drop-zone";
import { QuestionCard } from "./question-card";

const COVER_KEY = "zh.cover";

function loadCover(): CoverDetails {
  try {
    const saved = localStorage.getItem(COVER_KEY);
    return saved ? { ...EMPTY_COVER, ...JSON.parse(saved) } : EMPTY_COVER;
  } catch {
    return EMPTY_COVER;
  }
}

function blankQuestion(number: number): Question {
  return { number, statement: "", stdin: "", output: { status: "idle" } };
}

function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-10 first:border-t-0 first:pt-0">
      <p className="font-mono text-sm text-accent">Step {step}</p>
      <h2 className="mb-6 mt-1 font-display text-3xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export default function Builder() {
  const [cover, setCover] = useState<CoverDetails>(loadCover);
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [questions, setQuestions] = useState<Record<number, Question>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [exporting, setExporting] = useState<"docx" | "pdf" | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(COVER_KEY, JSON.stringify(cover));
    } catch {
      // Storage can be full or blocked; the cover just won't be remembered.
    }
  }, [cover]);

  const questionNumbers = useMemo(
    () => [...new Set(files.map((f) => f.question).filter((n): n is number => n !== null))].sort((a, b) => a - b),
    [files],
  );
  const unassigned = files.filter((f) => f.question === null);
  const getQuestion = (n: number) => questions[n] ?? blankQuestion(n);
  const filesFor = (n: number, list = files) => sortFiles(list.filter((f) => f.question === n));

  const pushError = (message: string) => setErrors((list) => [...list, message]);

  function updateQuestion(question: Question) {
    setQuestions((all) => ({ ...all, [question.number]: question }));
  }

  async function runQuestion(number: number, list: CodeFile[]) {
    const questionFiles = filesFor(number, list);
    if (!questionFiles.some((f) => WEB_LANGUAGES.includes(f.language))) return;
    setQuestions((all) => ({ ...all, [number]: { ...(all[number] ?? blankQuestion(number)), output: { status: "running" } } }));
    try {
      const shot = await captureWebOutput(questionFiles);
      setQuestions((all) => ({
        ...all,
        [number]: { ...(all[number] ?? blankQuestion(number)), output: { status: "done", source: "auto", ...shot } },
      }));
    } catch (error) {
      setQuestions((all) => ({
        ...all,
        [number]: {
          ...(all[number] ?? blankQuestion(number)),
          output: {
            status: "error",
            message: `${error instanceof Error ? error.message : "The screenshot failed."} Try again or use your own screenshot.`,
          },
        },
      }));
    }
  }

  /** Re-screenshot the given questions, one after another so they don't fight over the CPU. */
  async function rerun(numbers: (number | null)[], list: CodeFile[]) {
    for (const n of new Set(numbers)) {
      if (n === null) continue;
      if (getQuestion(n).output.status === "done" && (getQuestion(n).output as { source: string }).source === "upload") {
        continue;
      }
      await runQuestion(n, list);
    }
  }

  async function addFiles(picked: File[]) {
    setErrors([]);
    const results = await Promise.allSettled(picked.map(readCodeFile));
    const added: CodeFile[] = [];
    results.forEach((result) => {
      if (result.status === "fulfilled") added.push(result.value);
      else pushError(result.reason instanceof Error ? result.reason.message : "A file could not be read.");
    });
    if (!added.length) return;

    // Replace a file uploaded again under the same name instead of duplicating it.
    const names = new Set(added.map((f) => f.name));
    const next = [...files.filter((f) => !names.has(f.name)), ...added];
    setFiles(next);
    rerun(
      added.map((f) => f.question),
      next,
    );
  }

  function moveFile(id: string, to: number | null) {
    const from = files.find((f) => f.id === id)?.question ?? null;
    const next = files.map((f) => (f.id === id ? { ...f, question: to } : f));
    setFiles(next);
    rerun([from, to], next);
  }

  function removeFile(id: string) {
    const from = files.find((f) => f.id === id)?.question ?? null;
    const next = files.filter((f) => f.id !== id);
    setFiles(next);
    if (from !== null && !next.some((f) => f.question === from)) {
      setQuestions((all) => {
        const rest = { ...all };
        delete rest[from];
        return rest;
      });
    } else {
      rerun([from], next);
    }
  }

  const running = questionNumbers.some((n) => getQuestion(n).output.status === "running");
  const missingOutput = questionNumbers.filter((n) => getQuestion(n).output.status !== "done");

  async function exportAs(kind: "docx" | "pdf") {
    setExporting(kind);
    setErrors([]);
    try {
      const doc: AssignmentDoc = {
        cover,
        questions: questionNumbers.map((n) => ({ ...getQuestion(n), files: filesFor(n) })),
      };
      const blob =
        kind === "docx"
          ? await (await import("@/lib/export-docx")).buildDocx(doc)
          : await (await import("@/lib/export-pdf")).buildPdf(doc);
      downloadBlob(blob, assignmentFilename(cover, kind));
    } catch (error) {
      console.error(error);
      pushError(`The ${kind === "docx" ? "Word" : "PDF"} file could not be created. ${error instanceof Error ? error.message : ""}`);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-24 pt-10 sm:px-6 lg:grid-cols-[1fr_340px]">
      <div>
        <Section step={1} title="Cover page">
          <CoverForm cover={cover} onChange={setCover} onError={pushError} />
        </Section>

        <Section step={2} title="Code files">
          <DropZone onFiles={addFiles} />

          <AnimatePresence>
            {errors.length > 0 && (
              <motion.ul
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 space-y-1 rounded-xl border border-peach-strong/40 bg-blush/60 p-4 text-sm"
              >
                {errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>

          {unassigned.length > 0 && (
            <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
              <p className="font-medium">Which question do these belong to?</p>
              <p className="mt-1 text-sm text-muted">
                Their names don&apos;t say. Rename them like <span className="font-mono">q2.css</span> next time to
                skip this.
              </p>
              <ul className="mt-4 space-y-2">
                {unassigned.map((file) => (
                  <li key={file.id} className="flex items-center gap-2 rounded-lg bg-blush/50 px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate font-mono">{file.name}</span>
                    <select
                      aria-label={`Question for ${file.name}`}
                      className="rounded-md border border-line bg-surface px-2 py-1 text-sm"
                      value=""
                      onChange={(e) => moveFile(file.id, Number(e.target.value))}
                    >
                      <option value="" disabled>
                        {file.suggested ? `Q${file.suggested}?` : "Choose"}
                      </option>
                      {[...new Set([...questionNumbers, file.suggested ?? 0, Math.max(0, ...questionNumbers) + 1])]
                        .filter((n) => n > 0)
                        .sort((a, b) => a - b)
                        .map((n) => (
                          <option key={n} value={n}>
                            Question {n}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeFile(file.id)}
                      className="rounded p-1 text-muted hover:bg-blush hover:text-ink"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        <Section step={3} title="Questions">
          {questionNumbers.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-muted">
              Add code files in step 2 and each question shows up here with its output.
            </p>
          ) : (
            <div className="space-y-5">
              <AnimatePresence initial={false}>
                {questionNumbers.map((n) => (
                  <QuestionCard
                    key={n}
                    question={getQuestion(n)}
                    files={filesFor(n)}
                    questionNumbers={questionNumbers}
                    onChange={updateQuestion}
                    onMoveFile={moveFile}
                    onRemoveFile={removeFile}
                    onRun={() => runQuestion(n, files)}
                    onError={pushError}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </Section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="mx-auto max-w-[260px] overflow-hidden rounded-lg shadow-[0_24px_50px_-28px_rgba(120,60,40,0.5),0_0_0_1px_rgba(36,26,30,0.06)]">
          <CoverPage
            style="classic"
            logo={cover.logo}
            details={{
              university: cover.university || "University",
              campus: cover.campus || "Campus",
              assignment: cover.assignment || "Assignment #",
              subject: cover.subject || "Subject",
              name: cover.name || "—",
              regNo: cover.regNo || "—",
              section: cover.section || "—",
              instructor: cover.instructor || "—",
              date: cover.date || "—",
            }}
          />
        </div>

        <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
          <p className="font-display text-lg font-semibold">
            {questionNumbers.length} question{questionNumbers.length === 1 ? "" : "s"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {questionNumbers.length === 0
              ? "Add files to get started."
              : running
                ? "Taking screenshots…"
                : missingOutput.length
                  ? `No output yet for ${missingOutput.map((n) => `Q${n}`).join(", ")}. It will be left out.`
                  : "Every question has its output."}
          </p>
          <div className="mt-5 grid gap-2.5">
            {(["docx", "pdf"] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                disabled={!questionNumbers.length || running || exporting !== null}
                onClick={() => exportAs(kind)}
                className={`inline-flex items-center justify-center gap-2 rounded-full py-3 font-medium transition-transform enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 ${
                  kind === "docx" ? "bg-peach text-[#241a1e]" : "border border-ink text-ink"
                }`}
              >
                {exporting === kind ? <Loader2 size={17} className="animate-spin" /> : <FileDown size={17} />}
                {kind === "docx" ? "Download Word" : "Download PDF"}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

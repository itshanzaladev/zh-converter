"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { ImageUp, Loader2, RotateCw, X } from "lucide-react";
import type { CodeFile, Question } from "@/lib/types";
import { LANGUAGE_LABEL, WEB_LANGUAGES } from "@/lib/files";
import { toPng } from "@/lib/images";
import { inputClass } from "./cover-form";

export function QuestionCard({
  question,
  files,
  questionNumbers,
  onChange,
  onMoveFile,
  onRemoveFile,
  onRun,
  onError,
}: {
  question: Question;
  files: CodeFile[];
  questionNumbers: number[];
  onChange: (question: Question) => void;
  onMoveFile: (fileId: string, to: number | null) => void;
  onRemoveFile: (fileId: string) => void;
  onRun: () => void;
  onError: (message: string) => void;
}) {
  const upload = useRef<HTMLInputElement>(null);
  const isWeb = files.some((f) => WEB_LANGUAGES.includes(f.language));
  const needsRunner = files.some((f) => !WEB_LANGUAGES.includes(f.language));
  const { output } = question;

  async function uploadScreenshot(file: File | undefined) {
    if (!file) return;
    try {
      const png = await toPng(file);
      onChange({ ...question, output: { status: "done", source: "upload", ...png } });
    } catch (error) {
      onError(error instanceof Error ? error.message : "That screenshot could not be read.");
    }
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="rounded-2xl border border-line bg-surface p-5 sm:p-6"
    >
      <h3 className="font-display text-2xl font-semibold tracking-tight">Question {question.number}</h3>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-medium">Question statement</span>
        <textarea
          rows={2}
          className={`${inputClass} resize-y`}
          placeholder="Write a program that…"
          value={question.statement}
          onChange={(e) => onChange({ ...question, statement: e.target.value })}
        />
      </label>

      <p className="mb-2 mt-5 text-sm font-medium">Files</p>
      <ul className="space-y-2">
        {files.map((file) => (
          <li key={file.id} className="flex items-center gap-2 rounded-lg bg-blush/50 px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate font-mono">{file.name}</span>
            <span className="hidden text-xs text-muted sm:inline">{LANGUAGE_LABEL[file.language]}</span>
            <select
              aria-label={`Move ${file.name} to another question`}
              className="rounded-md border border-line bg-surface px-1.5 py-1 text-xs"
              value={question.number}
              onChange={(e) => onMoveFile(file.id, e.target.value === "none" ? null : Number(e.target.value))}
            >
              {questionNumbers.map((n) => (
                <option key={n} value={n}>
                  Q{n}
                </option>
              ))}
              <option value={Math.max(0, ...questionNumbers) + 1}>New question</option>
              <option value="none">Unassigned</option>
            </select>
            <button
              type="button"
              onClick={() => onRemoveFile(file.id)}
              className="rounded p-1 text-muted hover:bg-blush hover:text-ink"
              aria-label={`Remove ${file.name}`}
            >
              <X size={15} />
            </button>
          </li>
        ))}
      </ul>

      {needsRunner && (
        <label className="mt-5 block">
          <span className="mb-1.5 block text-sm font-medium">Program input (stdin)</span>
          <textarea
            rows={2}
            className={`${inputClass} resize-y font-mono text-sm`}
            placeholder={"One value per line, e.g.\n5"}
            value={question.stdin}
            onChange={(e) => onChange({ ...question, stdin: e.target.value })}
          />
        </label>
      )}

      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm font-medium">Output</p>
        <div className="flex gap-1">
          {isWeb && (
            <button
              type="button"
              onClick={onRun}
              disabled={output.status === "running"}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-accent hover:bg-blush disabled:opacity-50"
            >
              <RotateCw size={14} /> Take screenshot again
            </button>
          )}
          <button
            type="button"
            onClick={() => upload.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-accent hover:bg-blush"
          >
            <ImageUp size={14} /> Use my screenshot
          </button>
          <input
            ref={upload}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              uploadScreenshot(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="mt-2 overflow-hidden rounded-xl border border-line bg-paper">
        {output.status === "running" && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
            <Loader2 size={16} className="animate-spin" /> Opening the page and taking a screenshot…
          </div>
        )}
        {output.status === "done" && (
          <motion.img
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            src={output.image}
            alt={`Output of question ${question.number}`}
            className="max-h-[420px] w-full object-contain object-top"
          />
        )}
        {output.status === "error" && <p className="px-4 py-8 text-center text-sm text-accent">{output.message}</p>}
        {output.status === "idle" && (
          <p className="px-4 py-8 text-center text-sm text-muted">
            {needsRunner && !isWeb
              ? "Running Python, C, C++ and Java is coming next. For now, add a screenshot of the output."
              : "The screenshot appears here."}
          </p>
        )}
      </div>
    </motion.article>
  );
}

"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { FileCode2 } from "lucide-react";
import { ACCEPT } from "@/lib/files";

export function DropZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <motion.div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFiles(Array.from(e.dataTransfer.files));
      }}
      animate={{ scale: over ? 1.015 : 1 }}
      className={`grid place-items-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
        over ? "border-peach-strong bg-blush" : "border-line bg-surface"
      }`}
    >
      <motion.div animate={{ y: over ? -6 : 0 }} className="grid h-14 w-14 place-items-center rounded-2xl bg-blush text-accent">
        <FileCode2 size={26} />
      </motion.div>
      <p className="mt-4 font-display text-xl font-semibold">Drop your code files here</p>
      <p className="mt-1.5 max-w-sm text-sm text-muted">
        Name them <span className="font-mono text-ink">q1.html</span>, <span className="font-mono text-ink">q1.css</span>,{" "}
        <span className="font-mono text-ink">q2.html</span> and they sort into questions on their own.
      </p>
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="mt-5 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5"
      >
        Choose files
      </button>
      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </motion.div>
  );
}

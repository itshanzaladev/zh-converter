"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, FileDown, Loader2, X } from "lucide-react";

/**
 * The whole assignment as a PDF, in a window over the builder, so the
 * student can check it before downloading. `url` is null while it's built.
 */
export function PreviewDialog({
  open,
  url,
  onClose,
  onDownload,
}: {
  open: boolean;
  url: string | null;
  onClose: () => void;
  onDownload: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // The page behind shouldn't scroll while the preview is open.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  // Rendered into <body>: inside the builder, the sticky sidebar would keep it under the nav.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Assignment preview"
            className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
            initial={{ y: 24, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 24, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
              <p className="font-display text-lg font-semibold">Assignment preview</p>
              <div className="flex items-center gap-1.5">
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm text-accent hover:bg-blush sm:inline-flex"
                  >
                    <ExternalLink size={15} /> Open in new tab
                  </a>
                )}
                <button
                  type="button"
                  onClick={onDownload}
                  disabled={!url}
                  className="inline-flex items-center gap-1.5 rounded-full bg-peach px-4 py-2 text-sm font-medium text-[#241a1e] disabled:opacity-50"
                >
                  <FileDown size={15} /> Download PDF
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close preview"
                  className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-blush hover:text-ink"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            {url ? (
              <iframe src={url} title="Assignment preview" className="h-full w-full flex-1 bg-[#525659]" />
            ) : (
              <div className="flex flex-1 items-center justify-center gap-2 text-muted">
                <Loader2 size={18} className="animate-spin" /> Putting your assignment together…
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

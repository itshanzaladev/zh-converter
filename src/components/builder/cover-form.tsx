"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ImagePlus, X } from "lucide-react";
import type { CoverDetails, CoverStyle } from "@/lib/types";
import { COVER_STYLES, FEATURED_STYLES } from "@/lib/cover-styles";
import { toPng } from "@/lib/images";
import { CoverPage, withPlaceholders } from "@/components/cover-page";

const FIELDS: { key: Exclude<keyof CoverDetails, "logo" | "style" | "pageBorder">; label: string; placeholder: string; wide?: boolean }[] = [
  { key: "university", label: "University", placeholder: "COMSATS University", wide: true },
  { key: "campus", label: "Campus", placeholder: "Wah Campus" },
  { key: "assignment", label: "Assignment", placeholder: "Assignment #03" },
  { key: "subject", label: "Subject", placeholder: "PF / ITCP" },
  { key: "name", label: "Your name", placeholder: "Muhammad Husnain Akbar" },
  { key: "regNo", label: "Registration no", placeholder: "SP19-BCS-007" },
  { key: "section", label: "Class / section", placeholder: "2A-BCS" },
  { key: "instructor", label: "Submitted to", placeholder: "Dr. Mudassar Raza" },
  { key: "date", label: "Submission date", placeholder: "23-09-2026" },
];

const STYLES = Object.keys(COVER_STYLES) as CoverStyle[];

export const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-[15px] text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-peach-strong";

export function CoverForm({
  cover,
  onChange,
  onError,
}: {
  cover: CoverDetails;
  onChange: (cover: CoverDetails) => void;
  onError: (message: string) => void;
}) {
  const logoInput = useRef<HTMLInputElement>(null);
  // Open from the start when the saved style is one of the hidden ones.
  const [showAll, setShowAll] = useState(() => STYLES.indexOf(cover.style) >= FEATURED_STYLES);

  const styleButton = (style: CoverStyle) => {
    const selected = cover.style === style;
    return (
      <button
        key={style}
        type="button"
        aria-pressed={selected}
        onClick={() => onChange({ ...cover, style })}
        className={`rounded-xl border p-2.5 text-left transition-colors ${
          selected ? "border-peach-strong bg-blush/60 ring-2 ring-peach/40" : "border-line hover:bg-blush/40"
        }`}
      >
        {/* The 260px preview, shrunk to a thumbnail. */}
        <div className="mx-auto h-[147px] w-[104px] overflow-hidden rounded-sm shadow-sm ring-1 ring-black/5">
          <div className="origin-top-left scale-[0.4]">
            <CoverPage cover={withPlaceholders({ ...cover, style })} />
          </div>
        </div>
        <span className="mt-2 block text-sm font-medium">{COVER_STYLES[style].name}</span>
        <span className="block text-xs text-muted">{COVER_STYLES[style].note}</span>
      </button>
    );
  };

  async function pickLogo(file: File | undefined) {
    if (!file) return;
    try {
      const { image } = await toPng(file, 600);
      onChange({ ...cover, logo: image });
    } catch (error) {
      onError(error instanceof Error ? error.message : "That logo could not be read.");
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-sm font-medium">
          Cover style <span className="font-normal text-muted">· {STYLES.length} to choose from</span>
        </legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{STYLES.slice(0, FEATURED_STYLES).map(styleButton)}</div>

        {/* The rest show faintly under the first row until the arrow opens them. */}
        <div className="relative mt-3">
          <motion.div
            initial={false}
            animate={{ height: showAll ? "auto" : 120, opacity: showAll ? 1 : 0.35 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className={`overflow-hidden ${showAll ? "" : "pointer-events-none"}`}
            style={showAll ? undefined : { maskImage: "linear-gradient(to bottom, #000 10%, transparent)" }}
            aria-hidden={!showAll}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{STYLES.slice(FEATURED_STYLES).map(styleButton)}</div>
          </motion.div>
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            aria-expanded={showAll}
            className={`mx-auto flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-blush ${
              showAll ? "mt-3" : "absolute bottom-1 left-1/2 -translate-x-1/2"
            }`}
          >
            {showAll ? "Show fewer" : `Show all ${STYLES.length} styles`}
            <motion.span animate={{ rotate: showAll ? 180 : 0 }} className="grid place-items-center">
              <ChevronDown size={16} />
            </motion.span>
          </button>
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--peach-strong)]"
            checked={cover.pageBorder}
            onChange={(e) => onChange({ ...cover, pageBorder: e.target.checked })}
          />
          <span>
            Border on every page
            <span className="text-muted">
              {" "}
              · {COVER_STYLES[cover.style].border === "none" ? "a thin line" : `the ${COVER_STYLES[cover.style].name} border`} around the
              question pages too
            </span>
          </span>
        </label>
      </fieldset>

      <div className="flex items-center gap-4 sm:col-span-2">
        <button
          type="button"
          onClick={() => logoInput.current?.click()}
          className="group relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-peach-strong/60 bg-blush/50 text-accent transition-colors hover:bg-blush"
          aria-label={cover.logo ? "Change university logo" : "Upload university logo"}
        >
          {cover.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover.logo} alt="University logo" className="h-full w-full object-contain p-1.5" />
          ) : (
            <ImagePlus size={22} />
          )}
        </button>
        <div className="text-sm">
          <p className="font-medium">University logo</p>
          <p className="text-muted">PNG or JPG. Sits at the top of the cover page.</p>
          {cover.logo && (
            <button
              type="button"
              onClick={() => onChange({ ...cover, logo: null })}
              className="mt-1 inline-flex items-center gap-1 text-accent hover:underline"
            >
              <X size={14} /> Remove logo
            </button>
          )}
        </div>
        <input
          ref={logoInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            pickLogo(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {FIELDS.map((field) => (
        <label key={field.key} className={`block ${field.wide ? "sm:col-span-2" : ""}`}>
          <span className="mb-1.5 block text-sm font-medium">{field.label}</span>
          <input
            className={inputClass}
            value={cover[field.key]}
            placeholder={field.placeholder}
            onChange={(e) => onChange({ ...cover, [field.key]: e.target.value })}
          />
        </label>
      ))}
    </div>
  );
}

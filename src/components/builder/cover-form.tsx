"use client";

import { useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import type { CoverDetails, CoverStyle } from "@/lib/types";
import { COVER_STYLES } from "@/lib/cover-styles";
import { toPng } from "@/lib/images";
import { CoverPage, withPlaceholders } from "@/components/cover-page";

const FIELDS: { key: Exclude<keyof CoverDetails, "logo" | "style">; label: string; placeholder: string; wide?: boolean }[] = [
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
        <legend className="mb-2 text-sm font-medium">Cover style</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(COVER_STYLES) as CoverStyle[]).map((style) => {
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
          })}
        </div>
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

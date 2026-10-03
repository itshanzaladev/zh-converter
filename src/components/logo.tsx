import Link from "next/link";

/** A page with a folded corner, carrying the "ZH" monogram. */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M6 3h14l7 7v17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" fill="var(--peach)" />
      <path d="M20 3v5a2 2 0 0 0 2 2h5Z" fill="var(--peach-strong)" />
      <text
        x="15.5"
        y="23"
        textAnchor="middle"
        fontFamily="var(--font-jetbrains), monospace"
        fontWeight="700"
        fontSize="10"
        fill="#241a1e"
      >
        ZH
      </text>
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="ZH Converter home">
      <LogoMark />
      <span className="whitespace-nowrap font-display text-lg font-semibold tracking-tight">
        ZH <span className="font-normal text-muted">Converter</span>
      </span>
    </Link>
  );
}

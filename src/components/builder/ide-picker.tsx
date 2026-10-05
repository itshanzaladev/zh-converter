"use client";

import { highlight } from "@/lib/highlight";
import { IDE_THEMES, type IdeStyle } from "@/lib/ide-themes";

const SAMPLE = `#include <iostream>
using namespace std;

int main() {
    int n = 5; // terms
    for (int i = 1; i <= n; i++) {
        cout << "Square: " << i * i << endl;
    }
    return 0;
}`;

/**
 * A few lines of code drawn the way an IDE shows them, from the same theme
 * the Word and PDF exports use.
 */
export function CodePreview({ style, fileName = "main.cpp", code = SAMPLE }: { style: IdeStyle; fileName?: string; code?: string }) {
  const theme = IDE_THEMES[style];
  const lines = highlight(code, "cpp");
  const bar = theme.tabBar;
  return (
    <div
      className="overflow-hidden text-left font-[ZH_Code,Consolas,monospace] text-[10.5px] leading-[1.5]"
      style={{
        background: `#${theme.background}`,
        border: `1px solid #${theme.gutter.border ?? "3C3C3C"}`,
        // JetBrains Mono would join <= into ≤; the IDEs show the plain characters.
        fontVariantLigatures: "none",
        fontFeatureSettings: '"calt" 0, "liga" 0',
      }}
    >
      <div className="flex" style={{ background: `#${bar.background}` }}>
        <span
          className="mt-[3px] px-3 py-[3px] font-sans text-[10px]"
          style={{
            background: `#${bar.tab}`,
            color: `#${bar.text}`,
            fontWeight: bar.bold ? 700 : 400,
            borderTop: bar.accent ? `1px solid #${bar.accent}` : undefined,
            border: bar.border ? `1px solid #${bar.border}` : undefined,
            borderBottom: "none",
          }}
        >
          {fileName}
          <span className="ml-3 opacity-70">×</span>
        </span>
      </div>
      {theme.toolbar && (
        <div className="flex gap-3 px-1.5 py-[2px] font-sans text-[9px]" style={{ background: `#${theme.toolbar.background}`, color: `#${theme.toolbar.text}` }}>
          <span className="border border-[#c0c0c0] bg-white px-1">Source</span>
          <span>History</span>
        </div>
      )}
      <div className="flex py-1.5">
        <div
          className="shrink-0 select-none pr-2 text-right"
          style={{
            width: 28,
            background: `#${theme.gutter.background}`,
            color: `#${theme.gutter.number}`,
            borderRight: theme.gutter.border ? `1px solid #${theme.gutter.border}` : undefined,
          }}
        >
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <pre className="m-0 overflow-hidden whitespace-pre pl-2.5 font-[inherit]">
          {lines.map((line, i) => (
            <div key={i}>
              {line.length === 0 && " "}
              {line.map((token, j) => {
                const s = theme.tokens[token.kind];
                return (
                  <span key={j} style={{ color: `#${s.color}`, fontWeight: s.bold ? 700 : 400, fontStyle: s.italic ? "italic" : "normal" }}>
                    {token.text}
                  </span>
                );
              })}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}

/** Pick which IDE the code in the Word and PDF files should look like. */
export function IdePicker({ value, onChange }: { value: IdeStyle; onChange: (style: IdeStyle) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {(Object.keys(IDE_THEMES) as IdeStyle[]).map((style) => {
        const selected = value === style;
        return (
          <button
            key={style}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(style)}
            className={`rounded-xl border p-2.5 text-left transition-colors ${
              selected ? "border-peach-strong bg-blush/60 ring-2 ring-peach/40" : "border-line hover:bg-blush/40"
            }`}
          >
            <div className="pointer-events-none overflow-hidden rounded-sm">
              <CodePreview style={style} />
            </div>
            <span className="mt-2.5 block text-sm font-medium">{IDE_THEMES[style].name}</span>
            <span className="block text-xs text-muted">{IDE_THEMES[style].note}</span>
          </button>
        );
      })}
    </div>
  );
}

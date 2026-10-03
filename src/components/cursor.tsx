"use client";

import { useEffect, useRef } from "react";

const INTERACTIVE = "a, button, [role='button'], label, select, [data-cursor='grow']";

/**
 * The native cursor stays; a small peach dot trails just behind it and swells
 * slightly over anything clickable. Fine pointers only, and skipped entirely
 * when the user prefers reduced motion.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const target = { x: -100, y: -100 };
    const trail = { x: -100, y: -100 };
    let grow = false;
    let hidden = true;
    let frame = 0;

    const onMove = (event: PointerEvent) => {
      target.x = event.clientX;
      target.y = event.clientY;
      grow = !!(event.target as Element | null)?.closest?.(INTERACTIVE);
      hidden = false;
    };
    const onLeave = () => {
      hidden = true;
    };

    const tick = () => {
      trail.x += (target.x - trail.x) * 0.14;
      trail.y += (target.y - trail.y) * 0.14;
      if (dot.current) {
        // Offset down-right so the dot sits behind the arrow, not under its tip.
        dot.current.style.transform = `translate3d(${trail.x + 10}px, ${trail.y + 14}px, 0) translate(-50%, -50%) scale(${grow ? 1.8 : 1})`;
        dot.current.style.opacity = hidden ? "0" : grow ? "0.55" : "0.85";
      }
      frame = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={dot}
      aria-hidden
      style={{ opacity: 0 }}
      className="pointer-events-none fixed left-0 top-0 z-[100] h-2 w-2 rounded-full bg-peach-strong transition-opacity duration-200"
    />
  );
}

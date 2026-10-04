"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#languages", label: "Languages" },
  { href: "/#pricing", label: "Pricing" },
];

/**
 * A floating pill ("dynamic island"): drops in on load and tightens a little
 * once the page scrolls.
 */
export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="pointer-events-none sticky top-3 z-50 mt-3 flex justify-center px-3">
      <motion.nav
        initial={{ y: -28, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className={`pointer-events-auto relative flex h-14 w-full items-center justify-between overflow-hidden rounded-full border pl-5 pr-2 backdrop-blur-xl transition-[width,background-color,box-shadow,border-color] duration-500 ease-out ${
          scrolled
            ? "border-line bg-paper/85 shadow-[0_12px_40px_-12px_rgba(120,60,40,0.35)] md:w-[76%]"
            : "border-line/70 bg-paper/60 shadow-[0_8px_30px_-16px_rgba(120,60,40,0.25)] md:w-[80%]"
        }`}
      >
        <Logo />

        <ul className="hidden items-center gap-1 text-[15px] text-muted md:flex" onMouseLeave={() => setHovered(null)}>
          {LINKS.map((link) => (
            <li key={link.href} className="relative">
              {hovered === link.href && (
                <motion.span
                  layoutId="nav-hover"
                  className="absolute inset-0 rounded-full bg-blush"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <a
                href={link.href}
                onMouseEnter={() => setHovered(link.href)}
                className="relative block rounded-full px-4 py-2 transition-colors hover:text-ink"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/builder"
            className="whitespace-nowrap rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <span className="sm:hidden">Start</span>
            <span className="hidden sm:inline">Start an assignment</span>
          </Link>
        </div>
      </motion.nav>
    </header>
  );
}

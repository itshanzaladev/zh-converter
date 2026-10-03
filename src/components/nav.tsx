"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#languages", label: "Languages" },
  { href: "/#templates", label: "Templates" },
  { href: "/#pricing", label: "Pricing" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${
        scrolled ? "border-b border-line bg-paper/80 backdrop-blur-md" : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <ul className="hidden items-center gap-8 text-[15px] text-muted md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="transition-colors hover:text-ink">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <Link
            href="/builder"
            className="whitespace-nowrap rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <span className="sm:hidden">Start</span>
            <span className="hidden sm:inline">Start an assignment</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}

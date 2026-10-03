import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Nav } from "@/components/nav";
import { HeroAssembly } from "@/components/hero-assembly";
import { Reveal } from "@/components/reveal";
import { CoverPage, type CoverStyle } from "@/components/cover-page";
import { LogoMark } from "@/components/logo";

const STEPS = [
  {
    title: "Fill in your cover page",
    body: "University logo, name, registration number, section, subject, instructor and date. Saved for next time.",
  },
  {
    title: "Drop in your code files",
    body: "Name them q1.py, q2.cpp, question3.html and they sort themselves into questions. Drag to fix any that don't.",
  },
  {
    title: "Add the question and its input",
    body: "Paste each problem statement. If a program asks for input, type it once and we feed it in when it runs.",
  },
  {
    title: "Download Word and PDF",
    body: "Every program is run and its output captured under its code. Edit anything before you download.",
  },
];

const LANGUAGES = [
  { name: "HTML", ext: ".html", how: "Page screenshot" },
  { name: "CSS", ext: ".css", how: "Page screenshot" },
  { name: "JavaScript", ext: ".js", how: "Page or console" },
  { name: "Python", ext: ".py", how: "Terminal output" },
  { name: "C", ext: ".c", how: "Terminal output" },
  { name: "C++", ext: ".cpp", how: "Terminal output" },
  { name: "Java", ext: ".java", how: "Terminal output" },
];

const TEMPLATES: { style: CoverStyle; name: string; note: string }[] = [
  { style: "classic", name: "Classic", note: "The layout most departments expect" },
  { style: "framed", name: "Framed", note: "Classic with a double border" },
  { style: "modern", name: "Modern", note: "For when you're allowed to have fun" },
];

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-40 -top-40 h-[620px] w-[620px] rounded-full bg-peach/25 blur-[120px] dark:bg-peach/10"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-24 pt-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
            <div>
              <Reveal>
                <h1 className="font-display text-[clamp(2.75rem,6.4vw,5rem)] font-semibold leading-[0.98] tracking-[-0.035em]">
                  Hand in the lab,
                  <br />
                  <span className="text-accent">not the formatting.</span>
                </h1>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-muted">
                  Upload <code className="font-mono text-[0.92em] text-ink">q1.py</code>,{" "}
                  <code className="font-mono text-[0.92em] text-ink">q2.cpp</code>,{" "}
                  <code className="font-mono text-[0.92em] text-ink">q3.html</code>. ZH Converter runs every
                  program, captures its output, and writes the whole assignment: cover page, questions, code and
                  output, as Word and PDF.
                </p>
              </Reveal>
              <Reveal delay={0.2}>
                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <Link
                    href="/builder"
                    className="group inline-flex items-center gap-2 rounded-full bg-peach px-6 py-3.5 font-medium text-[#241a1e] shadow-[0_10px_30px_-10px_var(--peach-strong)] transition-transform hover:-translate-y-0.5"
                  >
                    Start an assignment
                    <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                  <a
                    href="#how"
                    className="rounded-full px-5 py-3.5 font-medium text-ink transition-colors hover:bg-blush"
                  >
                    See how it works
                  </a>
                </div>
                <p className="mt-5 font-mono text-[13px] text-muted">Your first 3 assignments are free.</p>
              </Reveal>
            </div>
            <Reveal delay={0.15}>
              <HeroAssembly />
            </Reveal>
          </div>
        </section>

        {/* How it works — a real sequence, so it is numbered. */}
        <section id="how" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
            <Reveal>
              <h2 className="max-w-xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                Four steps. About two minutes.
              </h2>
            </Reveal>
            <ol className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, i) => (
                <li key={step.title} className="bg-paper">
                  <Reveal delay={i * 0.08} className="h-full p-7">
                    <span className="font-mono text-sm text-accent">Step {i + 1}</span>
                    <h3 className="mt-3 font-display text-xl font-semibold tracking-tight">{step.title}</h3>
                    <p className="mt-2.5 leading-relaxed text-muted">{step.body}</p>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Languages */}
        <section id="languages" className="scroll-mt-20 bg-blush/60 dark:bg-blush/40">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.4fr]">
            <Reveal>
              <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                The output your teacher wants to see.
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
                Web pages are opened and screenshotted exactly as they render. Everything else is compiled, run with
                your input, and shown as a clean terminal window.
              </p>
            </Reveal>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {LANGUAGES.map((lang, i) => (
                <li key={lang.name}>
                  <Reveal delay={i * 0.05}>
                    <div
                      data-cursor="grow"
                      className="rounded-xl border border-line bg-paper p-4 transition-transform duration-300 hover:-translate-y-1"
                    >
                      <div className="flex items-baseline justify-between">
                        <span className="font-display text-lg font-semibold">{lang.name}</span>
                        <span className="font-mono text-xs text-accent">{lang.ext}</span>
                      </div>
                      <p className="mt-3 text-sm text-muted">{lang.how}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Templates */}
        <section id="templates" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
            <Reveal>
              <h2 className="max-w-2xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                A cover page that matches your department.
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
                Upload your university logo once. Your name, registration number and section fill in on every
                assignment after that.
              </p>
            </Reveal>
            <div className="mt-14 grid gap-8 sm:grid-cols-3">
              {TEMPLATES.map((template, i) => (
                <Reveal key={template.style} delay={i * 0.1}>
                  <figure className="group">
                    <div
                      data-cursor="grow"
                      className="overflow-hidden rounded-lg shadow-[0_24px_50px_-28px_rgba(120,60,40,0.5),0_0_0_1px_rgba(36,26,30,0.06)] transition-transform duration-500 group-hover:-translate-y-2 group-hover:rotate-[-1deg]"
                    >
                      <CoverPage style={template.style} />
                    </div>
                    <figcaption className="mt-4">
                      <span className="font-display text-lg font-semibold">{template.name}</span>
                      <span className="block text-sm text-muted">{template.note}</span>
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
            <Reveal>
              <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                Cheaper than one late submission.
              </h2>
            </Reveal>
            <div className="mt-14 grid max-w-4xl gap-5 md:grid-cols-2">
              <Reveal>
                <div className="flex h-full flex-col rounded-2xl border border-line bg-surface p-8">
                  <h3 className="font-display text-2xl font-semibold">Free</h3>
                  <p className="mt-1 text-muted">To try it on this week&apos;s lab</p>
                  <p className="mt-6 font-display text-5xl font-semibold tracking-tight">
                    PKR 0
                  </p>
                  <ul className="mt-7 space-y-3">
                    {["3 assignments", "All 7 languages", "Word and PDF downloads", "Classic cover page"].map(
                      (item) => (
                        <li key={item} className="flex items-center gap-2.5">
                          <Check size={17} className="text-accent" /> {item}
                        </li>
                      ),
                    )}
                  </ul>
                  <Link
                    href="/builder"
                    className="mt-9 rounded-full border border-ink py-3 text-center font-medium transition-colors hover:bg-ink hover:text-paper"
                  >
                    Start free
                  </Link>
                </div>
              </Reveal>
              <Reveal delay={0.1}>
                <div className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-ink p-8 text-paper">
                  <div
                    aria-hidden
                    className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-peach/40 blur-3xl"
                  />
                  <h3 className="relative font-display text-2xl font-semibold">Student</h3>
                  <p className="relative mt-1 opacity-70">For the whole semester</p>
                  <p className="relative mt-6 font-display text-5xl font-semibold tracking-tight">
                    PKR 300<span className="text-lg font-normal opacity-60"> / month</span>
                  </p>
                  <ul className="relative mt-7 space-y-3">
                    {[
                      "Unlimited assignments",
                      "Every cover template",
                      "Saved cover details",
                      "Faster C, C++ and Java runs",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2.5">
                        <Check size={17} className="text-peach" /> {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/builder"
                    className="relative mt-9 rounded-full bg-peach py-3 text-center font-medium text-[#241a1e] transition-transform hover:-translate-y-0.5"
                  >
                    Free during launch
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-10 text-sm text-muted sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-6 w-6" />
            <span>ZH Converter. Built by students, for students.</span>
          </div>
          <span className="font-mono text-xs">© 2026</span>
        </div>
      </footer>
    </>
  );
}

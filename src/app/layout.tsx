import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Bricolage_Grotesque, JetBrains_Mono, Onest } from "next/font/google";
import { Providers } from "@/components/providers";
import { Cursor } from "@/components/cursor";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ZH Converter — code files to assignment Word & PDF",
  description:
    "Upload your programming files. ZH Converter runs each one, captures the output, and writes the full assignment with a cover page as Word and PDF.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolage.variable} ${onest.variable} ${jetbrains.variable} antialiased`}
    >
      {/* Browser extensions (e.g. ColorZilla) add attributes to <body> before React hydrates. */}
      <body className="min-h-screen" suppressHydrationWarning>
        <Providers>
          {children}
          <Cursor />
        </Providers>
        {/* Vercel Web Analytics: counts visitors and page views on the deployed site. */}
        <Analytics />
      </body>
    </html>
  );
}

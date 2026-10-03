import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { BuilderLoader } from "@/components/builder/builder-loader";

export const metadata: Metadata = {
  title: "New assignment — ZH Converter",
};

export default function BuilderPage() {
  return (
    <>
      <Nav />
      <main>
        <BuilderLoader />
      </main>
    </>
  );
}

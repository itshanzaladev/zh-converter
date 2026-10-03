"use client";

import dynamic from "next/dynamic";

/** The builder reads saved details from the browser, so it renders on the client only. */
export const BuilderLoader = dynamic(() => import("./builder"), {
  ssr: false,
  loading: () => <div className="min-h-[70vh]" />,
});

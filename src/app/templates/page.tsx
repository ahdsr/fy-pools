import type { Metadata } from "next";
import { Suspense } from "react";

import { TemplateLibrary } from "@/components/app/template-library";

export const metadata: Metadata = {
  title: "Sports pool templates",
  description:
    "Browse available PoolWaffle sports pool templates and request early access to upcoming formats.",
  alternates: {
    canonical: "/templates",
  },
};

export default function PublicTemplatesPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-background" aria-busy="true" />}>
      <TemplateLibrary audience="public" />
    </Suspense>
  );
}

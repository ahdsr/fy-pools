"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

type AppErrorFallbackProps = {
  title?: string;
  description?: string;
  reset?: () => void;
};

export function AppErrorFallback({
  title = "This page could not load",
  description = "Try again. If the problem continues, the page data may be temporarily unavailable.",
  reset,
}: AppErrorFallbackProps) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <section className="w-full max-w-lg rounded-lg border bg-surface-paper p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full border bg-background text-destructive">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-normal text-brand-ink">
              {title}
            </h1>
            <p className="mt-2 text-sm font-normal leading-6 text-muted-foreground">
              {description}
            </p>
            {reset ? (
              <Button
                type="button"
                className="mt-5"
                variant="primaryGreen"
                onClick={reset}
              >
                <RotateCcw /> Retry
              </Button>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

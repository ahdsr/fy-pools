"use client";

import { useFormStatus } from "react-dom";
import { ArrowRight, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ProjectionPathSubmit() {
  const { pending } = useFormStatus();

  return (
    <>
      <Button type="submit" variant="secondaryGreen" disabled={pending}>
        {pending ? (
          <>
            Calculating <LoaderCircle className="animate-spin" />
          </>
        ) : (
          <>
            Show path <ArrowRight />
          </>
        )}
      </Button>
      {pending ? (
        <div
          className="absolute inset-0 z-10 grid place-items-center rounded-lg border border-cta-green/25 bg-surface-paper/90 px-3 py-3 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3 text-left">
            <LoaderCircle
              className="size-5 shrink-0 animate-spin text-brand-mark"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold text-brand-ink">
                Calculating path
              </p>
              <p className="text-xs leading-5 text-muted-foreground">
                Scoring this route across every entry.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

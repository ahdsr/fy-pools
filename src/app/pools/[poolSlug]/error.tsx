"use client";

import { useEffect } from "react";

import { AppErrorFallback } from "@/components/app/error-fallback";

export default function PublicPoolError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[fy-pools] Public pool route failed", error);
  }, [error]);

  return (
    <AppErrorFallback
      title="Pool page could not load"
      description="Retry the pool page. If it keeps failing, standings or picks may be temporarily unavailable."
      reset={reset}
    />
  );
}

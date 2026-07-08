"use client";

import { useEffect } from "react";

import { AppErrorFallback } from "@/components/app/error-fallback";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[fy-pools] Route render failed", error);
  }, [error]);

  return <AppErrorFallback reset={reset} />;
}

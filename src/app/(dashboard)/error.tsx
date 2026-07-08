"use client";

import { useEffect } from "react";

import { AppErrorFallback } from "@/components/app/error-fallback";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[fy-pools] Dashboard route failed", error);
  }, [error]);

  return (
    <AppErrorFallback
      title="Workspace data could not load"
      description="Retry the workspace. If it keeps failing, the pool database may be temporarily unavailable."
      reset={reset}
    />
  );
}

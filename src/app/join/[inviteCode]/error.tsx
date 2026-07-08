"use client";

import { useEffect } from "react";

import { AppErrorFallback } from "@/components/app/error-fallback";

export default function JoinError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[fy-pools] Join route failed", error);
  }, [error]);

  return (
    <AppErrorFallback
      title="Invite page could not load"
      description="Retry the invite. If it keeps failing, the invite may be unavailable or the pool database may be temporarily down."
      reset={reset}
    />
  );
}

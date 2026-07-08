"use client";

import "./globals.css";

import { AppErrorFallback } from "@/components/app/error-fallback";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <AppErrorFallback
          title="PoolWaffle could not recover this page"
          description="The app hit an unexpected error while loading the shell. Retry the page before continuing."
          reset={reset}
        />
      </body>
    </html>
  );
}

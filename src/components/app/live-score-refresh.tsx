"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const LIVE_REFRESH_INTERVAL_MS = 30 * 1000;
const PRE_MATCH_WINDOW_MS = 5 * 60 * 1000;
const MATCH_WINDOW_MS = 4 * 60 * 60 * 1000;
const MAX_SCHEDULE_DELAY_MS = 12 * 60 * 60 * 1000;

function isLiveScoreWindow(matchDates: string[], now = Date.now()) {
  return matchDates.some((date) => {
    const start = new Date(date).getTime();
    return (
      Number.isFinite(start) &&
      now >= start - PRE_MATCH_WINDOW_MS &&
      now < start + MATCH_WINDOW_MS
    );
  });
}

function nextMatchWindow(matchDates: string[], now = Date.now()) {
  return matchDates
    .map((date) => new Date(date).getTime() - PRE_MATCH_WINDOW_MS)
    .filter((start) => Number.isFinite(start) && start > now)
    .sort((left, right) => left - right)[0];
}

export function LiveScoreRefresh({ matchDates }: { matchDates: string[] }) {
  const router = useRouter();
  const refreshing = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const refresh = async () => {
      if (cancelled || refreshing.current || document.visibilityState !== "visible") {
        return;
      }

      refreshing.current = true;
      try {
        const response = await fetch("/api/world-cup/results/refresh-if-due", {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as {
          refreshed?: boolean;
        } | null;

        if (!cancelled && payload?.refreshed) router.refresh();
      } finally {
        refreshing.current = false;
      }
    };

    const schedule = () => {
      if (cancelled) return;

      const now = Date.now();
      if (isLiveScoreWindow(matchDates, now)) {
        void refresh();
        timeout = setTimeout(schedule, LIVE_REFRESH_INTERVAL_MS);
        return;
      }

      const nextWindow = nextMatchWindow(matchDates, now);
      if (nextWindow) {
        timeout = setTimeout(
          schedule,
          Math.min(nextWindow - now, MAX_SCHEDULE_DELAY_MS),
        );
      }
    };

    void refresh();
    schedule();

    const resume = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", resume);

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [matchDates, router]);

  return null;
}

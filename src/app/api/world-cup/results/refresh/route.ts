import type { NextRequest } from "next/server";

import {
  MARCINS_POOL_SLUG,
  recordWorldCupResultSnapshotError,
  warmMarcinsWorldCupResults,
} from "@/lib/world-cup-pool/data";

export const maxDuration = 60;

const MAX_REFRESH_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1_000;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function authorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV !== "production";

  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let refreshError: unknown;

  for (let attempt = 1; attempt <= MAX_REFRESH_ATTEMPTS; attempt += 1) {
    try {
      const pool = await warmMarcinsWorldCupResults();
      const freshness = pool.resultsFreshness;

      return Response.json({
        ok: true,
        poolSlug: pool.slug,
        fetchedAt: freshness.fetchedAt,
        source: freshness.source,
        sourceSignature: freshness.sourceSignature ?? null,
        stale: freshness.stale,
        status: freshness.status,
        attempts: attempt,
      });
    } catch (error) {
      refreshError = error;
      if (attempt < MAX_REFRESH_ATTEMPTS) await wait(RETRY_DELAY_MS);
    }
  }

  await recordWorldCupResultSnapshotError({
    poolSlug: MARCINS_POOL_SLUG,
    error: refreshError,
  });

  const message =
    refreshError instanceof Error ? refreshError.message : String(refreshError);
  return Response.json(
    {
      ok: false,
      poolSlug: MARCINS_POOL_SLUG,
      fetchedAt: null,
      source: null,
      sourceSignature: null,
      stale: true,
      status: "World Cup result refresh failed.",
      error: message,
      attempts: MAX_REFRESH_ATTEMPTS,
    },
    { status: 502 },
  );
}

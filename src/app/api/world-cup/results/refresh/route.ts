import type { NextRequest } from "next/server";

import {
  MARCINS_POOL_SLUG,
  recordWorldCupResultSnapshotError,
  warmMarcinsWorldCupResults,
} from "@/lib/world-cup-pool/data";

function authorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV !== "production";

  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

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
    });
  } catch (error) {
    await recordWorldCupResultSnapshotError({
      poolSlug: MARCINS_POOL_SLUG,
      error,
    });

    const message = error instanceof Error ? error.message : String(error);
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
      },
      { status: 502 },
    );
  }
}

import type { NextRequest } from "next/server";

import { warmMarcinsWorldCupResults } from "@/lib/world-cup-pool/data";

function authorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV !== "production";

  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const pool = await warmMarcinsWorldCupResults();

  return Response.json({
    ok: true,
    poolSlug: pool.slug,
    lastUpdated: pool.results.meta?.lastUpdated ?? null,
    status: pool.results.meta?.status ?? null,
  });
}

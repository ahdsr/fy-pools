import type { NextRequest } from "next/server";

import { syncPgaEventCatalogToDatabase } from "@/lib/events/catalog";

export const maxDuration = 60;

function authorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const result = await syncPgaEventCatalogToDatabase({
      season: request.nextUrl.searchParams.get("season") ?? undefined,
    });
    return Response.json({
      ok: true,
      provider: "espn",
      competition: "pga-tour",
      season: result.season,
      events: result.events.length,
      fetchedAt: result.fetchedAt,
      expiresAt: result.expiresAt,
      ready: result.snapshots.filter((event) => event.freshness === "ready").length,
    });
  } catch (error) {
    return Response.json({ ok: false, provider: "espn", competition: "pga-tour", error: error instanceof Error ? error.message : "PGA event catalog refresh failed." }, { status: 502 });
  }
}

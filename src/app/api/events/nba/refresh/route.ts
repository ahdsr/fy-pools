import type { NextRequest } from "next/server";

import { syncNbaPlayoffCatalogToDatabase } from "@/lib/events/catalog";

export const maxDuration = 60;

function authorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const result = await syncNbaPlayoffCatalogToDatabase({
      season: request.nextUrl.searchParams.get("season") ?? undefined,
    });
    const event = result.snapshots[0];
    return Response.json({
      ok: true,
      provider: "espn",
      season: result.season,
      events: result.events.length,
      fetchedAt: result.fetchedAt,
      readiness: event?.freshness,
      teams: event?.teams?.length ?? 0,
      series: event?.series?.length ?? 0,
    });
  } catch (error) {
    return Response.json({
      ok: false,
      provider: "espn",
      error: error instanceof Error ? error.message : "NBA event catalog refresh failed.",
    }, { status: 502 });
  }
}

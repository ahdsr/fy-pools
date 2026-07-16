import type { NextRequest } from "next/server";

import { syncF1EventCatalogToDatabase } from "@/lib/events/catalog";

export const maxDuration = 60;

function authorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const season = request.nextUrl.searchParams.get("season") ?? undefined;
  try {
    const result = await syncF1EventCatalogToDatabase({ season });
    return Response.json({
      ok: true,
      provider: "jolpica",
      season: result.season,
      events: result.events.length,
      fetchedAt: result.fetchedAt,
      expiresAt: result.expiresAt,
      readiness: result.snapshots.reduce<Record<string, number>>((summary, event) => {
        summary[event.freshness] = (summary[event.freshness] ?? 0) + 1;
        return summary;
      }, {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "F1 event catalog refresh failed.";
    return Response.json({ ok: false, provider: "jolpica", error: message }, { status: 502 });
  }
}

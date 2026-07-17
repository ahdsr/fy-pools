import type { NextRequest } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const EVENT_TYPES = new Set(["market_viewed", "eligible_prompt_viewed", "reveal_viewed"]);

export async function POST(request: NextRequest) {
  let payload: { marketId?: unknown; eventType?: unknown };
  try {
    payload = await request.json() as { marketId?: unknown; eventType?: unknown };
  } catch {
    return new Response(null, { status: 204 });
  }
  if (!isSupabaseConfigured() || typeof payload.marketId !== "string" || !EVENT_TYPES.has(String(payload.eventType))) {
    return new Response(null, { status: 204 });
  }
  try {
    const admin = createSupabaseAdminClient();
    const { data: market, error: marketError } = await admin.from("double_down_markets").select("id,pool_id").eq("id", payload.marketId).maybeSingle();
    if (marketError || !market) return new Response(null, { status: 204 });
    await admin.from("double_down_engagement_events").insert({ pool_id: market.pool_id, market_id: market.id, event_type: payload.eventType });
  } catch {
    // Engagement telemetry is intentionally non-blocking for the game UI.
  }
  return new Response(null, { status: 204 });
}

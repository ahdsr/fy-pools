"use server";

import { redirect } from "next/navigation";

import { refreshF1EventCatalogForCommissioner } from "@/lib/events/catalog";
import { parseJsonFormValue } from "@/lib/form-json";
import { publishF1RankedFinishPool, type RankedFinishInvite } from "@/lib/ranked-finish/persistence";
import type { RankedFinishSettings } from "@/lib/ranked-finish/types";

export type PublishF1State = { message?: string; published?: Awaited<ReturnType<typeof publishF1RankedFinishPool>> };
export type RefreshF1CatalogState = { message?: string; refreshedAt?: string; eventCount?: number };

export async function publishF1PoolAction(_state: PublishF1State, formData: FormData): Promise<PublishF1State> {
  try {
    const settings = parseJsonFormValue<RankedFinishSettings>(formData.get("settings"), {} as RankedFinishSettings, "Pool settings");
    const participants = parseJsonFormValue<RankedFinishInvite[]>(formData.get("participants"), [], "Participants");
    return { published: await publishF1RankedFinishPool({ settings, participants }) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "F1 pool could not be published.";
    if (message === "You must be signed in.") redirect("/sign-in?next=/dashboard/pools/new?template=f1-grand-prix-predictor");
    return { message };
  }
}

export async function refreshF1CatalogAction(_state: RefreshF1CatalogState, formData: FormData): Promise<RefreshF1CatalogState> {
  try {
    const season = String(formData.get("season") ?? "").trim() || undefined;
    const result = await refreshF1EventCatalogForCommissioner(season);
    return { refreshedAt: result.fetchedAt, eventCount: result.events.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "F1 event catalog could not be refreshed.";
    if (message === "You must be signed in.") redirect("/sign-in?next=/dashboard/pools/new?template=f1-grand-prix-predictor");
    return { message };
  }
}

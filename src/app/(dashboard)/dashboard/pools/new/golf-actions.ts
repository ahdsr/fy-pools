"use server";

import { redirect } from "next/navigation";

import { refreshPgaEventCatalogForCommissioner } from "@/lib/events/catalog";
import { parseJsonFormValue } from "@/lib/form-json";
import { publishGolfRankedFinishPool, type RankedFinishInvite } from "@/lib/ranked-finish/persistence";
import type { RankedFinishSettings } from "@/lib/ranked-finish/types";
import type { RankedFinishCatalogState, RankedFinishPublishState } from "./ranked-finish-wizard";

export type PublishGolfState = RankedFinishPublishState;
export type RefreshGolfCatalogState = RankedFinishCatalogState;

export async function publishGolfPoolAction(_state: PublishGolfState, formData: FormData): Promise<PublishGolfState> {
  try {
    const settings = parseJsonFormValue<RankedFinishSettings>(formData.get("settings"), {} as RankedFinishSettings, "Pool settings");
    const participants = parseJsonFormValue<RankedFinishInvite[]>(formData.get("participants"), [], "Participants");
    return { published: await publishGolfRankedFinishPool({ settings, participants }) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Golf pool could not be published.";
    if (message === "You must be signed in.") redirect("/sign-in?next=/dashboard/pools/new?template=golf-pga-top-five-predictor");
    return { message };
  }
}

export async function refreshGolfCatalogAction(_state: RefreshGolfCatalogState, formData: FormData): Promise<RefreshGolfCatalogState> {
  try {
    const season = String(formData.get("season") ?? "").trim() || undefined;
    const result = await refreshPgaEventCatalogForCommissioner(season);
    return { refreshedAt: result.fetchedAt, eventCount: result.events.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "PGA event catalog could not be refreshed.";
    if (message === "You must be signed in.") redirect("/sign-in?next=/dashboard/pools/new?template=golf-pga-top-five-predictor");
    return { message };
  }
}

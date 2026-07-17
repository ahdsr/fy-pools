"use server";

import { redirect } from "next/navigation";

import { parseJsonFormValue } from "@/lib/form-json";
import { refreshRankedFinishCatalog } from "@/lib/ranked-finish/catalog";
import {
  publishRankedFinishPool,
  type RankedFinishInvite,
} from "@/lib/ranked-finish/persistence";
import { getRankedFinishTemplate } from "@/lib/ranked-finish/templates";
import type { RankedFinishSettings } from "@/lib/ranked-finish/types";
import type {
  RankedFinishCatalogState,
  RankedFinishPublishState,
} from "./ranked-finish-wizard";

function signInForTemplate(templateSlug: string) {
  redirect(`/sign-in?next=/dashboard/pools/new?template=${templateSlug}`);
}

export async function publishRankedFinishPoolAction(
  templateSlug: string,
  _state: RankedFinishPublishState,
  formData: FormData,
): Promise<RankedFinishPublishState> {
  try {
    if (!getRankedFinishTemplate(templateSlug)) {
      throw new Error("Ranked-finish template is not supported.");
    }
    const settings = parseJsonFormValue<RankedFinishSettings>(
      formData.get("settings"),
      {} as RankedFinishSettings,
      "Pool settings",
    );
    const participants = parseJsonFormValue<RankedFinishInvite[]>(
      formData.get("participants"),
      [],
      "Participants",
    );
    return {
      published: await publishRankedFinishPool({
        settings,
        participants,
        templateSlug,
      }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pool could not be published.";
    if (message === "You must be signed in.") signInForTemplate(templateSlug);
    return { message };
  }
}

export async function refreshRankedFinishCatalogAction(
  templateSlug: string,
  _state: RankedFinishCatalogState,
  formData: FormData,
): Promise<RankedFinishCatalogState> {
  try {
    const season = String(formData.get("season") ?? "").trim() || undefined;
    const result = await refreshRankedFinishCatalog(templateSlug, season);
    return { refreshedAt: result.fetchedAt, eventCount: result.events.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Event catalog could not be refreshed.";
    if (message === "You must be signed in.") signInForTemplate(templateSlug);
    return { message };
  }
}

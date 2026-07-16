"use server";

import { redirect } from "next/navigation";

import { parseJsonFormValue } from "@/lib/form-json";
import { publishNbaSeriesPool } from "@/lib/nba-series/persistence";
import type { NbaSeriesInvite, NbaSeriesSettings } from "@/lib/nba-series/types";

export type PublishNbaSeriesState = {
  message?: string;
  published?: Awaited<ReturnType<typeof publishNbaSeriesPool>>;
};

export async function publishNbaSeriesPoolAction(
  _state: PublishNbaSeriesState,
  formData: FormData,
): Promise<PublishNbaSeriesState> {
  try {
    const settings = parseJsonFormValue<NbaSeriesSettings>(formData.get("settings"), {} as NbaSeriesSettings, "Pool settings");
    const participants = parseJsonFormValue<NbaSeriesInvite[]>(formData.get("participants"), [], "Participants");
    return { published: await publishNbaSeriesPool({ settings, participants }) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "NBA pool could not be published.";
    if (message === "You must be signed in.") redirect("/sign-in?next=/dashboard/pools/new?template=nba-series-bracket");
    return { message };
  }
}

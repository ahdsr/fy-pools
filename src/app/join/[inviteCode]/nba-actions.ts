"use server";

import { redirect } from "next/navigation";

import { parseJsonFormValue } from "@/lib/form-json";
import { submitNbaSeriesPicks } from "@/lib/nba-series/persistence";
import type { NbaSeriesPickPayload } from "@/lib/nba-series/types";

export type SubmitNbaSeriesState = { message?: string; submitted?: Awaited<ReturnType<typeof submitNbaSeriesPicks>> };

export async function submitNbaSeriesPicksAction(_state: SubmitNbaSeriesState, formData: FormData): Promise<SubmitNbaSeriesState> {
  const inviteCode = String(formData.get("inviteCode") ?? "");
  try { return { submitted: await submitNbaSeriesPicks({ inviteCode, payload: parseJsonFormValue<NbaSeriesPickPayload>(formData.get("payload"), { series: {} }, "Pick") }) }; }
  catch (error) { const message = error instanceof Error ? error.message : "Picks could not be submitted."; if (message === "You must be signed in.") redirect(`/sign-in?next=/join/${encodeURIComponent(inviteCode)}`); return { message }; }
}

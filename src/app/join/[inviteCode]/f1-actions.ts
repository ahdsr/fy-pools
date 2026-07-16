"use server";

import { redirect } from "next/navigation";

import { parseJsonFormValue } from "@/lib/form-json";
import { submitF1RankedFinishPicks } from "@/lib/ranked-finish/persistence";
import type { RankedFinishPickPayload } from "@/lib/ranked-finish/types";

export type SubmitF1PicksState = { message?: string; submitted?: Awaited<ReturnType<typeof submitF1RankedFinishPicks>> };
export async function submitF1PicksAction(_state: SubmitF1PicksState, formData: FormData): Promise<SubmitF1PicksState> {
  const inviteCode = String(formData.get("inviteCode") ?? "");
  try { return { submitted: await submitF1RankedFinishPicks({ inviteCode, payload: parseJsonFormValue<RankedFinishPickPayload>(formData.get("payload"), { markets: {} }, "Pick") }) }; }
  catch (error) { const message = error instanceof Error ? error.message : "Picks could not be submitted."; if (message === "You must be signed in.") redirect(`/sign-in?next=/join/${encodeURIComponent(inviteCode)}`); return { message }; }
}

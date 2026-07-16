"use server";

import { redirect } from "next/navigation";

import { parseJsonFormValue } from "@/lib/form-json";
import { submitGolfRankedFinishPicks } from "@/lib/ranked-finish/persistence";
import type { RankedFinishPickPayload } from "@/lib/ranked-finish/types";

export type SubmitGolfPicksState = { message?: string; submitted?: Awaited<ReturnType<typeof submitGolfRankedFinishPicks>> };

export async function submitGolfPicksAction(_state: SubmitGolfPicksState, formData: FormData): Promise<SubmitGolfPicksState> {
  const inviteCode = String(formData.get("inviteCode") ?? "");
  try {
    return { submitted: await submitGolfRankedFinishPicks({ inviteCode, payload: parseJsonFormValue<RankedFinishPickPayload>(formData.get("payload"), { markets: {} }, "Pick") }) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Picks could not be submitted.";
    if (message === "You must be signed in.") redirect(`/sign-in?next=/join/${encodeURIComponent(inviteCode)}`);
    return { message };
  }
}

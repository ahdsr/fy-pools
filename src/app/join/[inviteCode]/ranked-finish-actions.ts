"use server";

import { parseJsonFormValue } from "@/lib/form-json";
import { submitRankedFinishPicks } from "@/lib/ranked-finish/persistence";
import type { RankedFinishPickPayload } from "@/lib/ranked-finish/types";
import type { RankedFinishPickState } from "./ranked-finish-pick-form";

export async function submitRankedFinishPicksAction(
  templateSlug: string,
  _state: RankedFinishPickState,
  formData: FormData,
): Promise<RankedFinishPickState> {
  try {
    const inviteCode = String(formData.get("inviteCode") ?? "");
    const payload = parseJsonFormValue<RankedFinishPickPayload>(
      formData.get("payload"),
      { markets: {} },
      "Pick",
    );
    return { submitted: await submitRankedFinishPicks({ inviteCode, payload, templateSlug }) };
  } catch (error) {
    return { message: error instanceof Error ? error.message : "Picks could not be saved." };
  }
}

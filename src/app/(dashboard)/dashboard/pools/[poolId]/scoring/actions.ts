"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  refreshRoundOf16Scoring,
  type RoundOf16StoredLeaderboardRow,
} from "@/lib/round-of-16/persistence";
import type { RoundOf16ResultPayload } from "@/lib/round-of-16/scoring";

export type RefreshRoundOf16ScoringState = {
  message?: string;
  rows?: RoundOf16StoredLeaderboardRow[];
  calculatedAt?: string;
};

export async function refreshRoundOf16ScoringAction(
  _state: RefreshRoundOf16ScoringState,
  formData: FormData,
): Promise<RefreshRoundOf16ScoringState> {
  const poolId = String(formData.get("poolId") ?? "");
  const results: RoundOf16ResultPayload = {
    winners: {},
    bonusAnswers: {},
  };

  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") continue;
    if (key.startsWith("winner:")) {
      results.winners[key.slice("winner:".length)] = value;
    }
    if (key.startsWith("bonus:")) {
      results.bonusAnswers[key.slice("bonus:".length)] = value;
    }
  }

  let authRedirectPath = "";
  let errorMessage = "";

  try {
    const rows = await refreshRoundOf16Scoring({ poolId, results });
    revalidatePath(`/dashboard/pools/${poolId}/scoring`);

    return {
      rows,
      calculatedAt: new Date().toISOString(),
    };
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Scoring could not be refreshed.";

    if (errorMessage === "You must be signed in.") {
      authRedirectPath = `/sign-in?next=/dashboard/pools/${encodeURIComponent(
        poolId,
      )}/scoring`;
    }
  }

  if (authRedirectPath) redirect(authRedirectPath);

  return { message: errorMessage };
}

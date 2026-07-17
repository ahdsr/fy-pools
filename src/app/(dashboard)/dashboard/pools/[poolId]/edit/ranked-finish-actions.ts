"use server";

import { revalidatePath } from "next/cache";

import { parseJsonFormValue } from "@/lib/form-json";
import {
  recordRankedFinishPoolResult,
  resetRankedFinishPoolResults,
  updateRankedFinishPoolBasics,
} from "@/lib/ranked-finish/persistence";
import type { RankedFinishResultState } from "./ranked-finish-commissioner";
import type { PoolDetailsState } from "@/components/app/pool-details-editor";

export async function updateRankedFinishPoolDetailsAction(templateSlug: string, _state: PoolDetailsState, formData: FormData): Promise<PoolDetailsState> {
  try {
    const poolId = String(formData.get("poolId") ?? "");
    await updateRankedFinishPoolBasics({ poolId, templateSlug, basics: { poolName: String(formData.get("poolName") ?? ""), commissionerName: String(formData.get("commissionerName") ?? ""), description: String(formData.get("description") ?? "") } });
    return { saved: true };
  } catch (error) {
    return { message: error instanceof Error ? error.message : "Pool details could not be saved." };
  }
}

export async function recordRankedFinishResultAction(
  templateSlug: string,
  _state: RankedFinishResultState,
  formData: FormData,
): Promise<RankedFinishResultState> {
  try {
    const poolId = String(formData.get("poolId") ?? "");
    const result = parseJsonFormValue<{ marketId: string; competitorId: string }>(
      formData.get("result"),
      {} as { marketId: string; competitorId: string },
      "Result",
    );
    await recordRankedFinishPoolResult({ poolId, templateSlug, ...result });
    revalidatePath(`/dashboard/pools/${poolId}/edit`);
    return { completed: `${result.marketId}:${result.competitorId}` };
  } catch (error) {
    return { message: error instanceof Error ? error.message : "Result could not be saved." };
  }
}

export async function resetRankedFinishResultsAction(
  templateSlug: string,
  _state: RankedFinishResultState,
  formData: FormData,
): Promise<RankedFinishResultState> {
  try {
    const poolId = String(formData.get("poolId") ?? "");
    await resetRankedFinishPoolResults(poolId, templateSlug);
    revalidatePath(`/dashboard/pools/${poolId}/edit`);
    return { completed: "reset" };
  } catch (error) {
    return { message: error instanceof Error ? error.message : "Results could not be reset." };
  }
}

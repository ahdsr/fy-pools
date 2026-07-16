"use server";

import { revalidatePath } from "next/cache";

import { parseJsonFormValue } from "@/lib/form-json";
import { recordGolfResult, resetGolfResults } from "@/lib/ranked-finish/persistence";
import type { RankedFinishResultState } from "./ranked-finish-commissioner";

export type GolfResultState = RankedFinishResultState;
export async function recordGolfResultAction(_state: GolfResultState, formData: FormData): Promise<GolfResultState> {
  try { const poolId = String(formData.get("poolId") ?? ""); const result = parseJsonFormValue<{ marketId: string; competitorId: string }>(formData.get("result"), {} as { marketId: string; competitorId: string }, "Result"); await recordGolfResult({ poolId, ...result }); revalidatePath(`/dashboard/pools/${poolId}/edit`); return { completed: `${result.marketId}:${result.competitorId}` }; }
  catch (error) { return { message: error instanceof Error ? error.message : "Result could not be saved." }; }
}
export async function resetGolfResultsAction(_state: GolfResultState, formData: FormData): Promise<GolfResultState> {
  try { const poolId = String(formData.get("poolId") ?? ""); await resetGolfResults(poolId); revalidatePath(`/dashboard/pools/${poolId}/edit`); return { completed: "reset" }; }
  catch (error) { return { message: error instanceof Error ? error.message : "Results could not be reset." }; }
}

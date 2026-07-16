"use server";

import { revalidatePath } from "next/cache";
import { parseJsonFormValue } from "@/lib/form-json";
import { recordF1Result, resetF1Results } from "@/lib/ranked-finish/persistence";

export type F1ResultState = { message?: string; completed?: string };
export async function recordF1ResultAction(_state: F1ResultState, formData: FormData): Promise<F1ResultState> {
  try { const poolId = String(formData.get("poolId") ?? ""); const result = parseJsonFormValue<{ marketId: string; competitorId: string }>(formData.get("result"), {} as { marketId: string; competitorId: string }, "Result"); await recordF1Result({ poolId, ...result }); revalidatePath(`/dashboard/pools/${poolId}/edit`); return { completed: `${result.marketId}:${result.competitorId}` }; }
  catch (error) { return { message: error instanceof Error ? error.message : "Result could not be saved." }; }
}
export async function resetF1ResultsAction(_state: F1ResultState, formData: FormData): Promise<F1ResultState> {
  try { const poolId = String(formData.get("poolId") ?? ""); await resetF1Results(poolId); revalidatePath(`/dashboard/pools/${poolId}/edit`); return { completed: "reset" }; }
  catch (error) { return { message: error instanceof Error ? error.message : "Results could not be reset." }; }
}

"use server";

import { revalidatePath } from "next/cache";
import { parseJsonFormValue } from "@/lib/form-json";
import {
  refreshNbaSeriesScoring,
  resetNbaSeriesSimulation,
  updateNbaSeriesPoolBasics,
} from "@/lib/nba-series/persistence";
import type { PoolDetailsState } from "@/components/app/pool-details-editor";

export type SimulateNbaSeriesState = { message?: string; completed?: string };

export async function updateNbaSeriesPoolDetailsAction(_state: PoolDetailsState, formData: FormData): Promise<PoolDetailsState> {
  try {
    const poolId = String(formData.get("poolId") ?? "");
    await updateNbaSeriesPoolBasics({ poolId, basics: { poolName: String(formData.get("poolName") ?? ""), commissionerName: String(formData.get("commissionerName") ?? ""), description: String(formData.get("description") ?? "") } });
    return { saved: true };
  } catch (error) {
    return { message: error instanceof Error ? error.message : "Pool details could not be saved." };
  }
}

export async function simulateNbaSeriesAction(_state: SimulateNbaSeriesState, formData: FormData): Promise<SimulateNbaSeriesState> {
  try {
    const poolId = String(formData.get("poolId") ?? "");
    const result = parseJsonFormValue<{ seriesId: string; winner: string; winnerWins: number; loserWins: number }>(formData.get("result"), {} as { seriesId: string; winner: string; winnerWins: number; loserWins: number }, "Series result");
    await refreshNbaSeriesScoring({ poolId, result });
    revalidatePath(`/dashboard/pools/${poolId}/edit`);
    return { completed: result.seriesId };
  } catch (error) { return { message: error instanceof Error ? error.message : "Series could not be simulated." }; }
}

export async function resetNbaSeriesSimulationAction(
  _state: SimulateNbaSeriesState,
  formData: FormData,
): Promise<SimulateNbaSeriesState> {
  try {
    const poolId = String(formData.get("poolId") ?? "");
    await resetNbaSeriesSimulation(poolId);
    revalidatePath(`/dashboard/pools/${poolId}/edit`);
    return { completed: "reset" };
  } catch (error) {
    return {
      message:
        error instanceof Error ? error.message : "Simulation could not be reset.",
    };
  }
}

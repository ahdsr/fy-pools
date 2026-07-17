"use server";

import { placeDoubleDownCall } from "@/lib/double-down/persistence";

export type DoubleDownCallState = { message?: string; committed?: boolean };

export async function placeDoubleDownCallAction(
  poolSlug: string,
  _state: DoubleDownCallState,
  formData: FormData,
): Promise<DoubleDownCallState> {
  try {
    await placeDoubleDownCall({
      poolSlug,
      marketId: String(formData.get("marketId") ?? ""),
      outcome: String(formData.get("outcome") ?? ""),
    });
    return { committed: true };
  } catch (error) {
    return { message: error instanceof Error ? error.message : "Your Double Down call could not be placed." };
  }
}

"use server";

import { setDoubleDownEnabled } from "@/lib/double-down/persistence";

export type SetDoubleDownEnabledState = { message?: string };

export async function setDoubleDownEnabledAction(
  _state: SetDoubleDownEnabledState,
  formData: FormData,
): Promise<SetDoubleDownEnabledState> {
  try {
    await setDoubleDownEnabled({
      poolId: String(formData.get("poolId") ?? ""),
      enabled: String(formData.get("enabled") ?? "") === "true",
    });
    return {};
  } catch (error) {
    return { message: error instanceof Error ? error.message : "Double Down could not be updated." };
  }
}

export async function setDoubleDownEnabledFormAction(formData: FormData) {
  await setDoubleDownEnabled({
    poolId: String(formData.get("poolId") ?? ""),
    enabled: String(formData.get("enabled") ?? "") === "true",
  });
}

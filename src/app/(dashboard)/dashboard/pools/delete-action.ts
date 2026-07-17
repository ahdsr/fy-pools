"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { deleteCommissionerPool } from "@/lib/round-of-16/persistence";

export type ConfirmDeletePoolState = { message?: string };

export async function confirmDeletePoolAction(
  _state: ConfirmDeletePoolState,
  formData: FormData,
): Promise<ConfirmDeletePoolState> {
  const poolId = String(formData.get("poolId") ?? "");

  try {
    const deleted = await deleteCommissionerPool(poolId);
    revalidatePath("/dashboard");
    revalidatePath(`/pools/${deleted.poolSlug}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pool could not be deleted.";
    if (message === "You must be signed in.") redirect("/sign-in?next=/dashboard");
    return { message };
  }

  redirect("/dashboard");
}

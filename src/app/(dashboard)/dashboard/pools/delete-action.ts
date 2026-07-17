"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  archiveCommissionerPool,
  deleteCommissionerPool,
  restoreCommissionerPool,
} from "@/lib/round-of-16/persistence";

export type ConfirmDeletePoolState = { message?: string };
export type PoolLifecycleState = { message?: string };

function revalidatePoolLifecycle(poolSlug: string) {
  revalidatePath("/dashboard");
  revalidatePath(`/pools/${poolSlug}`);
  revalidatePath(`/pools/${poolSlug}/leaderboard`);
  revalidatePath("/join/[inviteCode]", "page");
}

export async function confirmDeletePoolAction(
  _state: ConfirmDeletePoolState,
  formData: FormData,
): Promise<ConfirmDeletePoolState> {
  const poolId = String(formData.get("poolId") ?? "");
  const confirmationPoolName = String(formData.get("confirmationPoolName") ?? "");

  try {
    const deleted = await deleteCommissionerPool(poolId, confirmationPoolName);
    revalidatePoolLifecycle(deleted.poolSlug);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pool could not be deleted.";
    if (message === "You must be signed in.") redirect("/sign-in?next=/dashboard");
    return { message };
  }

  redirect("/dashboard");
}

export async function archivePoolAction(
  _state: PoolLifecycleState,
  formData: FormData,
): Promise<PoolLifecycleState> {
  const poolId = String(formData.get("poolId") ?? "");

  try {
    const archived = await archiveCommissionerPool(poolId);
    revalidatePoolLifecycle(archived.poolSlug);
    return {};
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pool could not be archived.";
    if (message === "You must be signed in.") redirect("/sign-in?next=/dashboard");
    return { message };
  }
}

export async function restorePoolAction(
  _state: PoolLifecycleState,
  formData: FormData,
): Promise<PoolLifecycleState> {
  const poolId = String(formData.get("poolId") ?? "");

  try {
    const restored = await restoreCommissionerPool(poolId);
    revalidatePoolLifecycle(restored.poolSlug);
    return {};
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pool could not be restored.";
    if (message === "You must be signed in.") redirect("/sign-in?next=/dashboard");
    return { message };
  }
}

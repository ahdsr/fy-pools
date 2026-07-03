"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  deleteCommissionerPool,
  updateCommissionerRoundOf16AdminPool,
} from "@/lib/round-of-16/persistence";
import type { RoundOf16PoolSettings } from "@/lib/templates/round-of-16-draft";

export type UpdatePoolAdminState = {
  message?: string;
};

export async function updatePoolAdminAction(
  _state: UpdatePoolAdminState,
  formData: FormData,
): Promise<UpdatePoolAdminState> {
  const poolId = String(formData.get("poolId") ?? "");
  const status = String(formData.get("status") ?? "open");
  const basics: RoundOf16PoolSettings["basics"] = {
    poolName: String(formData.get("poolName") ?? ""),
    commissionerName: String(formData.get("commissionerName") ?? ""),
    eventLabel: String(formData.get("eventLabel") ?? ""),
    picksLockAt: String(formData.get("picksLockAt") ?? ""),
    timezone: String(formData.get("timezone") ?? ""),
    description: String(formData.get("description") ?? ""),
  };
  const inviteNote = String(formData.get("inviteNote") ?? "");
  let redirectPath = "";

  try {
    const updated = await updateCommissionerRoundOf16AdminPool({
      poolId,
      status,
      basics,
      inviteNote,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/pools");
    revalidatePath(`/dashboard/pools/${poolId}/edit`);
    revalidatePath(`/pools/${updated.poolSlug}`);
    redirectPath = "/dashboard/pools";
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Pool could not be updated.";

    if (message === "You must be signed in.") {
      redirectPath = `/sign-in?next=/dashboard/pools/${encodeURIComponent(
        poolId,
      )}/edit`;
    } else {
      return { message };
    }
  }

  if (redirectPath) redirect(redirectPath);

  return {};
}

export async function deletePoolAction(formData: FormData) {
  const poolId = String(formData.get("poolId") ?? "");
  let redirectPath = "";

  try {
    const deleted = await deleteCommissionerPool(poolId);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/pools");
    revalidatePath(`/pools/${deleted.poolSlug}`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Pool could not be deleted.";

    if (message === "You must be signed in.") {
      redirectPath = "/sign-in?next=/dashboard/pools";
    } else {
      throw error;
    }
  }

  if (redirectPath) redirect(redirectPath);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { refreshF1EventCatalogForCommissioner } from "@/lib/events/catalog";

export type RefreshF1CatalogState = {
  message?: string;
  refreshedAt?: string;
  count?: number;
};

export async function refreshF1CatalogAction(
  _state: RefreshF1CatalogState,
  formData: FormData,
): Promise<RefreshF1CatalogState> {
  try {
    const season = String(formData.get("season") ?? "").trim() || undefined;
    const result = await refreshF1EventCatalogForCommissioner(season);
    revalidatePath("/dashboard/events");
    return {
      refreshedAt: result.fetchedAt,
      count: result.events.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "F1 event catalog could not be refreshed.";
    if (message === "You must be signed in.") redirect("/sign-in?next=/dashboard/events");
    return { message };
  }
}

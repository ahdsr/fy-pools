"use server";

import { redirect } from "next/navigation";

import { publishRoundOf16Pool } from "@/lib/round-of-16/persistence";
import type {
  RoundOf16InviteInput,
  RoundOf16PoolSettings,
} from "@/lib/templates/round-of-16-draft";

export type PublishRoundOf16State = {
  message?: string;
  published?: Awaited<ReturnType<typeof publishRoundOf16Pool>>;
};

export async function publishRoundOf16PoolAction(
  _state: PublishRoundOf16State,
  formData: FormData,
): Promise<PublishRoundOf16State> {
  try {
    const settings = JSON.parse(
      String(formData.get("settings") ?? "{}"),
    ) as RoundOf16PoolSettings;
    const participants = JSON.parse(
      String(formData.get("participants") ?? "[]"),
    ) as RoundOf16InviteInput[];
    const published = await publishRoundOf16Pool({ settings, participants });

    return { published };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Pool could not be published.";

    if (message === "You must be signed in.") {
      redirect("/sign-in?next=/dashboard/pools/new");
    }

    return { message };
  }
}

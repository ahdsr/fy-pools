"use server";

import { redirect } from "next/navigation";

import { submitRoundOf16Picks } from "@/lib/round-of-16/persistence";
import type {
  RoundOf16PickPayload,
  RoundOf16SubmittedEntry,
} from "@/lib/templates/round-of-16-draft";

export type SubmitRoundOf16PicksState = {
  message?: string;
  submitted?: RoundOf16SubmittedEntry;
};

export async function submitRoundOf16PicksAction(
  _state: SubmitRoundOf16PicksState,
  formData: FormData,
): Promise<SubmitRoundOf16PicksState> {
  const inviteCode = String(formData.get("inviteCode") ?? "");

  try {
    const payload = JSON.parse(
      String(formData.get("payload") ?? "{}"),
    ) as RoundOf16PickPayload;
    const submitted = await submitRoundOf16Picks({ inviteCode, payload });

    return { submitted };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Picks could not be submitted.";

    if (message === "You must be signed in.") {
      redirect(`/sign-in?next=/join/${encodeURIComponent(inviteCode)}`);
    }

    return { message };
  }
}

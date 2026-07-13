"use server";

import { redirect } from "next/navigation";

import {
  RoundOf16DuplicateEmailError,
  submitRoundOf16Picks,
  submitRoundOf16TestPicks,
} from "@/lib/round-of-16/persistence";
import { parseJsonFormValue } from "@/lib/form-json";
import type {
  RoundOf16PickPayload,
  RoundOf16SubmittedEntry,
} from "@/lib/templates/round-of-16-draft";

export type SubmitRoundOf16PicksState = {
  message?: string;
  duplicateEmail?: string;
  duplicateEmailClaimed?: boolean;
  submitted?: RoundOf16SubmittedEntry;
};

export async function submitRoundOf16PicksAction(
  _state: SubmitRoundOf16PicksState,
  formData: FormData,
): Promise<SubmitRoundOf16PicksState> {
  const inviteCode = String(formData.get("inviteCode") ?? "");

  try {
    const payload = parseJsonFormValue<RoundOf16PickPayload>(
      formData.get("payload"),
      { winners: {}, bonusAnswers: {} },
      "Pick",
    );
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

export async function submitRoundOf16TestPicksAction(
  _state: SubmitRoundOf16PicksState,
  formData: FormData,
): Promise<SubmitRoundOf16PicksState> {
  if (process.env.NODE_ENV !== "development") {
    return { message: "Test entries are only available in local development." };
  }

  const inviteCode = String(formData.get("inviteCode") ?? "");

  try {
    const payload = parseJsonFormValue<RoundOf16PickPayload>(
      formData.get("payload"),
      { winners: {}, bonusAnswers: {} },
      "Pick",
    );
    const submitted = await submitRoundOf16TestPicks({
      inviteCode,
      displayName: String(formData.get("displayName") ?? ""),
      email: String(formData.get("email") ?? ""),
      payload,
    });

    return { submitted };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Test picks could not be submitted.";

    if (error instanceof RoundOf16DuplicateEmailError) {
      return {
        message,
        duplicateEmail: error.email,
        duplicateEmailClaimed: error.claimed,
      };
    }

    return { message };
  }
}

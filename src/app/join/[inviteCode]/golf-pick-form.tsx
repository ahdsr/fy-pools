import { RankedFinishPickForm } from "./ranked-finish-pick-form";
import type { RankedFinishPickPayload, RankedFinishSettings } from "@/lib/ranked-finish/types";
import { submitGolfPicksAction } from "./golf-actions";

export function GolfPickForm(props: { inviteCode: string; poolSlug: string; settings: RankedFinishSettings; initialPayload?: RankedFinishPickPayload; existingSubmittedAt?: string }) {
  return <RankedFinishPickForm {...props} title="Your PGA Tour predictions" lockLabel="before the first tee time" competitorNoun="golfer" submitAction={submitGolfPicksAction} />;
}

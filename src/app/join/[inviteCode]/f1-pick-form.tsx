import { RankedFinishPickForm } from "./ranked-finish-pick-form";
import type { RankedFinishPickPayload, RankedFinishSettings } from "@/lib/ranked-finish/types";
import { submitF1PicksAction } from "./f1-actions";

export function F1PickForm(props: { inviteCode: string; poolSlug: string; settings: RankedFinishSettings; initialPayload?: RankedFinishPickPayload; existingSubmittedAt?: string }) {
  return <RankedFinishPickForm {...props} title="Your Grand Prix predictions" lockLabel="before qualifying" competitorNoun="driver" submitAction={submitF1PicksAction} />;
}

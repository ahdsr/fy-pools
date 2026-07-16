import { RankedFinishCommissioner } from "./ranked-finish-commissioner";
import { recordF1ResultAction, resetF1ResultsAction } from "./f1-actions";
import type { RankedFinishSettings } from "@/lib/ranked-finish/types";

export function F1Commissioner({ poolId, poolName, settings }: { poolId: string; poolName: string; settings: RankedFinishSettings }) {
  return <RankedFinishCommissioner poolId={poolId} poolName={poolName} settings={settings} participantNoun="driver" recordAction={recordF1ResultAction} resetAction={resetF1ResultsAction} />;
}

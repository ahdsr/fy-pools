import { RankedFinishCommissioner } from "./ranked-finish-commissioner";
import { recordGolfResultAction, resetGolfResultsAction } from "./golf-actions";
import type { RankedFinishSettings } from "@/lib/ranked-finish/types";

export function GolfCommissioner({ poolId, poolName, settings }: { poolId: string; poolName: string; settings: RankedFinishSettings }) {
  return <RankedFinishCommissioner poolId={poolId} poolName={poolName} settings={settings} participantNoun="golfer" recordAction={recordGolfResultAction} resetAction={resetGolfResultsAction} />;
}

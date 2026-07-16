import { RankedFinishLeaderboard, RankedFinishPublicPanels } from "@/components/app/ranked-finish-public-panels";
import type { GolfPublicPool } from "@/lib/ranked-finish/persistence";

export function GolfPublicPanels({ pool }: { pool: GolfPublicPool }) { return <RankedFinishPublicPanels pool={pool} participantNoun="golfer" />; }
export function GolfLeaderboard({ pool }: { pool: GolfPublicPool }) { return <RankedFinishLeaderboard pool={pool} participantNoun="golfer" />; }

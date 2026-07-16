import { RankedFinishLeaderboard, RankedFinishPublicPanels } from "@/components/app/ranked-finish-public-panels";
import type { F1PublicPool } from "@/lib/ranked-finish/persistence";

export function F1PublicPanels({ pool }: { pool: F1PublicPool }) { return <RankedFinishPublicPanels pool={pool} participantNoun="driver" />; }
export function F1Leaderboard({ pool }: { pool: F1PublicPool }) { return <RankedFinishLeaderboard pool={pool} participantNoun="driver" />; }

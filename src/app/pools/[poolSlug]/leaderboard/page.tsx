import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { PublicPoolShell } from "@/components/app/public-pool-shell";
import { RoundOf16Leaderboard } from "@/components/app/round-of-16-public-panels";
import { getPublicRoundOf16Pool } from "@/lib/round-of-16/public";
import { getPublicNbaSeriesPool } from "@/lib/nba-series/persistence";
import { NbaSeriesLeaderboard } from "@/components/app/nba-series-public-panels";
import { getPublicRankedFinishPool } from "@/lib/ranked-finish/persistence";
import { RankedFinishLeaderboard } from "@/components/app/ranked-finish-public-panels";
import { getPoolRuntimeTargetBySlug } from "@/lib/templates/runtime-dispatch";
import { formatDateTime } from "@/lib/world-cup-pool/data";

export const metadata: Metadata = {
  title: "Pool standings",
  description:
    "See the latest recorded standings and scores for this private sports pool.",
};

type LeaderboardPageProps = {
  params: Promise<{ poolSlug: string }>;
};

export default async function LeaderboardPage({ params }: LeaderboardPageProps) {
  const { poolSlug } = await params;
  const target = await getPoolRuntimeTargetBySlug(poolSlug);
  if (target?.runtime === "nba-series") {
    const pool = await getPublicNbaSeriesPool(poolSlug);
    if (pool) return <PublicPoolShell poolName={pool.poolName} eyebrow="Leaderboard" title={`${pool.poolName} standings`} description="Standings update after each simulated series result."><NbaSeriesLeaderboard pool={pool} /></PublicPoolShell>;
  }
  if (target?.runtime === "ranked-finish") {
    const pool = await getPublicRankedFinishPool(poolSlug, target.templateSlug);
    if (pool) return <PublicPoolShell poolName={pool.poolName} eyebrow="Leaderboard" title={`${pool.poolName} standings`} description="Standings update after each recorded position."><RankedFinishLeaderboard pool={pool} participantNoun={target.competitorNoun} /></PublicPoolShell>;
  }
  const roundOf16Pool = await getPublicRoundOf16Pool(poolSlug, {
    includeViewer: false,
  });

  if (!roundOf16Pool) redirect(`/pools/${poolSlug}`);

  return (
    <PublicPoolShell
      poolName={roundOf16Pool.poolName}
      eyebrow="Leaderboard"
      title={`${roundOf16Pool.poolName} standings`}
      description="Latest stored standings snapshot from automatic scoring."
      scoreRefreshLabel={
        roundOf16Pool.latestStandingsCalculatedAt
          ? formatDateTime(roundOf16Pool.latestStandingsCalculatedAt)
          : undefined
      }
    >
      <RoundOf16Leaderboard
        rows={roundOf16Pool.latestStandings}
        entries={roundOf16Pool.entries}
        poolSlug={roundOf16Pool.poolSlug}
      />
    </PublicPoolShell>
  );
}

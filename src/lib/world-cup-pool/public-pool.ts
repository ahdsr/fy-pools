import "server-only";

import { cache } from "react";

import { buildPickedBracketView } from "@/lib/world-cup-pool/bracket";
import { buildLeaderboardRows, buildPoolAnalytics } from "@/lib/world-cup-pool/leaderboard";
import { getPublicPool } from "@/lib/world-cup-pool/data";
import { scorePool } from "@/lib/world-cup-pool/scoring";
import type { PoolFixture } from "@/lib/world-cup-pool/types";

export const getPublicPoolSnapshot = cache(async (poolSlug: string) => {
  return getPublicPool(poolSlug);
});

async function buildPublicPoolStandingsSnapshot(pool: PoolFixture) {
  const rows = buildLeaderboardRows(
    pool.entriesConfig,
    pool.picksByPath,
    pool.results,
  );
  const analytics = buildPoolAnalytics(
    pool.entriesConfig,
    pool.picksByPath,
    pool.results,
    rows,
  );

  return {
    pool,
    rows,
    analytics,
    publicSlug: pool.slug,
  };
}

export const getPublicPoolStandingsSnapshot = cache(async (poolSlug: string) => {
  const pool = await getPublicPoolSnapshot(poolSlug);
  if (!pool) return null;

  return buildPublicPoolStandingsSnapshot(pool);
});

export async function getPublicPoolStandings(poolSlug: string) {
  return getPublicPoolStandingsSnapshot(poolSlug);
}

export const getEntryAnalysisSnapshot = cache(
  async (poolSlug: string, entryId: string) => {
    const standings = await getPublicPoolStandingsSnapshot(poolSlug);
    if (!standings) return null;

    const { pool, rows: leaderboardRows, analytics } = standings;
    const entry = pool.entriesConfig.entries.find((item) => item.id === entryId);
    if (!entry?.picksPath) return null;

    const picks = pool.picksByPath.get(entry.picksPath);
    if (!picks) return null;

    const entryRow = leaderboardRows.find((row) => row.id === entry.id);
    const score = entryRow?.score ?? scorePool(picks, pool.results);
    const submittedBracket = buildPickedBracketView(picks);

    return {
      pool,
      entry,
      picks,
      leaderboardRows,
      analytics,
      entryRow,
      score,
      submittedBracket,
      publicSlug: pool.slug,
    };
  },
);

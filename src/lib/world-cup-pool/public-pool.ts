import "server-only";

import { buildLeaderboardRows, buildPoolAnalytics } from "@/lib/world-cup-pool/leaderboard";
import { startLocalResultsJob } from "@/lib/world-cup-pool/local-results-job";
import { getPublicPool } from "@/lib/world-cup-pool/data";

export async function getPublicPoolStandings(poolSlug: string) {
  startLocalResultsJob();

  const pool = await getPublicPool(poolSlug);
  if (!pool) return null;

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

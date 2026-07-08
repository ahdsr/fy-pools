import { describe, expect, it } from "vitest";

import { MARCINS_POOL_SLUG } from "@/lib/world-cup-pool/data";
import { buildLeaderboardRows, buildPoolAnalytics } from "@/lib/world-cup-pool/leaderboard";
import { findEntryScenarioProjection } from "@/lib/world-cup-pool/opponent-paths";
import {
  getEntryAnalysisSnapshot,
  getPublicPoolStandingsSnapshot,
} from "@/lib/world-cup-pool/public-pool";

describe("public pool snapshots", () => {
  it("matches direct leaderboard and analytics calculations", async () => {
    const standings = await getPublicPoolStandingsSnapshot(MARCINS_POOL_SLUG);

    expect(standings).not.toBeNull();
    if (!standings) return;

    const directRows = buildLeaderboardRows(
      standings.pool.entriesConfig,
      standings.pool.picksByPath,
      standings.pool.results,
    );
    const directAnalytics = buildPoolAnalytics(
      standings.pool.entriesConfig,
      standings.pool.picksByPath,
      standings.pool.results,
      directRows,
    );

    expect(standings.rows.map((row) => [row.id, row.rank, row.score.total])).toEqual(
      directRows.map((row) => [row.id, row.rank, row.score.total]),
    );
    expect(standings.analytics.rows.map((row) => [row.id, row.maxPossible])).toEqual(
      directAnalytics.rows.map((row) => [row.id, row.maxPossible]),
    );
  });

  it("reuses standings data for entry scenario projections", async () => {
    const standings = await getPublicPoolStandingsSnapshot(MARCINS_POOL_SLUG);
    const entryId = standings?.rows.find((row) => row.picksPath)?.id;

    expect(entryId).toBeTruthy();
    if (!standings || !entryId) return;

    const entrySnapshot = await getEntryAnalysisSnapshot(MARCINS_POOL_SLUG, entryId);
    expect(entrySnapshot?.entry.id).toBe(entryId);

    const projection = findEntryScenarioProjection({
      entriesConfig: standings.pool.entriesConfig,
      picksByPath: standings.pool.picksByPath,
      results: standings.pool.results,
      entryId,
      maxEvents: 3,
      candidateLimit: 6,
    });
    const snapshotProjection = findEntryScenarioProjection({
      entriesConfig: entrySnapshot!.pool.entriesConfig,
      picksByPath: entrySnapshot!.pool.picksByPath,
      results: entrySnapshot!.pool.results,
      entryId,
      maxEvents: 3,
      candidateLimit: 6,
    });

    expect(snapshotProjection?.projectedRank).toBe(projection?.projectedRank);
    expect(snapshotProjection?.projectedTotal).toBe(projection?.projectedTotal);
  });
});

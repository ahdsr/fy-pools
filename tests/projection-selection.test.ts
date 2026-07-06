import { describe, expect, it } from "vitest";

import type { PoolAnalyticsRow } from "@/lib/world-cup-pool/leaderboard";
import { preferredSelectedEntryId } from "@/lib/world-cup-pool/projection-selection";

function row(id: string, rank: number): PoolAnalyticsRow {
  return {
    id,
    name: id,
    rank,
    currentTotal: 0,
    currentGapToLeader: 0,
    remaining: {
      group: 0,
      knockout: 0,
      finals: 0,
      bonus: 0,
      total: 0,
    },
    maxPossible: 0,
    canWin: true,
    canReachPayout: true,
    payoutPlaces: 4,
    ceilingRank: rank,
  };
}

const rows = [
  row("lucas-sokolowski", 1),
  row("varun", 1),
  row("marcin", 3),
];

describe("preferredSelectedEntryId", () => {
  it("uses a valid requested entry first", () => {
    expect(
      preferredSelectedEntryId({
        requestedEntry: "varun",
        rows,
        leaderId: "lucas-sokolowski",
        defaultEntryId: "lucas-sokolowski",
      }),
    ).toBe("varun");
  });

  it("uses the configured default entry even when it is the current leader", () => {
    expect(
      preferredSelectedEntryId({
        rows,
        leaderId: "lucas-sokolowski",
        defaultEntryId: "lucas-sokolowski",
      }),
    ).toBe("lucas-sokolowski");
  });

  it("falls back to a non-leader when there is no valid requested or default entry", () => {
    expect(
      preferredSelectedEntryId({
        requestedEntry: "missing",
        rows,
        leaderId: "lucas-sokolowski",
        defaultEntryId: "missing",
      }),
    ).toBe("varun");
  });
});

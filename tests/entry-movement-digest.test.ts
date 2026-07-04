import { describe, expect, it } from "vitest";

import { buildEntryMovementDigest } from "@/lib/world-cup-pool/entry-movement-digest";
import type { FutureLeverageReport } from "@/lib/world-cup-pool/future-leverage";
import type { OpponentPathsReport } from "@/lib/world-cup-pool/opponent-paths";
import type { TodaysResultsReport } from "@/lib/world-cup-pool/todays-results";
import type {
  LeaderboardRow,
  MatchResult,
  PoolScore,
} from "@/lib/world-cup-pool/types";

function score(total: number): PoolScore {
  return {
    total,
    subtotals: {
      group: total,
      knockout: 0,
      finals: 0,
      bonus: 0,
    },
    groups: [],
    knockout: [],
    finals: [],
    bonus: [],
  };
}

function row(id: string, name: string, rank: number, total: number): LeaderboardRow {
  return {
    id,
    name,
    rank,
    score: score(total),
  };
}

function match(id: string, homeTeam = "Canada", awayTeam = "Japan"): MatchResult {
  return {
    id,
    date: `2026-07-${String(Number(id.replace(/\D/g, "")) + 10).padStart(2, "0")}T19:00:00Z`,
    state: "pre",
    completed: false,
    detail: "Scheduled",
    homeTeam,
    awayTeam,
    homeScore: null,
    awayScore: null,
    winner: "",
    loser: "",
  };
}

function futureReport(
  matches: FutureLeverageReport["matches"],
  chasers: FutureLeverageReport["chasers"] = [],
): FutureLeverageReport {
  return {
    target: {
      id: "target",
      name: "Player",
      rank: 4,
      total: 10,
    },
    raceEntries: [],
    raceMilestones: [],
    matches,
    chasers,
  };
}

describe("buildEntryMovementDigest", () => {
  it("shows no deciders when no unfinished impactful events exist", () => {
    const digest = buildEntryMovementDigest({
      entryId: "target",
      leaderboardRows: [
        row("leader", "Leader", 1, 20),
        row("target", "Player", 2, 10),
      ],
      todaysResults: null,
      futureLeverage: null,
      opponentPaths: null,
    });

    expect(digest?.deciders).toEqual([]);
    expect(digest?.raceSnapshot.bestReachableRank).toBe(2);
    expect(digest?.emptyState).toContain("No upcoming match");
  });

  it("ranks upward movement above pure point gain", () => {
    const digest = buildEntryMovementDigest({
      entryId: "target",
      leaderboardRows: [
        row("maria", "Maria", 3, 11),
        row("target", "Player", 4, 10),
      ],
      todaysResults: null,
      futureLeverage: futureReport([
        {
          id: "match-1",
          date: "2026-07-12T19:00:00Z",
          detail: "Scheduled",
          homeTeam: "Canada",
          awayTeam: "Japan",
          pathNotes: [],
          bestOutcome: {
            outcome: "home",
            label: "Canada win",
            rank: 4,
            total: 18,
            pointChange: 8,
            rankChange: 0,
            entriesPassed: [],
            chasersPassing: [],
          },
          worstOutcome: {
            outcome: "away",
            label: "Japan win",
            rank: 4,
            total: 10,
            pointChange: 0,
            rankChange: 0,
            entriesPassed: [],
            chasersPassing: [],
          },
          outcomes: [],
        },
        {
          id: "match-2",
          date: "2026-07-13T19:00:00Z",
          detail: "Scheduled",
          homeTeam: "Brazil",
          awayTeam: "France",
          pathNotes: [],
          bestOutcome: {
            outcome: "home",
            label: "Brazil win",
            rank: 3,
            total: 11,
            pointChange: 1,
            rankChange: 1,
            entriesPassed: ["Maria"],
            chasersPassing: [],
          },
          worstOutcome: {
            outcome: "away",
            label: "France win",
            rank: 4,
            total: 10,
            pointChange: 0,
            rankChange: 0,
            entriesPassed: [],
            chasersPassing: [],
          },
          outcomes: [],
        },
      ]),
      opponentPaths: null,
    });

    expect(digest?.deciders[0]?.matchId).toBe("match-2");
    expect(digest?.deciders[0]?.impact).toContain("move to #3");
  });

  it("includes downside risk from chasers", () => {
    const digest = buildEntryMovementDigest({
      entryId: "target",
      leaderboardRows: [
        row("target", "Player", 4, 10),
        row("bo", "Bo", 5, 9),
      ],
      todaysResults: null,
      futureLeverage: futureReport([
        {
          id: "match-3",
          date: "2026-07-14T19:00:00Z",
          detail: "Scheduled",
          homeTeam: "Spain",
          awayTeam: "USA",
          pathNotes: [],
          bestOutcome: {
            outcome: "home",
            label: "Spain win",
            rank: 4,
            total: 10,
            pointChange: 0,
            rankChange: 0,
            entriesPassed: [],
            chasersPassing: [],
          },
          worstOutcome: {
            outcome: "away",
            label: "USA win",
            rank: 4,
            total: 10,
            pointChange: 0,
            rankChange: 0,
            entriesPassed: [],
            chasersPassing: ["Bo"],
          },
          outcomes: [],
        },
      ]),
      opponentPaths: null,
    });

    expect(digest?.deciders[0]?.direction).toBe("down");
    expect(digest?.raceSnapshot.biggestDownside).toContain("Bo");
  });

  it("limits output to nearby rivals and top deciders", () => {
    const digest = buildEntryMovementDigest({
      entryId: "target",
      leaderboardRows: [
        row("first", "First", 1, 30),
        row("second", "Second", 2, 25),
        row("third", "Third", 3, 21),
        row("target", "Player", 4, 20),
        row("fifth", "Fifth", 5, 19),
        row("sixth", "Sixth", 6, 18),
        row("seventh", "Seventh", 7, 12),
      ],
      todaysResults: null,
      futureLeverage: futureReport(
        Array.from({ length: 8 }, (_, index) => ({
          id: `match-${index + 10}`,
          date: `2026-07-${index + 10}T19:00:00Z`,
          detail: "Scheduled",
          homeTeam: `Home ${index}`,
          awayTeam: `Away ${index}`,
          pathNotes: [],
          bestOutcome: {
            outcome: "home",
            label: `Home ${index} win`,
            rank: Math.max(1, 4 - index),
            total: 21 + index,
            pointChange: index + 1,
            rankChange: index,
            entriesPassed: index ? ["Third"] : [],
            chasersPassing: [],
          },
          worstOutcome: {
            outcome: "away",
            label: `Away ${index} win`,
            rank: 4,
            total: 20,
            pointChange: 0,
            rankChange: 0,
            entriesPassed: [],
            chasersPassing: [],
          },
          outcomes: [],
        })),
      ),
      opponentPaths: null,
    });

    expect(digest?.deciders).toHaveLength(5);
    expect(digest?.closeRivals).toHaveLength(4);
    expect(digest?.closeRivals.map((rival) => rival.id)).toEqual([
      "third",
      "second",
      "fifth",
      "sixth",
    ]);
  });

  it("handles tied ranks and equal scores predictably", () => {
    const opponentPaths: OpponentPathsReport = {
      target: {
        id: "target",
        name: "Player",
        rank: 2,
        total: 20,
      },
      defaultOpponentIds: ["tie"],
      opponents: [
        {
          id: "tie",
          name: "Tie",
          rank: 2,
          total: 20,
          gap: 0,
          neededSwing: 1,
          playerUpside: 0,
          opponentThreat: 0,
          routeCovered: 0,
          routeComplete: false,
          gainEvents: [],
          threatEvents: [],
          routeEvents: [],
          groups: [],
          matches: [],
        },
      ],
    };
    const todaysResults: TodaysResultsReport = {
      dateLabel: "Tuesday, Jul 14",
      currentRank: 2,
      currentTotal: 20,
      bestRank: 2,
      bestTotal: 20,
      matchCount: 1,
      scenarioCount: 1,
      risingScenarioCount: 0,
      matches: [
        {
          match: match("match-20"),
          groupId: "A",
          outcomes: [],
        },
      ],
      bestScenarios: [],
    };

    const digest = buildEntryMovementDigest({
      entryId: "target",
      leaderboardRows: [
        row("leader", "Leader", 1, 24),
        row("target", "Player", 2, 20),
        row("tie", "Tie", 2, 20),
        row("chaser", "Chaser", 4, 18),
      ],
      todaysResults,
      futureLeverage: null,
      opponentPaths,
    });

    expect(digest?.closeRivals[1]?.id).toBe("tie");
    expect(digest?.closeRivals[1]?.relation).toBe("tied");
    expect(digest?.closeRivals[1]?.neededSwing).toBe(1);
  });
});

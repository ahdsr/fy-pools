import { describe, expect, it } from "vitest";

import { buildEntryMovementDigest } from "@/lib/world-cup-pool/entry-movement-digest";
import type { FutureLeverageReport } from "@/lib/world-cup-pool/future-leverage";
import type { PoolAnalytics } from "@/lib/world-cup-pool/leaderboard";
import type {
  EntryScenarioProjection,
  OpponentPathsReport,
} from "@/lib/world-cup-pool/opponent-paths";
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

function analytics(
  rows: { id: string; rank: number; total: number; maxPossible: number }[],
  leaderTotal = rows[0]?.total ?? 0,
): PoolAnalytics {
  return {
    payoutPlaces: 4,
    leaderTotal,
    payoutCutoff: 0,
    leaderNames: ["Leader"],
    leaderClinched: false,
    aliveCount: rows.length,
    payoutAliveCount: rows.length,
    rows: rows.map((item) => ({
      id: item.id,
      name: item.id,
      rank: item.rank,
      currentTotal: item.total,
      currentGapToLeader: Math.max(0, leaderTotal - item.total),
      remaining: {
        group: 0,
        knockout: 0,
        finals: 0,
        bonus: 0,
        total: Math.max(0, item.maxPossible - item.total),
      },
      maxPossible: item.maxPossible,
      canWin: item.maxPossible >= leaderTotal,
      canReachPayout: true,
      payoutPlaces: 4,
      ceilingRank: item.rank,
    })),
  };
}

function opponentPaths(
  opponent: Partial<OpponentPathsReport["opponents"][number]> = {},
): OpponentPathsReport {
  return {
    target: {
      id: "target",
      name: "Player",
      rank: 2,
      total: 10,
    },
    defaultOpponentIds: ["leader"],
    opponents: [
      {
        id: "leader",
        name: "Leader",
        rank: 1,
        total: 20,
        gap: 10,
        neededSwing: 11,
        playerUpside: 0,
        opponentThreat: 0,
        routeCovered: 0,
        routeComplete: false,
        gainEvents: [],
        threatEvents: [],
        routeEvents: [],
        groups: [],
        matches: [],
        ...opponent,
      },
    ],
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

    expect(digest?.matchDeciders).toHaveLength(5);
    expect(digest?.closeRivals).toHaveLength(4);
    expect(digest?.closeRivals.map((rival) => rival.id)).toEqual([
      "third",
      "second",
      "fifth",
      "sixth",
    ]);
  });

  it("shows selected match deciders in date order", () => {
    const digest = buildEntryMovementDigest({
      entryId: "target",
      leaderboardRows: [
        row("third", "Third", 3, 21),
        row("target", "Player", 4, 20),
      ],
      todaysResults: null,
      futureLeverage: futureReport([
        {
          id: "match-late",
          date: "2026-07-13T19:00:00Z",
          detail: "Scheduled",
          homeTeam: "Brazil",
          awayTeam: "France",
          pathNotes: [],
          bestOutcome: {
            outcome: "home",
            label: "Brazil win",
            rank: 1,
            total: 25,
            pointChange: 5,
            rankChange: 3,
            entriesPassed: ["Third"],
            chasersPassing: [],
          },
          worstOutcome: {
            outcome: "away",
            label: "France win",
            rank: 4,
            total: 20,
            pointChange: 0,
            rankChange: 0,
            entriesPassed: [],
            chasersPassing: [],
          },
          outcomes: [],
        },
        {
          id: "match-early",
          date: "2026-07-11T19:00:00Z",
          detail: "Scheduled",
          homeTeam: "Canada",
          awayTeam: "Japan",
          pathNotes: [],
          bestOutcome: {
            outcome: "home",
            label: "Canada win",
            rank: 3,
            total: 21,
            pointChange: 1,
            rankChange: 1,
            entriesPassed: ["Third"],
            chasersPassing: [],
          },
          worstOutcome: {
            outcome: "away",
            label: "Japan win",
            rank: 4,
            total: 20,
            pointChange: 0,
            rankChange: 0,
            entriesPassed: [],
            chasersPassing: [],
          },
          outcomes: [],
        },
        {
          id: "match-middle",
          date: "2026-07-12T19:00:00Z",
          detail: "Scheduled",
          homeTeam: "Spain",
          awayTeam: "Norway",
          pathNotes: [],
          bestOutcome: {
            outcome: "home",
            label: "Spain win",
            rank: 2,
            total: 23,
            pointChange: 3,
            rankChange: 2,
            entriesPassed: ["Third"],
            chasersPassing: [],
          },
          worstOutcome: {
            outcome: "away",
            label: "Norway win",
            rank: 4,
            total: 20,
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

    expect(digest?.matchDeciders.map((decider) => decider.matchId)).toEqual([
      "match-early",
      "match-middle",
      "match-late",
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

  it("marks the current leader as leading", () => {
    const digest = buildEntryMovementDigest({
      entryId: "target",
      leaderboardRows: [
        row("target", "Player", 1, 30),
        row("chaser", "Chaser", 2, 20),
      ],
      todaysResults: null,
      futureLeverage: null,
      opponentPaths: null,
      analytics: analytics([
        { id: "target", rank: 1, total: 30, maxPossible: 40 },
        { id: "chaser", rank: 2, total: 20, maxPossible: 35 },
      ], 30),
    });

    expect(digest?.winPath.status).toBe("leading");
    expect(digest?.winPath.summary).toContain("currently leading");
  });

  it("marks an entry mathematically out when max possible cannot reach the leader", () => {
    const digest = buildEntryMovementDigest({
      entryId: "target",
      leaderboardRows: [
        row("leader", "Leader", 1, 30),
        row("target", "Player", 2, 10),
      ],
      todaysResults: null,
      futureLeverage: null,
      opponentPaths: opponentPaths(),
      analytics: analytics([
        { id: "leader", rank: 1, total: 30, maxPossible: 30 },
        { id: "target", rank: 2, total: 10, maxPossible: 20 },
      ], 30),
    });

    expect(digest?.winPath.status).toBe("mathematicallyOut");
    expect(digest?.winPath.summary).toContain("Mathematically out");
  });

  it("shows no visible route when max possible can catch the leader but route events are incomplete", () => {
    const digest = buildEntryMovementDigest({
      entryId: "target",
      leaderboardRows: [
        row("leader", "Leader", 1, 30),
        row("target", "Player", 2, 10),
      ],
      todaysResults: null,
      futureLeverage: null,
      opponentPaths: opponentPaths({
        neededSwing: 21,
        routeCovered: 8,
        routeComplete: false,
      }),
      analytics: analytics([
        { id: "leader", rank: 1, total: 30, maxPossible: 30 },
        { id: "target", rank: 2, total: 10, maxPossible: 40 },
      ], 30),
    });

    expect(digest?.winPath.status).toBe("noVisibleRoute");
    expect(digest?.winPath.summary).toContain("No visible win route");
  });

  it("shows can win when a complete leader route exists", () => {
    const digest = buildEntryMovementDigest({
      entryId: "target",
      leaderboardRows: [
        row("leader", "Leader", 1, 30),
        row("target", "Player", 2, 10),
      ],
      todaysResults: null,
      futureLeverage: null,
      opponentPaths: opponentPaths({
        neededSwing: 21,
        routeCovered: 24,
        routeComplete: true,
        routeEvents: [
          {
            id: "event-1",
            category: "Knockout",
            title: "Brazil win the quarter-final",
            detail: "",
            points: 12,
            teams: ["Brazil"],
          },
        ],
      }),
      analytics: analytics([
        { id: "leader", rank: 1, total: 30, maxPossible: 30 },
        { id: "target", rank: 2, total: 10, maxPossible: 40 },
      ], 30),
    });

    expect(digest?.winPath.status).toBe("canWin");
    expect(digest?.winPath.events[0]?.title).toBe("Brazil win the quarter-final");
  });

  it("does not call a head-to-head route a win when shared picks still block first", () => {
    const scenarioProjection: EntryScenarioProjection = {
      entryId: "target",
      entryName: "Player",
      currentRank: 3,
      currentTotal: 10,
      projectedRank: 2,
      projectedTotal: 25,
      routeCovered: 15,
      eventCount: 1,
      canFinishFirst: false,
      tiedForFirst: false,
      tiedEntries: [
        {
          id: "target",
          name: "Player",
          currentTotal: 10,
          projectedTotal: 25,
          delta: 15,
          rank: 2,
        },
      ],
      events: [
        {
          id: "event-1",
          category: "Final",
          title: "England finish as Runner-up",
          detail: "",
          points: 15,
          teams: ["England"],
          resultKind: "finalPosition",
          resultKey: "runnerUp",
          selectedPoints: 15,
          scorerIds: ["blocker", "target"],
          scorerNames: ["Blocker", "Player"],
        },
      ],
      standings: [
        {
          id: "blocker",
          name: "Blocker",
          currentTotal: 12,
          projectedTotal: 27,
          delta: 15,
          rank: 1,
        },
        {
          id: "target",
          name: "Player",
          currentTotal: 10,
          projectedTotal: 25,
          delta: 15,
          rank: 2,
        },
      ],
      blockers: [
        {
          id: "blocker",
          name: "Blocker",
          currentTotal: 12,
          projectedTotal: 27,
          delta: 15,
          rank: 1,
        },
      ],
    };
    const digest = buildEntryMovementDigest({
      entryId: "target",
      leaderboardRows: [
        row("leader", "Leader", 1, 12),
        row("blocker", "Blocker", 2, 11),
        row("target", "Player", 3, 10),
      ],
      todaysResults: null,
      futureLeverage: null,
      opponentPaths: opponentPaths({
        neededSwing: 3,
        routeCovered: 15,
        routeComplete: true,
        routeEvents: [
          {
            id: "event-1",
            category: "Final",
            title: "England finish as Runner-up",
            detail: "",
            points: 15,
            teams: ["England"],
          },
        ],
      }),
      scenarioProjection,
      analytics: analytics([
        { id: "leader", rank: 1, total: 12, maxPossible: 20 },
        { id: "blocker", rank: 2, total: 11, maxPossible: 30 },
        { id: "target", rank: 3, total: 10, maxPossible: 30 },
      ], 12),
    });

    expect(digest?.winPath.status).toBe("noVisibleRoute");
    expect(digest?.winPath.summary).toContain("projects #2");
    expect(digest?.winPath.summary).toContain("Blocker");
  });

  it("collapses multiple outcomes for one match into one match card with best and danger labels", () => {
    const digest = buildEntryMovementDigest({
      entryId: "target",
      leaderboardRows: [
        row("leader", "Leader", 1, 20),
        row("target", "Player", 2, 10),
      ],
      todaysResults: null,
      futureLeverage: futureReport([
        {
          id: "match-40",
          date: "2026-07-16T19:00:00Z",
          detail: "Scheduled",
          homeTeam: "Brazil",
          awayTeam: "Norway",
          pathNotes: ["Brazil result vs #1 Leader"],
          bestOutcome: {
            outcome: "home",
            label: "Brazil win",
            rank: 1,
            total: 25,
            pointChange: 15,
            rankChange: 1,
            entriesPassed: ["Leader"],
            chasersPassing: [],
          },
          worstOutcome: {
            outcome: "away",
            label: "Norway win",
            rank: 2,
            total: 10,
            pointChange: 0,
            rankChange: 0,
            entriesPassed: [],
            chasersPassing: ["Matthew Wozniczka (2)"],
          },
          outcomes: [],
        },
      ]),
      opponentPaths: null,
    });

    expect(digest?.matchDeciders).toHaveLength(1);
    expect(digest?.matchDeciders[0]?.best?.label).toBe("Best result");
    expect(digest?.matchDeciders[0]?.danger?.label).toBe("Danger result");
    expect(digest?.matchDeciders[0]?.danger?.summary).not.toContain("Want");
    expect(digest?.matchDeciders[0]?.danger?.summary).not.toContain("(2)");
  });

  it("removes unexplained duplicate suffixes from player names in movement copy", () => {
    const digest = buildEntryMovementDigest({
      entryId: "target",
      leaderboardRows: [
        row("adam", "Adam Banaszek (1)", 1, 20),
        row("target", "Player", 2, 10),
      ],
      todaysResults: null,
      futureLeverage: futureReport([
        {
          id: "match-50",
          date: "2026-07-17T19:00:00Z",
          detail: "Scheduled",
          homeTeam: "Belgium",
          awayTeam: "France",
          pathNotes: [],
          bestOutcome: {
            outcome: "home",
            label: "Belgium win",
            rank: 1,
            total: 25,
            pointChange: 15,
            rankChange: 1,
            entriesPassed: ["Adam Banaszek (1)"],
            chasersPassing: [],
          },
          worstOutcome: {
            outcome: "away",
            label: "France win",
            rank: 2,
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

    expect(digest?.matchDeciders[0]?.best?.summary).toContain("Adam Banaszek");
    expect(digest?.matchDeciders[0]?.best?.summary).not.toContain("(1)");
  });
});

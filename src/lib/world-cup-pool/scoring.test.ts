import { describe, expect, it } from "vitest";

import {
  actualAdvancersForGroup,
  scoreGroup,
  scorePool,
} from "@/lib/world-cup-pool/scoring";
import type {
  EntryPicks,
  GroupPick,
  PoolResults,
  ScoringRules,
} from "@/lib/world-cup-pool/types";

const rules: ScoringRules = {
  groupAdvancement: 2,
  exactTopTwoBonus: 3,
  exactTopFourBonus: 5,
  roundOf16: 1,
  quarterFinalists: 2,
  semifinalists: 3,
  thirdPlaceMatch: 4,
  finalists: 5,
  thirdPlace: 6,
  runnerUp: 7,
  champion: 10,
  bonus: 2,
};

const groupPick: GroupPick = {
  teams: ["Canada", "France", "Brazil", "Japan"].map((name) => ({ name })),
  predictedOrder: ["Canada", "France", "Brazil", "Japan"],
  predictedAdvancers: ["Canada", "France", "Brazil"],
};

const results: PoolResults = {
  groups: {
    A: {
      currentOrder: ["Canada", "France", "Brazil", "Japan"],
      status: "final",
    },
  },
  topThirdGroups: ["A"],
  roundOf16: ["Canada", "France", "Brazil"],
  quarterFinalists: ["Canada", "France"],
  semifinalists: ["Canada"],
  thirdPlaceMatch: ["France"],
  finalists: ["Canada", "Brazil"],
  finals: {
    champion: "Canada",
    runnerUp: "Brazil",
    thirdPlace: "France",
  },
  bonus: {
    mostGoalsScored: ["Canada"],
  },
};

const picks: EntryPicks = {
  meta: {
    title: "Test picks",
    owner: "Test owner",
  },
  scoringRules: rules,
  bonus: [
    {
      id: "mostGoalsScored",
      label: "Most goals scored",
      pick: "Canada",
    },
  ],
  groups: {
    A: groupPick,
  },
  thirdPlace: {},
  knockout: {
    roundOf32: [],
    roundOf16: [],
    quarterFinals: [],
    semiFinals: [],
    final: {
      teams: ["Canada", "Brazil"],
      winner: "Canada",
    },
    thirdPlace: {
      teams: ["France", "Japan"],
      winner: "France",
    },
  },
  advancement: {
    roundOf16: ["Canada", "France", "Brazil"],
    quarterFinalists: ["Canada", "France", "Japan"],
    semifinalists: ["Canada", "Japan"],
    thirdPlaceMatch: ["France"],
    finalists: ["Canada", "Brazil"],
  },
  podium: {
    champion: "Canada",
    runnerUp: "Brazil",
    thirdPlace: "France",
  },
};

describe("world cup pool scoring", () => {
  it("includes third-place qualifiers when a group is selected", () => {
    expect(actualAdvancersForGroup(results, "A")).toEqual([
      "Canada",
      "France",
      "Brazil",
    ]);
  });

  it("awards advancement hits and the highest exact-order group bonus", () => {
    expect(scoreGroup("A", groupPick, results, rules)).toMatchObject({
      points: 11,
      advancementPoints: 6,
      rankBonus: 5,
      advancementHits: ["Canada", "France", "Brazil"],
    });
  });

  it("adds group, knockout, finals, and bonus subtotals into the total", () => {
    const score = scorePool(picks, results);

    expect(score.subtotals).toEqual({
      group: 11,
      knockout: 24,
      finals: 23,
      bonus: 2,
    });
    expect(score.total).toBe(60);
  });
});

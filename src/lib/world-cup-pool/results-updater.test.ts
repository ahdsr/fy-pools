import { describe, expect, it } from "vitest";

import {
  buildResultsFromEvents,
  createTeamResolver,
  parseEspnEvent,
  parseEspnSummaryTeamStats,
} from "@/lib/world-cup-pool/results-updater";
import type { EntryPicks } from "@/lib/world-cup-pool/types";

const picks: EntryPicks = {
  meta: {
    title: "Parser fixture",
    owner: "Test owner",
  },
  scoringRules: {
    groupAdvancement: 1,
    exactTopTwoBonus: 1,
    exactTopFourBonus: 1,
    roundOf16: 1,
    quarterFinalists: 1,
    semifinalists: 1,
    thirdPlaceMatch: 1,
    finalists: 1,
    thirdPlace: 1,
    runnerUp: 1,
    champion: 1,
    bonus: 1,
  },
  bonus: [
    { id: "mostGoalsScored", label: "Team with most Round of 16 goals", pick: "USA" },
    { id: "mostYellowCards", label: "Team with most Round of 16 yellow cards", pick: "Brazil" },
    { id: "mostRedCards", label: "Team with most Round of 16 red cards", pick: "Spain" },
    { id: "mostFoulsCommitted", label: "Team with most Round of 16 fouls", pick: "Canada" },
    { id: "mostCornerKicks", label: "Team with most Round of 16 corner kicks", pick: "USA" },
  ],
  groups: {
    A: {
      teams: ["USA", "Canada", "Mexico", "Japan"].map((name) => ({ name })),
      predictedOrder: [],
      predictedAdvancers: [],
    },
    B: {
      teams: ["Brazil", "Spain", "France", "Germany"].map((name) => ({ name })),
      predictedOrder: [],
      predictedAdvancers: [],
    },
  },
  thirdPlace: {},
  knockout: {
    roundOf32: [],
    roundOf16: [],
    quarterFinals: [],
    semiFinals: [],
    final: { teams: [], winner: "" },
    thirdPlace: { teams: [], winner: "" },
  },
  advancement: {
    roundOf16: [],
    quarterFinalists: [],
    semifinalists: [],
    thirdPlaceMatch: [],
    finalists: [],
  },
  podium: {
    champion: "",
    runnerUp: "",
    thirdPlace: "",
  },
};

const completedEvent = {
  id: "match-1",
  name: "United States vs Canada",
  shortName: "USA/CAN",
  date: "2026-06-11T19:00:00Z",
  status: {
    type: {
      state: "post",
      completed: true,
      detail: "Final",
    },
  },
  competitions: [
    {
      id: "competition-1",
      competitors: [
        {
          homeAway: "home",
          score: "2",
          team: { displayName: "United States" },
        },
        {
          homeAway: "away",
          score: "1",
          team: { displayName: "Canada" },
        },
      ],
    },
  ],
};

function roundOf16Event({
  id,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
}: {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
}) {
  return {
    id,
    name: `${awayTeam} at ${homeTeam}`,
    shortName: `${awayTeam}/${homeTeam}`,
    date: "2026-07-04T19:00:00Z",
    season: { slug: "round-of-16" },
    status: {
      type: {
        state: "post",
        completed: true,
        detail: "FT",
      },
    },
    competitions: [
      {
        id,
        altGameNote: "FIFA World Cup, Round of 16",
        competitors: [
          {
            homeAway: "home",
            score: String(homeScore),
            team: { displayName: homeTeam },
          },
          {
            homeAway: "away",
            score: String(awayScore),
            team: { displayName: awayTeam },
          },
        ],
      },
    ],
  };
}

function summaryFor(
  homeTeam: string,
  awayTeam: string,
  home: { yellowCards: number; redCards: number; foulsCommitted: number; wonCorners: number },
  away: { yellowCards: number; redCards: number; foulsCommitted: number; wonCorners: number },
) {
  return {
    boxscore: {
      teams: [
        {
          team: { displayName: homeTeam },
          statistics: Object.entries(home).map(([name, displayValue]) => ({
            name,
            displayValue,
          })),
        },
        {
          team: { displayName: awayTeam },
          statistics: Object.entries(away).map(([name, displayValue]) => ({
            name,
            displayValue,
          })),
        },
      ],
    },
  };
}

describe("world cup results updater", () => {
  it("normalizes ESPN team names and infers winner from final scores", () => {
    const resolveTeam = createTeamResolver(picks, {
      aliases: {
        "United States": "USA",
      },
    });

    expect(parseEspnEvent(completedEvent, resolveTeam)).toMatchObject({
      id: "match-1",
      stage: "",
      completed: true,
      detail: "Final",
      homeTeam: "USA",
      awayTeam: "Canada",
      homeScore: 2,
      awayScore: 1,
      winner: "USA",
      loser: "Canada",
    });
  });

  it("builds group standings and match metadata from ESPN events", () => {
    const results = buildResultsFromEvents([completedEvent], {
      picks,
      aliases: {
        aliases: {
          "United States": "USA",
        },
      },
      now: "2026-06-12T00:00:00Z",
    });

    expect(results.meta).toMatchObject({
      source: "espn",
      lastUpdated: "2026-06-12T00:00:00Z",
    });
    expect(results.matches).toHaveLength(1);
    expect(results.groups?.A.currentOrder[0]).toBe("USA");
    expect(results.groups?.A.stats?.find((team) => team.team === "Canada")).toMatchObject({
      played: 1,
      points: 0,
      goalsFor: 1,
      goalsAgainst: 2,
    });
    expect(results.groups?.A.status).toBe("final");
  });

  it("parses ESPN summary team stats into canonical bonus totals", () => {
    const resolveTeam = createTeamResolver(picks);

    expect(
      parseEspnSummaryTeamStats(
        summaryFor(
          "USA",
          "Brazil",
          { yellowCards: 2, redCards: 0, foulsCommitted: 14, wonCorners: 5 },
          { yellowCards: 3, redCards: 1, foulsCommitted: 12, wonCorners: 8 },
        ),
        resolveTeam,
      ),
    ).toEqual([
      {
        team: "USA",
        goalsFor: 0,
        yellowCards: 2,
        redCards: 0,
        foulsCommitted: 14,
        cornerKicks: 5,
      },
      {
        team: "Brazil",
        goalsFor: 0,
        yellowCards: 3,
        redCards: 1,
        foulsCommitted: 12,
        cornerKicks: 8,
      },
    ]);
  });

  it("settles Round of 16 stat props with tied leaders", () => {
    const events = [
      roundOf16Event({
        id: "r16-1",
        homeTeam: "USA",
        awayTeam: "Brazil",
        homeScore: 2,
        awayScore: 1,
      }),
      roundOf16Event({
        id: "r16-2",
        homeTeam: "Canada",
        awayTeam: "Spain",
        homeScore: 0,
        awayScore: 2,
      }),
      roundOf16Event({
        id: "r16-3",
        homeTeam: "Mexico",
        awayTeam: "France",
        homeScore: 0,
        awayScore: 0,
      }),
      roundOf16Event({
        id: "r16-4",
        homeTeam: "Japan",
        awayTeam: "Germany",
        homeScore: 0,
        awayScore: 0,
      }),
      roundOf16Event({
        id: "r16-5",
        homeTeam: "Mexico",
        awayTeam: "France",
        homeScore: 0,
        awayScore: 0,
      }),
      roundOf16Event({
        id: "r16-6",
        homeTeam: "Japan",
        awayTeam: "Germany",
        homeScore: 0,
        awayScore: 0,
      }),
      roundOf16Event({
        id: "r16-7",
        homeTeam: "Mexico",
        awayTeam: "France",
        homeScore: 0,
        awayScore: 0,
      }),
      roundOf16Event({
        id: "r16-8",
        homeTeam: "Japan",
        awayTeam: "Germany",
        homeScore: 0,
        awayScore: 0,
      }),
    ];

    const results = buildResultsFromEvents(events, {
      picks,
      summaries: {
        "r16-1": summaryFor(
          "USA",
          "Brazil",
          { yellowCards: 1, redCards: 0, foulsCommitted: 10, wonCorners: 5 },
          { yellowCards: 3, redCards: 1, foulsCommitted: 9, wonCorners: 2 },
        ),
        "r16-2": summaryFor(
          "Canada",
          "Spain",
          { yellowCards: 2, redCards: 0, foulsCommitted: 13, wonCorners: 5 },
          { yellowCards: 3, redCards: 1, foulsCommitted: 11, wonCorners: 3 },
        ),
        "r16-3": summaryFor(
          "Mexico",
          "France",
          { yellowCards: 0, redCards: 0, foulsCommitted: 0, wonCorners: 0 },
          { yellowCards: 0, redCards: 0, foulsCommitted: 0, wonCorners: 0 },
        ),
        "r16-4": summaryFor(
          "Japan",
          "Germany",
          { yellowCards: 0, redCards: 0, foulsCommitted: 0, wonCorners: 0 },
          { yellowCards: 0, redCards: 0, foulsCommitted: 0, wonCorners: 0 },
        ),
        "r16-5": summaryFor(
          "Mexico",
          "France",
          { yellowCards: 0, redCards: 0, foulsCommitted: 0, wonCorners: 0 },
          { yellowCards: 0, redCards: 0, foulsCommitted: 0, wonCorners: 0 },
        ),
        "r16-6": summaryFor(
          "Japan",
          "Germany",
          { yellowCards: 0, redCards: 0, foulsCommitted: 0, wonCorners: 0 },
          { yellowCards: 0, redCards: 0, foulsCommitted: 0, wonCorners: 0 },
        ),
        "r16-7": summaryFor(
          "Mexico",
          "France",
          { yellowCards: 0, redCards: 0, foulsCommitted: 0, wonCorners: 0 },
          { yellowCards: 0, redCards: 0, foulsCommitted: 0, wonCorners: 0 },
        ),
        "r16-8": summaryFor(
          "Japan",
          "Germany",
          { yellowCards: 0, redCards: 0, foulsCommitted: 0, wonCorners: 0 },
          { yellowCards: 0, redCards: 0, foulsCommitted: 0, wonCorners: 0 },
        ),
      },
      now: "2026-07-08T00:00:00Z",
    });

    expect(results.bonus).toMatchObject({
      mostGoalsScored: ["Spain", "USA"],
      mostYellowCards: ["Brazil", "Spain"],
      mostRedCards: ["Brazil", "Spain"],
      mostFoulsCommitted: ["Canada"],
      mostCornerKicks: ["Canada", "USA"],
    });
  });

  it("ignores non-Round of 16 matches for bonus stat leaders", () => {
    const groupEvent = {
      ...roundOf16Event({
        id: "group-1",
        homeTeam: "USA",
        awayTeam: "Brazil",
        homeScore: 8,
        awayScore: 0,
      }),
      season: { slug: "group-stage" },
    };
    const quarterFinalEvent = {
      ...roundOf16Event({
        id: "qf-1",
        homeTeam: "Canada",
        awayTeam: "Spain",
        homeScore: 0,
        awayScore: 7,
      }),
      season: { slug: "quarterfinals" },
    };
    const roundEvent = roundOf16Event({
      id: "r16-1",
      homeTeam: "USA",
      awayTeam: "Spain",
      homeScore: 1,
      awayScore: 2,
    });

    const results = buildResultsFromEvents([groupEvent, roundEvent, quarterFinalEvent], {
      picks,
      summaries: {
        "group-1": summaryFor(
          "USA",
          "Brazil",
          { yellowCards: 9, redCards: 3, foulsCommitted: 30, wonCorners: 15 },
          { yellowCards: 1, redCards: 0, foulsCommitted: 3, wonCorners: 1 },
        ),
        "r16-1": summaryFor(
          "USA",
          "Spain",
          { yellowCards: 1, redCards: 0, foulsCommitted: 8, wonCorners: 2 },
          { yellowCards: 2, redCards: 1, foulsCommitted: 10, wonCorners: 4 },
        ),
        "qf-1": summaryFor(
          "Canada",
          "Spain",
          { yellowCards: 8, redCards: 2, foulsCommitted: 28, wonCorners: 10 },
          { yellowCards: 1, redCards: 0, foulsCommitted: 3, wonCorners: 1 },
        ),
      },
      now: "2026-07-08T00:00:00Z",
    });

    expect(results.bonus).toMatchObject({
      mostGoalsScored: ["Spain"],
      mostYellowCards: ["Spain"],
      mostRedCards: [],
      mostFoulsCommitted: ["Spain"],
      mostCornerKicks: ["Spain"],
    });
  });
});

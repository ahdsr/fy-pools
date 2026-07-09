import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import aliases from "@/data/marcins-world-cup-2026/team-aliases.json";
import picks from "@/data/marcins-world-cup-2026/picks.json";
import resultsJson from "@/data/marcins-world-cup-2026/results.json";
import {
  FIFA_CALENDAR_URL,
  buildResultsFromFifaMatches,
  computeBestPassCompletionFromFifaTeamStats,
  computeCardPointsFromFifaLiveMatches,
  computeCardPointsFromFifaTeamStats,
  computeFarthestGoalFromFifaTimelines,
  computeGoalBonusResultsFromFifaTeamStats,
  computeMostCardsFromFifaLiveMatches,
  createTeamResolver,
  parseFifaMatch,
  sortGroupStats,
} from "@/lib/world-cup-pool/results-updater";
import { WORLD_CUP_REFERENCE_LINKS } from "@/lib/world-cup-pool/reference-urls";
import type { EntryPicks, PoolResults } from "@/lib/world-cup-pool/types";

const typedPicks = picks as EntryPicks;

const TEAM_IDS: Record<string, string> = {
  Mexico: "43911",
  "South Africa": "43883",
  "South Korea": "43822",
  "Korea Republic": "43822",
  Czechia: "43995",
  Germany: "43948",
  Paraguay: "43940",
  Switzerland: "43971",
  Colombia: "43926",
};

function localized(description: string) {
  return [{ Locale: "en-GB", Description: description }];
}

function fifaTeam(name: string) {
  return {
    IdTeam: TEAM_IDS[name] ?? `team-${name}`,
    TeamName: localized(name),
    ShortClubName: name,
    Abbreviation: name.slice(0, 3).toUpperCase(),
  };
}

function fifaMatchFixture({
  id,
  matchNumber = 1,
  date = "2026-06-11T19:00:00Z",
  stage = "First Stage",
  group = "Group A",
  completed = true,
  state = completed ? "post" : "pre",
  resultType = completed ? 1 : 0,
  home,
  away,
  homeScore = completed ? 0 : null,
  awayScore = completed ? 0 : null,
  homePenaltyScore = null,
  awayPenaltyScore = null,
  winner = "",
}: {
  id: string;
  matchNumber?: number;
  date?: string;
  stage?: string;
  group?: string;
  completed?: boolean;
  state?: string;
  resultType?: number;
  home: string;
  away: string;
  homeScore?: number | null;
  awayScore?: number | null;
  homePenaltyScore?: number | null;
  awayPenaltyScore?: number | null;
  winner?: string;
}) {
  const homeTeam = fifaTeam(home);
  const awayTeam = fifaTeam(away);
  const winnerTeam = winner === home ? homeTeam : winner === away ? awayTeam : null;
  const matchStatus = completed ? 0 : state === "in" ? 3 : 1;

  return {
    IdCompetition: "17",
    IdSeason: "285023",
    IdStage: stage === "First Stage" ? "289273" : "knockout",
    IdMatch: id,
    MatchNumber: matchNumber,
    Date: date,
    StageName: localized(stage),
    GroupName: group ? localized(group) : [],
    Home: homeTeam,
    Away: awayTeam,
    HomeTeamScore: homeScore,
    AwayTeamScore: awayScore,
    HomeTeamPenaltyScore: homePenaltyScore,
    AwayTeamPenaltyScore: awayPenaltyScore,
    Winner: winnerTeam?.IdTeam ?? null,
    MatchStatus: matchStatus,
    ResultType: resultType,
    OfficialityStatus: completed ? 1 : 0,
  };
}

describe("FIFA World Cup updater", () => {
  it("parses FIFA calendar matches with aliases and source provenance", () => {
    const resolveTeam = createTeamResolver(typedPicks, aliases);
    const parsed = parseFifaMatch(
      fifaMatchFixture({
        id: "alias",
        completed: false,
        home: "Korea Republic",
        away: "Czechia",
        homeScore: null,
        awayScore: null,
      }),
      resolveTeam,
    );

    expect(parsed.homeTeam).toBe("South Korea");
    expect(parsed.source).toBe("fifa");
    expect(parsed.completed).toBe(false);
  });

  it("builds FIFA-only result metadata and separates fixtures from counted matches", () => {
    const results = buildResultsFromFifaMatches(
      [
        fifaMatchFixture({
          id: "group-a-1",
          home: "Mexico",
          away: "South Africa",
          homeScore: 2,
          awayScore: 0,
          winner: "Mexico",
        }),
        fifaMatchFixture({
          id: "group-a-2",
          matchNumber: 2,
          date: "2026-06-12T02:00:00Z",
          completed: false,
          home: "Korea Republic",
          away: "Czechia",
          homeScore: null,
          awayScore: null,
        }),
      ],
      {
        picks: typedPicks,
        aliases,
        fifaRankingResults: { rankingsByTeam: { Mexico: 14, "South Africa": 61 } },
        now: "2026-06-11T18:00:00.000Z",
      },
    );

    expect(results.meta?.source).toBe("fifa");
    expect(results.meta?.sourceUrl).toBe(FIFA_CALENDAR_URL);
    expect(results.meta?.status).toMatch(/Auto-updated from FIFA/);
    expect(JSON.stringify(results.meta)).not.toMatch(/ESPN/i);
    expect(results.matches?.map((match) => match.source)).toEqual(["fifa"]);
    expect(results.fixtures?.map((match) => match.id)).toEqual(["group-a-2"]);
    expect(results.topThirdGroups).toEqual([]);
    expect(results.bonus?.mostGoalsScored).toEqual(["Mexico"]);
    expect(results.bonus?.mostGoalsConceded).toEqual(["South Africa"]);
  });

  it("orders group tables by FIFA tiebreakers", () => {
    const headToHeadOrder = sortGroupStats(
      [
        { team: "Mexico", played: 3, points: 4, goalsFor: 6, goalsAgainst: 1, goalDifference: 5 },
        { team: "South Africa", played: 3, points: 4, goalsFor: 3, goalsAgainst: 3, goalDifference: 0 },
      ],
      [
        {
          id: "h2h",
          completed: true,
          state: "post",
          date: "2026-06-11T19:00:00Z",
          detail: "FT",
          homeTeam: "Mexico",
          awayTeam: "South Africa",
          homeScore: 0,
          awayScore: 1,
          winner: "South Africa",
          loser: "Mexico",
        },
      ],
    );
    const fairPlayOrder = sortGroupStats(
      [
        { team: "Germany", played: 3, points: 4, goalsFor: 3, goalsAgainst: 3, goalDifference: 0 },
        { team: "Paraguay", played: 3, points: 4, goalsFor: 3, goalsAgainst: 3, goalDifference: 0 },
      ],
      [],
      { fairPlayPointsByTeam: { Germany: 2, Paraguay: 6 } },
    );
    const rankingOrder = sortGroupStats(
      [
        { team: "Germany", played: 3, points: 4, goalsFor: 3, goalsAgainst: 3, goalDifference: 0 },
        { team: "Paraguay", played: 3, points: 4, goalsFor: 3, goalsAgainst: 3, goalDifference: 0 },
      ],
      [],
      {
        fairPlayPointsByTeam: { Germany: 2, Paraguay: 2 },
        fifaRankByTeam: { Germany: 11, Paraguay: 47 },
      },
    );

    expect(headToHeadOrder.map((item) => item.team)).toEqual(["South Africa", "Mexico"]);
    expect(fairPlayOrder.map((item) => item.team)).toEqual(["Germany", "Paraguay"]);
    expect(rankingOrder.map((item) => item.team)).toEqual(["Germany", "Paraguay"]);
  });

  it("uses FIFA Winner and penalty fields for shootout winners", () => {
    const parsed = parseFifaMatch(
      fifaMatchFixture({
        id: "shootout",
        stage: "Round of 16",
        group: "",
        resultType: 2,
        home: "Switzerland",
        away: "Colombia",
        homeScore: 0,
        awayScore: 0,
        homePenaltyScore: 4,
        awayPenaltyScore: 3,
        winner: "Switzerland",
      }),
      createTeamResolver(typedPicks, aliases),
    );

    expect(parsed.detail).toBe("FT-Pens");
    expect(parsed.winner).toBe("Switzerland");
    expect(parsed.loser).toBe("Colombia");
    expect(parsed.homePenaltyScore).toBe(4);
    expect(parsed.awayPenaltyScore).toBe(3);
  });

  it("computes FIFA bonus results from team stats and timelines", () => {
    expect(
      computeGoalBonusResultsFromFifaTeamStats([
        { team: "France", stats: [["Goals", 14], ["GoalsConceded", 2]] },
        { team: "Argentina", stats: [["Goals", 14], ["GoalsConceded", 5]] },
        { team: "Germany", stats: [["Goals", 11], ["GoalsConceded", 5]] },
        { team: "Iraq", stats: [["Goals", 1], ["GoalsConceded", 12]] },
        { team: "Tunisia", stats: [["Goals", 2], ["GoalsConceded", 12]] },
      ]),
    ).toEqual({
      mostGoalsScored: ["Argentina", "France"],
      mostGoalsConceded: ["Iraq", "Tunisia"],
    });
    expect(
      computeCardPointsFromFifaTeamStats([
        { team: "Egypt", stats: [["YellowCards", 12], ["DirectRedCards", 0], ["IndirectRedCards", 0]] },
        { team: "Paraguay", stats: [["YellowCards", 9], ["DirectRedCards", 1], ["IndirectRedCards", 0]] },
        { team: "South Africa", stats: [["YellowCards", 5], ["DirectRedCards", 2], ["IndirectRedCards", 0]] },
      ]),
    ).toEqual({
      Egypt: 12,
      Paraguay: 13,
      "South Africa": 13,
    });
    expect(
      computeFarthestGoalFromFifaTimelines(
        [
          {
            Event: [
              { Type: 0, IdTeam: "43850", PositionX: 29.29916, PositionY: 53.839553 },
              { Type: 0, IdTeam: "43924", PositionX: 90, PositionY: 50 },
              { Type: 0, IdTeam: "43924", PositionX: 1, PositionY: 50, Period: 9 },
            ],
          },
        ],
        new Map([
          ["43850", "Cape Verde"],
          ["43924", "Brazil"],
        ]),
      ),
    ).toEqual(["Cape Verde"]);
    expect(
      computeBestPassCompletionFromFifaTeamStats([
        { team: "Spain", stats: [["Passes", 1000], ["PassesCompleted", 911]] },
        { team: "Portugal", stats: [["Passes", 1001], ["PassesCompleted", 912]] },
        { team: "Brazil", stats: [["Passes", 1000], ["PassesCompleted", 910]] },
      ]),
    ).toEqual(["Portugal", "Spain"]);
  });

  it("computes FIFA Fair Play points from live match bookings", () => {
    const resolveTeam = createTeamResolver(typedPicks, aliases);
    const fifaMatches = [
      {
        HomeTeam: {
          ShortClubName: "USA",
          Bookings: [
            { Card: 1, IdPlayer: "usa-second-yellow" },
            { Card: 2, IdPlayer: "usa-second-yellow" },
          ],
        },
        AwayTeam: {
          ShortClubName: "Korea Republic",
          Bookings: [{ Card: 1 }, { Card: 1 }, { Card: 1 }, { Card: 1 }, { Card: 1 }],
        },
      },
      {
        HomeTeam: {
          ShortClubName: "South Africa",
          Bookings: [
            { Card: 1, IdPlayer: "south-africa-direct-red" },
            { Card: 3, IdPlayer: "south-africa-direct-red" },
          ],
        },
        AwayTeam: {
          ShortClubName: "USA",
          Bookings: [{ Card: 3 }],
        },
      },
    ];

    expect(computeCardPointsFromFifaLiveMatches(fifaMatches, resolveTeam)).toEqual({
      "South Africa": 5,
      "South Korea": 5,
      "United States": 7,
    });
    expect(computeMostCardsFromFifaLiveMatches(fifaMatches, resolveTeam)).toEqual(["United States"]);
  });

  it("populates third-place groups only when every FIFA group is final", () => {
    const events = Object.entries(typedPicks.groups).map(([groupId, group], index) =>
      fifaMatchFixture({
        id: `group-${groupId}-complete`,
        matchNumber: index + 1,
        group: `Group ${groupId}`,
        date: `2026-06-${String(11 + index).padStart(2, "0")}T17:00:00Z`,
        home: group.teams[0]?.name ?? "Mexico",
        away: group.teams[2]?.name ?? "South Africa",
        homeScore: 1,
        awayScore: 0,
        winner: group.teams[0]?.name ?? "Mexico",
      }),
    );
    const results = buildResultsFromFifaMatches(events, {
      picks: typedPicks,
      aliases,
      now: "2026-06-27T23:00:00.000Z",
    });

    expect(results.topThirdGroups).toHaveLength(8);
  });

  it("derives knockout advancement from completed FIFA knockout winners", () => {
    const results = buildResultsFromFifaMatches(
      [
        fifaMatchFixture({
          id: "r32-1",
          matchNumber: 81,
          stage: "Round of 32",
          group: "",
          date: "2026-06-29T20:30:00Z",
          home: "Germany",
          away: "Paraguay",
          homeScore: 3,
          awayScore: 1,
          winner: "Germany",
        }),
      ],
      {
        picks: typedPicks,
        aliases,
        now: "2026-06-29T23:00:00.000Z",
      },
    );

    expect(results.roundOf16).toEqual(["Germany"]);
  });

  it("rejects manual match overrides that would create synthetic scores", () => {
    expect(() =>
      buildResultsFromFifaMatches([], {
        picks: typedPicks,
        aliases,
        manualOverrides: {
          matches: [
            {
              id: "manual-only",
              homeTeam: "Mexico",
              awayTeam: "South Africa",
              homeScore: 99,
              awayScore: 0,
            },
          ],
        },
      }),
    ).toThrow(/does not match an official FIFA match/);
  });

  it("does not let empty manual bonus placeholders erase automatic FIFA bonus results", () => {
    const results = buildResultsFromFifaMatches(
      [
        fifaMatchFixture({
          id: "group-a-1",
          home: "Mexico",
          away: "South Africa",
          homeScore: 2,
          awayScore: 0,
          winner: "Mexico",
        }),
      ],
      {
        picks: typedPicks,
        aliases,
        fifaBonusResults: {
          mostCards: {
            Mexico: 2,
          },
        },
        manualOverrides: {
          bonus: {
            mostCards: [],
          },
        },
      },
    );

    expect(results.bonus?.mostCards).toEqual({ Mexico: 2 });
  });

  it("keeps user-facing World Cup source labels FIFA-only", () => {
    const sourceText = JSON.stringify({
      links: WORLD_CUP_REFERENCE_LINKS,
      meta: (resultsJson as PoolResults).meta,
    });
    const files = [
      "src/lib/world-cup-pool/reference-urls.ts",
      "src/components/app/site-footer.tsx",
      "src/data/marcins-world-cup-2026/results.json",
    ].map((file) => readFileSync(path.join(process.cwd(), file), "utf8"));

    expect(sourceText).not.toMatch(/ESPN|third-party/i);
    for (const fileText of files) {
      expect(fileText).not.toMatch(/ESPN|site\.api\.espn/i);
    }
  });
});

import { buildLeaderboardRows } from "@/lib/world-cup-pool/leaderboard";
import {
  calculateMatchChances,
  type MatchChanceKey,
} from "@/lib/world-cup-pool/match-chances";
import {
  buildGroupResults,
  computeBonusResults,
  selectTopThirdGroups,
} from "@/lib/world-cup-pool/results-updater";
import type {
  EntriesConfig,
  EntryPicks,
  LeaderboardRow,
  MatchResult,
  PoolResults,
} from "@/lib/world-cup-pool/types";

type OutcomeKey = MatchChanceKey;

export type TodayOutcomeProjection = {
  matchId: string;
  outcome: OutcomeKey;
  label: string;
  scoreline: string;
  rank: number;
  total: number;
  rankChange: number;
  pointChange: number;
  chancePercent: number;
  playersAboveAlsoHelped: number;
  chasersCanRiseAbove: number;
  helpsRise: boolean;
};

export type TodayMatchProjection = {
  match: MatchResult;
  groupId: string;
  outcomes: TodayOutcomeProjection[];
};

export type TodayScenarioProjection = {
  rank: number;
  total: number;
  rankChange: number;
  pointChange: number;
  playersAboveAlsoHelped: number;
  chasersCanRiseAbove: number;
  outcomes: TodayOutcomeProjection[];
};

export type TodaysResultsReport = {
  dateLabel: string;
  currentRank: number;
  currentTotal: number;
  bestRank: number;
  bestTotal: number;
  matchCount: number;
  scenarioCount: number;
  risingScenarioCount: number;
  matches: TodayMatchProjection[];
  bestScenarios: TodayScenarioProjection[];
  note?: string;
};

const OUTCOMES: OutcomeKey[] = ["home", "draw", "away"];
const MAX_MATCHES_TO_SIMULATE = 7;
const DEFAULT_TIME_ZONE = "America/Toronto";

function dateKey(value: Date, timeZone = DEFAULT_TIME_ZONE) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function formatDateLabel(value: Date, timeZone = DEFAULT_TIME_ZONE) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(value);
}

function matchTime(match: MatchResult) {
  const time = new Date(match.date).getTime();
  return Number.isFinite(time) ? time : 0;
}

function findGroupId(picks: EntryPicks, match: MatchResult) {
  for (const [groupId, group] of Object.entries(picks.groups)) {
    const teams = new Set(group.teams.map((team) => team.name));
    if (teams.has(match.homeTeam) && teams.has(match.awayTeam)) return groupId;
  }
  return "";
}

function outcomeScores(match: MatchResult, outcome: OutcomeKey) {
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;

  if (outcome === "home") {
    return [Math.max(homeScore, awayScore + 1), awayScore] as const;
  }

  if (outcome === "away") {
    return [homeScore, Math.max(awayScore, homeScore + 1)] as const;
  }

  const tiedScore = Math.max(homeScore, awayScore);
  return [tiedScore, tiedScore] as const;
}

function outcomeLabel(match: MatchResult, outcome: OutcomeKey) {
  if (outcome === "home") return `${match.homeTeam} win`;
  if (outcome === "away") return `${match.awayTeam} win`;
  return "Draw";
}

function completedMatch(match: MatchResult, outcome: OutcomeKey): MatchResult {
  const [homeScore, awayScore] = outcomeScores(match, outcome);
  const homeWin = homeScore > awayScore;
  const awayWin = awayScore > homeScore;

  return {
    ...match,
    state: "post",
    completed: true,
    detail: "FT",
    homeScore,
    awayScore,
    winner: homeWin ? match.homeTeam : awayWin ? match.awayTeam : "",
    loser: homeWin ? match.awayTeam : awayWin ? match.homeTeam : "",
  };
}

function scoreline(match: MatchResult, outcome: OutcomeKey) {
  const [homeScore, awayScore] = outcomeScores(match, outcome);
  return `${homeScore}-${awayScore}`;
}

function groupStageFinal(groups: NonNullable<PoolResults["groups"]>) {
  return "ABCDEFGHIJKL".split("").every((groupId) => groups[groupId]?.status === "final");
}

function scenarioResults(
  results: PoolResults,
  picks: EntryPicks,
  choices: Map<string, OutcomeKey>,
): PoolResults {
  const matches = (results.matches ?? []).map((match) => {
    const outcome = choices.get(match.id);
    return outcome ? completedMatch(match, outcome) : match;
  });
  const groups = buildGroupResults(matches, picks);

  return {
    ...results,
    matches,
    groups,
    topThirdGroups: groupStageFinal(groups)
      ? selectTopThirdGroups(groups)
      : (results.topThirdGroups ?? []),
    bonus: computeBonusResults(groups, picks),
  };
}

function targetRow(rows: LeaderboardRow[], entryId: string): LeaderboardRow | undefined {
  return rows.find((row) => row.id === entryId);
}

function rowsById(rows: LeaderboardRow[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

function protectedRank({
  currentRows,
  scenarioRows,
  entryId,
  total,
}: {
  currentRows: LeaderboardRow[];
  scenarioRows: LeaderboardRow[];
  entryId: string;
  total: number;
}) {
  const scenarioById = rowsById(scenarioRows);

  const entriesAbove = currentRows.filter((row) => {
    if (row.id === entryId) return false;

    const projectedTotal = scenarioById.get(row.id)?.score.total ?? row.score.total;
    return Math.max(row.score.total, projectedTotal) > total;
  });

  return entriesAbove.length + 1;
}

function competitionImpact({
  currentRows,
  scenarioRows,
  currentRow,
  scenarioRow,
}: {
  currentRows: LeaderboardRow[];
  scenarioRows: LeaderboardRow[];
  currentRow: LeaderboardRow;
  scenarioRow: LeaderboardRow;
}) {
  const scenarioById = rowsById(scenarioRows);

  return currentRows.reduce(
    (totals, row) => {
      if (row.id === currentRow.id) return totals;

      const projected = scenarioById.get(row.id);
      if (!projected) return totals;

      if (row.rank < currentRow.rank && projected.score.total > row.score.total) {
        totals.playersAboveAlsoHelped += 1;
      }

      if (
        row.rank >= currentRow.rank &&
        Math.max(row.score.total, projected.score.total) > scenarioRow.score.total
      ) {
        totals.chasersCanRiseAbove += 1;
      }

      return totals;
    },
    {
      playersAboveAlsoHelped: 0,
      chasersCanRiseAbove: 0,
    },
  );
}

function combinations(matches: MatchResult[]) {
  const output: Map<string, OutcomeKey>[] = [];

  function walk(index: number, choices: Map<string, OutcomeKey>) {
    const match = matches[index];
    if (!match) {
      output.push(new Map(choices));
      return;
    }

    for (const outcome of OUTCOMES) {
      choices.set(match.id, outcome);
      walk(index + 1, choices);
    }
    choices.delete(match.id);
  }

  walk(0, new Map());
  return output;
}

function optionProjection(
  match: MatchResult,
  outcome: OutcomeKey,
  row: LeaderboardRow,
  currentRow: LeaderboardRow,
  impact = {
    playersAboveAlsoHelped: 0,
    chasersCanRiseAbove: 0,
  },
): TodayOutcomeProjection {
  const chances = calculateMatchChances(match);

  return {
    matchId: match.id,
    outcome,
    label: outcomeLabel(match, outcome),
    scoreline: scoreline(match, outcome),
    rank: row.rank,
    total: row.score.total,
    rankChange: currentRow.rank - row.rank,
    pointChange: row.score.total - currentRow.score.total,
    chancePercent: chances[outcome],
    playersAboveAlsoHelped: impact.playersAboveAlsoHelped,
    chasersCanRiseAbove: impact.chasersCanRiseAbove,
    helpsRise: row.rank < currentRow.rank,
  };
}

export function buildTodaysResultsReport({
  entriesConfig,
  picksByPath,
  results,
  entryId,
  referencePicks,
  now = results.meta?.lastUpdated ? new Date(results.meta.lastUpdated) : new Date(),
  timeZone = DEFAULT_TIME_ZONE,
}: {
  entriesConfig: EntriesConfig;
  picksByPath: Map<string, EntryPicks>;
  results: PoolResults;
  entryId: string;
  referencePicks: EntryPicks;
  now?: Date;
  timeZone?: string;
}): TodaysResultsReport | null {
  const currentRows = buildLeaderboardRows(entriesConfig, picksByPath, results);
  const currentRow = targetRow(currentRows, entryId);
  if (!currentRow) return null;

  const today = dateKey(now, timeZone);
  const todaysMatches = (results.matches ?? [])
    .filter(
      (match) =>
        !match.completed &&
        match.state !== "post" &&
        dateKey(new Date(match.date), timeZone) === today,
    )
    .sort((a, b) => matchTime(a) - matchTime(b));
  const simulatedMatches = todaysMatches.slice(0, MAX_MATCHES_TO_SIMULATE);

  if (simulatedMatches.length === 0) {
    return {
      dateLabel: formatDateLabel(now, timeZone),
      currentRank: currentRow.rank,
      currentTotal: currentRow.score.total,
      bestRank: currentRow.rank,
      bestTotal: currentRow.score.total,
      matchCount: 0,
      scenarioCount: 0,
      risingScenarioCount: 0,
      matches: [],
      bestScenarios: [],
    };
  }

  const matches = simulatedMatches.map<TodayMatchProjection>((match) => {
    const outcomes = OUTCOMES.map((outcome) => {
      const choices = new Map([[match.id, outcome]]);
      const projectedResults = scenarioResults(results, referencePicks, choices);
      const scenarioRows = buildLeaderboardRows(
        entriesConfig,
        picksByPath,
        projectedResults,
      );
      const row = targetRow(scenarioRows, entryId);
      const protectedRow = row
        ? {
            ...row,
            rank: protectedRank({
              currentRows,
              scenarioRows,
              entryId,
              total: row.score.total,
            }),
          }
        : undefined;
      const impact = competitionImpact({
        currentRows,
        scenarioRows,
        currentRow,
        scenarioRow: protectedRow ?? currentRow,
      });

      return optionProjection(
        match,
        outcome,
        protectedRow ?? currentRow,
        currentRow,
        impact,
      );
    });

    return {
      match,
      groupId: findGroupId(referencePicks, match),
      outcomes,
    };
  });

  const scenarios = combinations(simulatedMatches)
    .map<TodayScenarioProjection | null>((choices) => {
      const projectedResults = scenarioResults(results, referencePicks, choices);
      const scenarioRows = buildLeaderboardRows(
        entriesConfig,
        picksByPath,
        projectedResults,
      );
      const row = targetRow(scenarioRows, entryId);
      if (!row) return null;
      const protectedScenarioRow = {
        ...row,
        rank: protectedRank({
          currentRows,
          scenarioRows,
          entryId,
          total: row.score.total,
        }),
      };

      const impact = competitionImpact({
        currentRows,
        scenarioRows,
        currentRow,
        scenarioRow: protectedScenarioRow,
      });

      const outcomes = simulatedMatches.map((match) =>
        optionProjection(
          match,
          choices.get(match.id) ?? "draw",
          protectedScenarioRow,
          currentRow,
          impact,
        ),
      );

      return {
        rank: protectedScenarioRow.rank,
        total: protectedScenarioRow.score.total,
        rankChange: currentRow.rank - protectedScenarioRow.rank,
        pointChange: row.score.total - currentRow.score.total,
        playersAboveAlsoHelped: impact.playersAboveAlsoHelped,
        chasersCanRiseAbove: impact.chasersCanRiseAbove,
        outcomes,
      };
    })
    .filter((scenario): scenario is TodayScenarioProjection => Boolean(scenario));

  const risingScenarios = scenarios.filter((scenario) => scenario.rank < currentRow.rank);
  const bestSource = risingScenarios.length ? risingScenarios : scenarios;
  const bestScenarios = bestSource
    .slice()
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      if (b.total !== a.total) return b.total - a.total;
      return b.pointChange - a.pointChange;
    })
    .slice(0, 3);
  const bestOverall = bestScenarios[0];

  return {
    dateLabel: formatDateLabel(now, timeZone),
    currentRank: currentRow.rank,
    currentTotal: currentRow.score.total,
    bestRank: bestOverall?.rank ?? currentRow.rank,
    bestTotal: bestOverall?.total ?? currentRow.score.total,
    matchCount: todaysMatches.length,
    scenarioCount: scenarios.length,
    risingScenarioCount: risingScenarios.length,
    matches,
    bestScenarios,
    note:
      todaysMatches.length > simulatedMatches.length
        ? `Showing the first ${MAX_MATCHES_TO_SIMULATE} unfinished matches today.`
        : undefined,
  };
}

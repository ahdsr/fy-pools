import { buildLeaderboardRows } from "@/lib/world-cup-pool/leaderboard";
import { buildOpponentPathsReport } from "@/lib/world-cup-pool/opponent-paths";
import {
  matchOutcomes,
  outcomeLabel,
  scenarioResults,
  type OutcomeKey,
} from "@/lib/world-cup-pool/todays-results";
import type {
  EntriesConfig,
  EntryPicks,
  LeaderboardRow,
  MatchResult,
  PoolResults,
} from "@/lib/world-cup-pool/types";

export type FutureLeverageOutcome = {
  outcome: OutcomeKey;
  label: string;
  rank: number;
  total: number;
  pointChange: number;
  rankChange: number;
  entriesPassed: string[];
  chasersPassing: string[];
};

export type FutureLeverageMatch = {
  id: string;
  date: string;
  detail: string;
  homeTeam: string;
  awayTeam: string;
  bestOutcome: FutureLeverageOutcome;
  worstOutcome: FutureLeverageOutcome;
  outcomes: FutureLeverageOutcome[];
  pathNotes: string[];
};

export type FutureLeverageChaser = {
  id: string;
  name: string;
  rank: number;
  total: number;
  gap: number;
  neededSwing: number;
  routeCovered: number;
  routeComplete: boolean;
  routeEvents: {
    title: string;
    points: number;
    category: string;
  }[];
  matches: {
    id: string;
    date: string;
    homeTeam: string;
    awayTeam: string;
    detail: string;
    preferredOutcome: string;
    playerValue: number;
    opponentValue: number;
  }[];
};

export type FutureRaceMatch = {
  id: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  detail: string;
  preferredOutcome: string;
  points: number;
  stage: "roundOf32" | "roundOf16" | "quarterFinal" | "semiFinal" | "final";
};

export type FutureRaceEntry = {
  id: string;
  name: string;
  rank: number;
  total: number;
  relation: "ahead" | "target" | "chaser";
  gapToTarget: number;
  neededSwing: number;
  routeComplete: boolean;
  routeEvents: {
    title: string;
    points: number;
    category: string;
  }[];
  matches: FutureRaceMatch[];
};

export type FutureRaceMovement = {
  id: string;
  name: string;
  currentRank: number;
  currentTotal: number;
  projectedRank: number;
  projectedTotal: number;
  rankDelta: number;
  totalDelta: number;
};

export type FutureRaceMilestoneOutcome = {
  outcome: OutcomeKey;
  label: string;
  movements: FutureRaceMovement[];
};

export type FutureRaceMilestone = {
  id: string;
  date: string;
  detail: string;
  homeTeam: string;
  awayTeam: string;
  stage: FutureRaceMatch["stage"];
  outcomes: FutureRaceMilestoneOutcome[];
};

export type FutureLeverageReport = {
  target: {
    id: string;
    name: string;
    rank: number;
    total: number;
  };
  raceEntries: FutureRaceEntry[];
  raceMilestones: FutureRaceMilestone[];
  matches: FutureLeverageMatch[];
  chasers: FutureLeverageChaser[];
};

const MAX_MATCHES = 12;
const MAX_CHASERS = 8;
const MAX_RACE_ENTRIES = 10;

function matchTime(match: MatchResult) {
  const time = new Date(match.date).getTime();
  return Number.isFinite(time) ? time : 0;
}

function unfinishedMatches(results: PoolResults) {
  return (results.matches ?? [])
    .filter((match) => !match.completed && match.state !== "post")
    .sort((a, b) => matchTime(a) - matchTime(b));
}

function rowsById(rows: LeaderboardRow[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

function projectedRank({
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

function directOutcomeImpact({
  currentRows,
  scenarioRows,
  currentRow,
  targetRow,
}: {
  currentRows: LeaderboardRow[];
  scenarioRows: LeaderboardRow[];
  currentRow: LeaderboardRow;
  targetRow: LeaderboardRow;
}) {
  const scenarioById = rowsById(scenarioRows);
  const entriesPassed: string[] = [];
  const chasersPassing: string[] = [];

  for (const row of currentRows) {
    if (row.id === currentRow.id) continue;

    const projected = scenarioById.get(row.id);
    const protectedTotal = Math.max(
      row.score.total,
      projected?.score.total ?? row.score.total,
    );

    if (row.rank < currentRow.rank && protectedTotal <= targetRow.score.total) {
      entriesPassed.push(row.name);
    }

    if (row.rank >= currentRow.rank && protectedTotal > targetRow.score.total) {
      chasersPassing.push(row.name);
    }
  }

  return { entriesPassed, chasersPassing };
}

function outcomeSort(a: FutureLeverageOutcome, b: FutureLeverageOutcome) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  if (b.total !== a.total) return b.total - a.total;
  return a.chasersPassing.length - b.chasersPassing.length;
}

function worstOutcomeSort(a: FutureLeverageOutcome, b: FutureLeverageOutcome) {
  if (b.chasersPassing.length !== a.chasersPassing.length) {
    return b.chasersPassing.length - a.chasersPassing.length;
  }
  if (b.rank !== a.rank) return b.rank - a.rank;
  return a.total - b.total;
}

function hasOutcomeImpact(outcome: FutureLeverageOutcome) {
  return (
    outcome.pointChange !== 0 ||
    outcome.rankChange !== 0 ||
    outcome.entriesPassed.length > 0 ||
    outcome.chasersPassing.length > 0
  );
}

function buildMatchReport({
  entriesConfig,
  picksByPath,
  results,
  referencePicks,
  currentRows,
  currentRow,
  match,
  pathNotes,
}: {
  entriesConfig: EntriesConfig;
  picksByPath: Map<string, EntryPicks>;
  results: PoolResults;
  referencePicks: EntryPicks;
  currentRows: LeaderboardRow[];
  currentRow: LeaderboardRow;
  match: MatchResult;
  pathNotes: string[];
}): FutureLeverageMatch | null {
  const outcomes = matchOutcomes(referencePicks, match).map((outcome) => {
    const projectedResults = scenarioResults(
      results,
      referencePicks,
      new Map([[match.id, outcome]]),
    );
    const scenarioRows = buildLeaderboardRows(
      entriesConfig,
      picksByPath,
      projectedResults,
    );
    const projectedTarget = scenarioRows.find((row) => row.id === currentRow.id);
    const targetRow = projectedTarget ?? currentRow;
    const rank = projectedRank({
      currentRows,
      scenarioRows,
      entryId: currentRow.id,
      total: targetRow.score.total,
    });
    const impact = directOutcomeImpact({
      currentRows,
      scenarioRows,
      currentRow,
      targetRow,
    });

    return {
      outcome,
      label: outcomeLabel(match, outcome),
      rank,
      total: targetRow.score.total,
      pointChange: targetRow.score.total - currentRow.score.total,
      rankChange: currentRow.rank - rank,
      entriesPassed: impact.entriesPassed,
      chasersPassing: impact.chasersPassing,
    };
  });
  const directlyMatters = outcomes.some(hasOutcomeImpact);

  if (!directlyMatters && pathNotes.length === 0) return null;

  const bestOutcome = outcomes.slice().sort(outcomeSort)[0];
  const worstOutcome = outcomes.slice().sort(worstOutcomeSort)[0];
  if (!bestOutcome || !worstOutcome) return null;

  return {
    id: match.id,
    date: match.date,
    detail: match.detail,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    bestOutcome,
    worstOutcome,
    outcomes,
    pathNotes,
  };
}

function buildPathNotes(report: ReturnType<typeof buildOpponentPathsReport>) {
  const notesByMatch = new Map<string, string[]>();

  for (const opponent of report?.opponents ?? []) {
    for (const match of opponent.matches) {
      const notes = notesByMatch.get(match.id) ?? [];
      notes.push(
        `${match.preferredOutcome} vs #${opponent.rank} ${opponent.name}`,
      );
      notesByMatch.set(match.id, notes);
    }
  }

  return notesByMatch;
}

function buildChasers({
  entriesConfig,
  picksByPath,
  results,
  currentRows,
  currentRow,
}: {
  entriesConfig: EntriesConfig;
  picksByPath: Map<string, EntryPicks>;
  results: PoolResults;
  currentRows: LeaderboardRow[];
  currentRow: LeaderboardRow;
}) {
  return currentRows
    .filter((row) => row.id !== currentRow.id && row.rank >= currentRow.rank)
    .map<FutureLeverageChaser | null>((row) => {
      const report = buildOpponentPathsReport({
        entriesConfig,
        picksByPath,
        results,
        entryId: row.id,
      });
      const targetPath = report?.opponents.find(
        (opponent) => opponent.id === currentRow.id,
      );
      if (!targetPath) return null;

      return {
        id: row.id,
        name: row.name,
        rank: row.rank,
        total: row.score.total,
        gap: currentRow.score.total - row.score.total,
        neededSwing: targetPath.neededSwing,
        routeCovered: targetPath.routeCovered,
        routeComplete: targetPath.routeComplete,
        routeEvents: targetPath.routeEvents.slice(0, 4).map((event) => ({
          title: event.title,
          points: event.points,
          category: event.category,
        })),
        matches: targetPath.matches.slice(0, 3).map((match) => ({
          id: match.id,
          date: match.date,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          detail: match.detail,
          preferredOutcome: match.preferredOutcome,
          playerValue: match.playerValue,
          opponentValue: match.opponentValue,
        })),
      };
    })
    .filter((chaser): chaser is FutureLeverageChaser => Boolean(chaser))
    .filter((chaser) => chaser.routeComplete)
    .sort((a, b) => {
      if (a.routeComplete !== b.routeComplete) return a.routeComplete ? -1 : 1;
      if (a.neededSwing !== b.neededSwing) return a.neededSwing - b.neededSwing;
      if (b.routeCovered !== a.routeCovered) return b.routeCovered - a.routeCovered;
      return a.rank - b.rank;
    })
    .slice(0, MAX_CHASERS);
}

function routeEventsForTarget(
  report: ReturnType<typeof buildOpponentPathsReport>,
  opponentId: string,
) {
  const path = report?.opponents.find((opponent) => opponent.id === opponentId);
  if (!path) return null;

  return {
    neededSwing: path.neededSwing,
    routeComplete: path.routeComplete,
    routeEvents: path.routeEvents.slice(0, 2).map((event) => ({
      title: event.title,
      points: event.points,
      category: event.category,
    })),
    matches: path.matches.slice(0, 3).map((match) => ({
      id: match.id,
      date: match.date,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      detail: match.detail,
      preferredOutcome: match.preferredOutcome,
      points: match.playerValue,
      stage: stageForMatch(match.date),
    })),
  };
}

function stageForMatch(date: string): FutureRaceMatch["stage"] {
  const time = new Date(date).getTime();
  if (!Number.isFinite(time)) return "roundOf32";

  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(time));

  if (day <= "2026-07-03") return "roundOf32";
  if (day <= "2026-07-07") return "roundOf16";
  if (day <= "2026-07-12") return "quarterFinal";
  if (day <= "2026-07-15") return "semiFinal";
  return "final";
}

function buildRaceEntries({
  entriesConfig,
  picksByPath,
  results,
  currentRows,
  currentRow,
  opponentReport,
  targetMatches,
}: {
  entriesConfig: EntriesConfig;
  picksByPath: Map<string, EntryPicks>;
  results: PoolResults;
  currentRows: LeaderboardRow[];
  currentRow: LeaderboardRow;
  opponentReport: ReturnType<typeof buildOpponentPathsReport>;
  targetMatches: FutureLeverageMatch[];
}) {
  return currentRows.slice(0, MAX_RACE_ENTRIES).map<FutureRaceEntry>((row) => {
    if (row.id === currentRow.id) {
      return {
        id: row.id,
        name: row.name,
        rank: row.rank,
        total: row.score.total,
        relation: "target",
        gapToTarget: 0,
        neededSwing: 0,
        routeComplete: true,
        routeEvents: [],
        matches: targetMatches
          .filter(
            (match) =>
              match.bestOutcome.pointChange > 0 ||
              match.bestOutcome.rankChange > 0,
          )
          .slice(0, 3)
          .map((match) => ({
            id: match.id,
            date: match.date,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            detail: match.detail,
            preferredOutcome: match.bestOutcome.label,
            points: match.bestOutcome.pointChange,
            stage: stageForMatch(match.date),
          })),
      };
    }

    const relation = row.rank < currentRow.rank ? "ahead" : "chaser";
    const path =
      relation === "ahead"
        ? routeEventsForTarget(opponentReport, row.id)
        : routeEventsForTarget(
            buildOpponentPathsReport({
              entriesConfig,
              picksByPath,
              results,
              entryId: row.id,
            }),
            currentRow.id,
          );

    return {
      id: row.id,
      name: row.name,
      rank: row.rank,
      total: row.score.total,
      relation,
      gapToTarget: row.score.total - currentRow.score.total,
      neededSwing: path?.neededSwing ?? Math.max(0, Math.abs(row.score.total - currentRow.score.total) + 1),
      routeComplete: path?.routeComplete ?? false,
      routeEvents: path?.routeEvents ?? [],
      matches: path?.matches ?? [],
    };
  });
}

function buildRaceMilestones({
  entriesConfig,
  picksByPath,
  results,
  referencePicks,
  currentRows,
}: {
  entriesConfig: EntriesConfig;
  picksByPath: Map<string, EntryPicks>;
  results: PoolResults;
  referencePicks: EntryPicks;
  currentRows: LeaderboardRow[];
}) {
  const trackedRows = currentRows.slice(0, MAX_RACE_ENTRIES);

  return unfinishedMatches(results)
    .slice(0, MAX_MATCHES)
    .map<FutureRaceMilestone>((match) => {
      const outcomes = matchOutcomes(referencePicks, match).map((outcome) => {
        const projectedResults = scenarioResults(
          results,
          referencePicks,
          new Map([[match.id, outcome]]),
        );
        const scenarioRows = buildLeaderboardRows(
          entriesConfig,
          picksByPath,
          projectedResults,
        );
        const scenarioById = rowsById(scenarioRows);

        return {
          outcome,
          label: outcomeLabel(match, outcome),
          movements: trackedRows.map((row) => {
            const projected = scenarioById.get(row.id) ?? row;

            return {
              id: row.id,
              name: row.name,
              currentRank: row.rank,
              currentTotal: row.score.total,
              projectedRank: projected.rank,
              projectedTotal: projected.score.total,
              rankDelta: row.rank - projected.rank,
              totalDelta: projected.score.total - row.score.total,
            };
          }),
        };
      });

      return {
        id: match.id,
        date: match.date,
        detail: match.detail,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        stage: stageForMatch(match.date),
        outcomes,
      };
    });
}

export function buildFutureLeverageReport({
  entriesConfig,
  picksByPath,
  results,
  entryId,
  referencePicks,
}: {
  entriesConfig: EntriesConfig;
  picksByPath: Map<string, EntryPicks>;
  results: PoolResults;
  entryId: string;
  referencePicks: EntryPicks;
}): FutureLeverageReport | null {
  const currentRows = buildLeaderboardRows(entriesConfig, picksByPath, results);
  const currentRow = currentRows.find((row) => row.id === entryId);
  if (!currentRow) return null;

  const opponentReport = buildOpponentPathsReport({
    entriesConfig,
    picksByPath,
    results,
    entryId,
  });
  const notesByMatch = buildPathNotes(opponentReport);
  const matches = unfinishedMatches(results)
    .map((match) =>
      buildMatchReport({
        entriesConfig,
        picksByPath,
        results,
        referencePicks,
        currentRows,
        currentRow,
        match,
        pathNotes: (notesByMatch.get(match.id) ?? []).slice(0, 3),
      }),
    )
    .filter((match): match is FutureLeverageMatch => Boolean(match))
    .slice(0, MAX_MATCHES);

  return {
    target: {
      id: currentRow.id,
      name: currentRow.name,
      rank: currentRow.rank,
      total: currentRow.score.total,
    },
    raceEntries: buildRaceEntries({
      entriesConfig,
      picksByPath,
      results,
      currentRows,
      currentRow,
      opponentReport,
      targetMatches: matches,
    }),
    raceMilestones: buildRaceMilestones({
      entriesConfig,
      picksByPath,
      results,
      referencePicks,
      currentRows,
    }),
    matches,
    chasers: buildChasers({
      entriesConfig,
      picksByPath,
      results,
      currentRows,
      currentRow,
    }),
  };
}

import { buildLeaderboardRows } from "@/lib/world-cup-pool/leaderboard";
import {
  buildKnockoutResults,
  isGroupStageFinal,
  selectTopThirdGroups,
} from "@/lib/world-cup-pool/results-updater";
import { normalizeName } from "@/lib/world-cup-pool/scoring";
import type {
  EntriesConfig,
  EntryPicks,
  LeaderboardRow,
  MatchResult,
  PoolResults,
} from "@/lib/world-cup-pool/types";

export type TournamentRaceSelections = Record<string, string>;

export type TournamentRaceMatch = {
  id: string;
  label: string;
  stage: "quarterFinal" | "semiFinal" | "thirdPlace" | "final" | "knockout";
  date: string;
  homeTeam: string;
  awayTeam: string;
  winner: string;
  completed: boolean;
  selectable: boolean;
};

export type TournamentRaceEntry = {
  id: string;
  name: string;
  rank: number;
  total: number;
};

export type TournamentRaceCheckpoint = {
  id: string;
  label: string;
  entries: TournamentRaceEntry[];
};

export type TournamentRaceModel = {
  matches: TournamentRaceMatch[];
  checkpoints: TournamentRaceCheckpoint[];
  trackedEntries: TournamentRaceEntry[];
  normalizedSelections: TournamentRaceSelections;
  selectionCount: number;
  totalSelectableMatches: number;
};

export type TournamentRaceEntryProjection = {
  rank: number;
  total: number;
  standings: TournamentRaceEntry[];
};

type ResolvedMatch = MatchResult & {
  original: MatchResult;
  official: boolean;
  selectable: boolean;
};

const WINNER_TOKEN = /^W(\d+)$/i;
const RUNNER_UP_TOKEN = /^RU(\d+)$/i;

function allMatches(results: PoolResults) {
  const seen = new Set<string>();

  return [...(results.matches ?? []), ...(results.fixtures ?? [])]
    .filter((match) => {
      const key = match.id || `${match.date}|${match.homeTeam}|${match.awayTeam}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function teamGroups(picks: EntryPicks) {
  const groups = new Map<string, string>();

  for (const [groupId, group] of Object.entries(picks.groups)) {
    for (const team of group.teams) {
      groups.set(normalizeName(team.name), groupId);
    }
  }

  return groups;
}

function isKnockoutMatch(match: MatchResult, groupsByTeam: Map<string, string>) {
  const homeGroup = groupsByTeam.get(normalizeName(match.homeTeam));
  const awayGroup = groupsByTeam.get(normalizeName(match.awayTeam));
  return !homeGroup || homeGroup !== awayGroup;
}

function matchStage(match: MatchResult): TournamentRaceMatch["stage"] {
  const text = [
    match.name,
    match.stage,
    match.shortName,
    match.homeTeam,
    match.awayTeam,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    text.includes("third") ||
    text.includes("3rd") ||
    text.includes("play-off") ||
    /\b(?:ru\d*|runner[- ]?up|loser)\b/.test(text)
  ) {
    return "thirdPlace";
  }
  if (text.includes("quarter")) return "quarterFinal";
  if (text.includes("semi")) return "semiFinal";
  if (text.includes("final")) return "final";
  return "knockout";
}

function stageLabel(stage: TournamentRaceMatch["stage"]) {
  switch (stage) {
    case "quarterFinal":
      return "Quarter-final";
    case "semiFinal":
      return "Semi-final";
    case "thirdPlace":
      return "3rd-place match";
    case "final":
      return "Final";
    default:
      return "Knockout match";
  }
}

function resolveTeamToken(
  value: string,
  resolvedByNumber: Map<number, ResolvedMatch>,
) {
  const winnerMatch = value.match(WINNER_TOKEN);
  if (winnerMatch) return resolvedByNumber.get(Number(winnerMatch[1]))?.winner ?? "";

  const loserMatch = value.match(RUNNER_UP_TOKEN);
  if (loserMatch) return resolvedByNumber.get(Number(loserMatch[1]))?.loser ?? "";

  return value;
}

function completedProjection(match: MatchResult, winner: string): MatchResult {
  const homeWins = normalizeName(winner) === normalizeName(match.homeTeam);

  return {
    ...match,
    state: "post",
    completed: true,
    detail: "Projected",
    homeScore: homeWins ? 1 : 0,
    awayScore: homeWins ? 0 : 1,
    winner,
    loser: homeWins ? match.awayTeam : match.homeTeam,
  };
}

function resolveMatches({
  results,
  referencePicks,
  selections,
}: {
  results: PoolResults;
  referencePicks: EntryPicks;
  selections: TournamentRaceSelections;
}) {
  const groupsByTeam = teamGroups(referencePicks);
  const resolvedByNumber = new Map<number, ResolvedMatch>();
  const normalizedSelections: TournamentRaceSelections = {};

  const resolved = allMatches(results).map<ResolvedMatch>((original) => {
    const knockout = isKnockoutMatch(original, groupsByTeam);
    const homeTeam = knockout
      ? resolveTeamToken(original.homeTeam, resolvedByNumber)
      : original.homeTeam;
    const awayTeam = knockout
      ? resolveTeamToken(original.awayTeam, resolvedByNumber)
      : original.awayTeam;
    const base = { ...original, homeTeam, awayTeam };
    const official = original.completed || original.state === "post";
    const selectedWinner = selections[original.id];
    const selectedWinnerIsEligible =
      !official &&
      Boolean(homeTeam && awayTeam) &&
      [homeTeam, awayTeam].some(
        (team) => normalizeName(team) === normalizeName(selectedWinner ?? ""),
      );
    const winner = official
      ? resolveTeamToken(original.winner, resolvedByNumber)
      : selectedWinnerIsEligible
        ? selectedWinner ?? ""
        : "";
    const match = winner && knockout ? completedProjection(base, winner) : base;
    const resolvedMatch: ResolvedMatch = {
      ...match,
      winner,
      loser: winner
        ? normalizeName(winner) === normalizeName(homeTeam)
          ? awayTeam
          : homeTeam
        : "",
      original,
      official,
      selectable: knockout && !official && Boolean(homeTeam && awayTeam),
    };

    if (selectedWinnerIsEligible && selectedWinner) {
      normalizedSelections[original.id] = selectedWinner;
    }
    if (knockout && original.matchNumber) {
      resolvedByNumber.set(original.matchNumber, resolvedMatch);
    }

    return resolvedMatch;
  });

  return { resolved, normalizedSelections, groupsByTeam };
}

function mergedTeams(current: string[] | undefined, projected: string[] | undefined) {
  const output = [...(current ?? [])];
  for (const team of projected ?? []) {
    if (!team || output.some((item) => normalizeName(item) === normalizeName(team))) continue;
    output.push(team);
  }
  return output;
}

function projectedResults({
  results,
  referencePicks,
  resolved,
}: {
  results: PoolResults;
  referencePicks: EntryPicks;
  resolved: ResolvedMatch[];
}): PoolResults {
  const projectedMatches = resolved.map((resolvedMatch) => {
    const { original, official, selectable, ...match } = resolvedMatch;
    void original;
    void official;
    void selectable;
    return match;
  });
  const knockout = buildKnockoutResults(projectedMatches, referencePicks);
  const groups = results.groups ?? {};

  return {
    ...results,
    matches: projectedMatches.filter((match) => match.completed),
    fixtures: projectedMatches.filter((match) => !match.completed),
    groups,
    topThirdGroups: isGroupStageFinal(groups)
      ? selectTopThirdGroups(groups)
      : (results.topThirdGroups ?? []),
    roundOf16: mergedTeams(results.roundOf16, knockout.roundOf16),
    quarterFinalists: mergedTeams(results.quarterFinalists, knockout.quarterFinalists),
    semifinalists: mergedTeams(results.semifinalists, knockout.semifinalists),
    thirdPlaceMatch: mergedTeams(results.thirdPlaceMatch, knockout.thirdPlaceMatch),
    finalists: mergedTeams(results.finalists, knockout.finalists),
    finals: {
      champion: knockout.finals.champion || results.finals?.champion,
      runnerUp: knockout.finals.runnerUp || results.finals?.runnerUp,
      thirdPlace: knockout.finals.thirdPlace || results.finals?.thirdPlace,
    },
  };
}

function checkpointEntries(rows: LeaderboardRow[], trackedIds: Set<string>) {
  return rows
    .filter((row) => trackedIds.has(row.id))
    .map((row) => ({
      id: row.id,
      name: row.name,
      rank: row.rank,
      total: row.score.total,
    }));
}

function checkpointFor({
  id,
  label,
  entriesConfig,
  picksByPath,
  results,
  trackedIds,
}: {
  id: string;
  label: string;
  entriesConfig: EntriesConfig;
  picksByPath: Map<string, EntryPicks>;
  results: PoolResults;
  trackedIds: Set<string>;
}): TournamentRaceCheckpoint {
  return {
    id,
    label,
    entries: checkpointEntries(
      buildLeaderboardRows(entriesConfig, picksByPath, results),
      trackedIds,
    ),
  };
}

function standingsForSelections({
  entriesConfig,
  picksByPath,
  results,
  referencePicks,
  selections,
}: {
  entriesConfig: EntriesConfig;
  picksByPath: Map<string, EntryPicks>;
  results: PoolResults;
  referencePicks: EntryPicks;
  selections: TournamentRaceSelections;
}) {
  const resolved = resolveMatches({ results, referencePicks, selections });
  const completedResults = projectedResults({
    results,
    referencePicks,
    resolved: resolved.resolved,
  });

  return buildLeaderboardRows(entriesConfig, picksByPath, completedResults);
}

/**
 * Exhaustively checks the remaining knockout bracket for one entry's best
 * possible finish. This deliberately uses the same complete-result scoring
 * path as the interactive tournament race, rather than adding isolated
 * scoring events together.
 */
export function findBestTournamentRaceEntryProjection({
  entriesConfig,
  picksByPath,
  results,
  referencePicks,
  entryId,
  maxLeaves = 1_024,
}: {
  entriesConfig: EntriesConfig;
  picksByPath: Map<string, EntryPicks>;
  results: PoolResults;
  referencePicks: EntryPicks;
  entryId: string;
  maxLeaves?: number;
}): TournamentRaceEntryProjection | null {
  const initialModel = buildTournamentRaceModel({
    entriesConfig,
    picksByPath,
    results,
    referencePicks,
  });
  if (initialModel && initialModel.totalSelectableMatches > 10) return null;

  let best: TournamentRaceEntryProjection | null = null;
  let leavesChecked = 0;
  let exceededLimit = false;

  function consider(selections: TournamentRaceSelections) {
    if (leavesChecked >= maxLeaves) {
      exceededLimit = true;
      return;
    }
    leavesChecked += 1;

    const rows = standingsForSelections({
      entriesConfig,
      picksByPath,
      results,
      referencePicks,
      selections,
    });
    const target = rows.find((row) => row.id === entryId);
    if (!target) return;

    const projection = {
      rank: target.rank,
      total: target.score.total,
      standings: rows.map((row) => ({
        id: row.id,
        name: row.name,
        rank: row.rank,
        total: row.score.total,
      })),
    };

    if (
      !best ||
      projection.rank < best.rank ||
      (projection.rank === best.rank && projection.total > best.total)
    ) {
      best = projection;
    }
  }

  function visit(selections: TournamentRaceSelections) {
    if (exceededLimit) return;

    const model = buildTournamentRaceModel({
      entriesConfig,
      picksByPath,
      results,
      referencePicks,
      selections,
    });
    if (!model) {
      consider(selections);
      return;
    }

    const next = model.matches.find(
      (match) => match.selectable && !model.normalizedSelections[match.id],
    );
    if (!next) {
      consider(model.normalizedSelections);
      return;
    }

    visit({ ...model.normalizedSelections, [next.id]: next.homeTeam });
    visit({ ...model.normalizedSelections, [next.id]: next.awayTeam });
  }

  visit({});
  return exceededLimit ? null : best;
}

function raceStartIndex(matches: ResolvedMatch[]) {
  const firstUnsettled = matches.findIndex((match) => !match.official && match.selectable);
  return firstUnsettled === -1 ? matches.length : firstUnsettled;
}

export function buildTournamentRaceModel({
  entriesConfig,
  picksByPath,
  results,
  referencePicks,
  selections = {},
}: {
  entriesConfig: EntriesConfig;
  picksByPath: Map<string, EntryPicks>;
  results: PoolResults;
  referencePicks: EntryPicks;
  selections?: TournamentRaceSelections;
}): TournamentRaceModel | null {
  const currentRows = buildLeaderboardRows(entriesConfig, picksByPath, results);
  const trackedEntries = currentRows.slice(0, 10).map((row) => ({
    id: row.id,
    name: row.name,
    rank: row.rank,
    total: row.score.total,
  }));
  if (!trackedEntries.length) return null;

  const trackedIds = new Set(trackedEntries.map((entry) => entry.id));
  const { resolved, normalizedSelections, groupsByTeam } = resolveMatches({
    results,
    referencePicks,
    selections,
  });
  const knockoutMatches = resolved.filter((match) =>
    isKnockoutMatch(match.original, groupsByTeam),
  );
  const startIndex = raceStartIndex(knockoutMatches);
  const remainder = knockoutMatches.slice(startIndex);
  if (!remainder.length) return null;

  const checkpoints = [
    {
      id: "current",
      label: "Now",
      entries: trackedEntries,
    },
  ];
  const orderedSelections = remainder.filter(
    (match) => normalizedSelections[match.id],
  );

  for (const selectedMatch of orderedSelections) {
    const partialSelections = Object.fromEntries(
      orderedSelections
        .slice(0, orderedSelections.indexOf(selectedMatch) + 1)
        .map((match) => [match.id, normalizedSelections[match.id]]),
    );
    const partial = resolveMatches({
      results,
      referencePicks,
      selections: partialSelections,
    });
    const partialResults = projectedResults({
      results,
      referencePicks,
      resolved: partial.resolved,
    });
    checkpoints.push(
      checkpointFor({
        id: selectedMatch.id,
        label: normalizedSelections[selectedMatch.id],
        entriesConfig,
        picksByPath,
        results: partialResults,
        trackedIds,
      }),
    );
  }

  return {
    matches: remainder.map((match) => ({
      id: match.id,
      label: stageLabel(matchStage(match.original)),
      stage: matchStage(match.original),
      date: match.date,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      winner: match.winner,
      completed: match.official,
      selectable: match.selectable,
    })),
    checkpoints,
    trackedEntries,
    normalizedSelections,
    selectionCount: Object.keys(normalizedSelections).length,
    totalSelectableMatches: remainder.filter((match) => !match.official).length,
  };
}

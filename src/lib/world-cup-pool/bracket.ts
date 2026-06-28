import type {
  EntryPicks,
  MatchPick,
  MatchResult,
  PoolResults,
} from "@/lib/world-cup-pool/types";
import { normalizeName } from "@/lib/world-cup-pool/scoring";

export type BracketTeam = {
  name: string;
  score?: number | null;
  winner?: boolean;
};

export type BracketMatch = {
  id: string;
  label: string;
  detail?: string;
  teams: BracketTeam[];
};

export type BracketRound = {
  key: string;
  label: string;
  matches: BracketMatch[];
};

export type BracketView = {
  rounds: BracketRound[];
  thirdPlace?: BracketMatch;
  sourceLabel: string;
};

const ROUND_DEFINITIONS = [
  { key: "roundOf32", label: "Round of 32", count: 16 },
  { key: "roundOf16", label: "Round of 16", count: 8 },
  { key: "quarterFinals", label: "Quarter-finals", count: 4 },
  { key: "semiFinals", label: "Semi-finals", count: 2 },
] as const;

function numberedRoundLabel(label: string, index: number) {
  return `${index + 1}. ${label}`;
}

function teamGroups(picks: EntryPicks | undefined) {
  const groups = new Map<string, string>();

  for (const [groupId, group] of Object.entries(picks?.groups ?? {})) {
    for (const team of group.teams) {
      groups.set(normalizeName(team.name), groupId);
    }
  }

  return groups;
}

function isGroupStageMatch(
  match: MatchResult,
  groupsByTeam: Map<string, string>,
) {
  const homeGroup = groupsByTeam.get(normalizeName(match.homeTeam));
  const awayGroup = groupsByTeam.get(normalizeName(match.awayTeam));

  return Boolean(homeGroup && awayGroup && homeGroup === awayGroup);
}

function sortedOfficialKnockoutMatches(
  results: PoolResults,
  referencePicks: EntryPicks | undefined,
) {
  const groupsByTeam = teamGroups(referencePicks);

  return (results.matches ?? [])
    .filter((match) => !isGroupStageMatch(match, groupsByTeam))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function matchResultToBracketMatch(
  match: MatchResult,
  label: string,
): BracketMatch {
  return {
    id: match.id,
    label,
    detail: match.detail || undefined,
    teams: [
      {
        name: match.homeTeam,
        score: match.homeScore,
        winner: Boolean(match.winner && normalizeName(match.winner) === normalizeName(match.homeTeam)),
      },
      {
        name: match.awayTeam,
        score: match.awayScore,
        winner: Boolean(match.winner && normalizeName(match.winner) === normalizeName(match.awayTeam)),
      },
    ],
  };
}

function officialBracket(
  results: PoolResults,
  referencePicks: EntryPicks | undefined,
): BracketView | null {
  const matches = sortedOfficialKnockoutMatches(results, referencePicks);
  const expectedMatchCount = ROUND_DEFINITIONS.reduce(
    (total, round) => total + round.count,
    2,
  );

  if (matches.length < expectedMatchCount) {
    return null;
  }

  let cursor = 0;
  const rounds = ROUND_DEFINITIONS.map((round) => {
    const roundMatches = matches.slice(cursor, cursor + round.count);
    cursor += round.count;

    return {
      key: round.key,
      label: round.label,
      matches: roundMatches.map((match, index) =>
        matchResultToBracketMatch(match, numberedRoundLabel(round.label, index)),
      ),
    };
  });
  const thirdPlace = matchResultToBracketMatch(
    matches[cursor],
    "Third-place match",
  );
  const final = matchResultToBracketMatch(matches[cursor + 1], "Final");

  return {
    rounds: [
      ...rounds,
      {
        key: "final",
        label: "Final",
        matches: [final],
      },
    ],
    thirdPlace,
    sourceLabel: "Official match schedule",
  };
}

function pickMatchToBracketMatch(match: MatchPick, label: string): BracketMatch {
  return {
    id: match.id,
    label,
    teams: match.teams.map((team) => ({
      name: team,
      winner: Boolean(match.winner && normalizeName(match.winner) === normalizeName(team)),
    })),
  };
}

export function buildPickedBracketView(
  referencePicks: EntryPicks | undefined,
): BracketView | null {
  if (!referencePicks) return null;

  return {
    rounds: [
      {
        key: "roundOf32",
        label: "Round of 32",
        matches: referencePicks.knockout.roundOf32.map((match, index) =>
          pickMatchToBracketMatch(match, numberedRoundLabel("Round of 32", index)),
        ),
      },
      {
        key: "roundOf16",
        label: "Round of 16",
        matches: referencePicks.knockout.roundOf16.map((match, index) =>
          pickMatchToBracketMatch(match, numberedRoundLabel("Round of 16", index)),
        ),
      },
      {
        key: "quarterFinals",
        label: "Quarter-finals",
        matches: referencePicks.knockout.quarterFinals.map((match, index) =>
          pickMatchToBracketMatch(match, numberedRoundLabel("Quarter-final", index)),
        ),
      },
      {
        key: "semiFinals",
        label: "Semi-finals",
        matches: referencePicks.knockout.semiFinals.map((match, index) =>
          pickMatchToBracketMatch(match, numberedRoundLabel("Semi-final", index)),
        ),
      },
      {
        key: "final",
        label: "Final",
        matches: [
          {
            id: "final",
            label: "Final",
            teams: referencePicks.knockout.final.teams.map((team) => ({
              name: team,
              winner:
                normalizeName(referencePicks.knockout.final.winner) ===
                normalizeName(team),
            })),
          },
        ],
      },
    ],
    thirdPlace: {
      id: "third-place",
      label: "Third-place match",
      teams: referencePicks.knockout.thirdPlace.teams.map((team) => ({
        name: team,
        winner:
          normalizeName(referencePicks.knockout.thirdPlace.winner) ===
          normalizeName(team),
      })),
    },
    sourceLabel: `${referencePicks.meta.owner}'s submitted bracket`,
  };
}

export function buildBracketView(
  results: PoolResults,
  referencePicks: EntryPicks | undefined,
) {
  return officialBracket(results, referencePicks) ?? buildPickedBracketView(referencePicks);
}

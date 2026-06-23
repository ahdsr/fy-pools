import type { LockerRoomMatch } from "@/components/app/locker-room";
import { calculateMatchChances } from "@/lib/world-cup-pool/match-chances";
import { displayTeamName, normalizeName } from "@/lib/world-cup-pool/scoring";
import type {
  EntryPicks,
  MatchResult,
  PoolResults,
} from "@/lib/world-cup-pool/types";

const COMPETITION_LABEL = "FIFA World Cup 2026";

function validMatch(match: MatchResult) {
  return Boolean(match.homeTeam && match.awayTeam && match.date);
}

function matchTime(match: MatchResult) {
  const value = new Date(match.date).getTime();
  return Number.isFinite(value) ? value : 0;
}

export function getReferencePicks(
  picksByPath: Map<string, EntryPicks>,
): EntryPicks | undefined {
  return picksByPath.values().next().value;
}

export function selectCurrentPoolMatch(
  results: PoolResults,
  now = new Date(),
): MatchResult | undefined {
  const matches = (results.matches ?? []).filter(validMatch);
  const liveMatch = matches
    .filter((match) => match.state === "in")
    .sort((a, b) => matchTime(a) - matchTime(b))[0];

  if (liveMatch) return liveMatch;

  const nowTime = now.getTime();
  const upcomingMatches = matches
    .filter(
      (match) =>
        !match.completed &&
        match.state !== "post" &&
        matchTime(match) >= nowTime,
    )
    .sort((a, b) => matchTime(a) - matchTime(b));

  if (upcomingMatches[0]) return upcomingMatches[0];

  const pastMatches = matches
    .filter((match) => matchTime(match) <= nowTime)
    .sort((a, b) => matchTime(b) - matchTime(a));

  if (pastMatches[0]) return pastMatches[0];

  return matches.sort((a, b) => matchTime(a) - matchTime(b))[0];
}

export function findMatchGroupId(
  picks: EntryPicks | undefined,
  homeTeam: string,
  awayTeam: string,
) {
  if (!picks) return "";

  for (const [groupId, group] of Object.entries(picks.groups)) {
    const teams = group.teams.map((team) => normalizeName(team.name));
    if (
      teams.includes(normalizeName(homeTeam)) &&
      teams.includes(normalizeName(awayTeam))
    ) {
      return groupId;
    }
  }

  return "";
}

export function flagCodeForTeam(
  picks: EntryPicks | undefined,
  teamName: string,
) {
  if (!picks) return "";

  for (const group of Object.values(picks.groups)) {
    const team = group.teams.find(
      (item) => normalizeName(item.name) === normalizeName(teamName),
    );
    if (team?.flagCode) return team.flagCode;
  }

  return "";
}

function ordinal(value: number) {
  const suffix =
    value % 100 >= 11 && value % 100 <= 13
      ? "th"
      : value % 10 === 1
        ? "st"
        : value % 10 === 2
          ? "nd"
          : value % 10 === 3
            ? "rd"
            : "th";

  return `${value}${suffix}`;
}

function rankLabel(
  results: PoolResults,
  groupId: string,
  teamName: string,
) {
  const stats = groupId ? results.groups?.[groupId]?.stats ?? [] : [];
  const index = stats.findIndex(
    (item) => normalizeName(item.team) === normalizeName(teamName),
  );

  return index >= 0 ? ordinal(index + 1) : "Side";
}

function formatMatchTime(match: MatchResult) {
  const date = new Date(match.date);
  const formattedDate = Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);

  if (match.state === "in") return match.detail || "Live";
  if (match.completed && match.detail) {
    return formattedDate ? `${match.detail} - ${formattedDate}` : match.detail;
  }

  return formattedDate || match.detail || "Match day";
}

function formatMatchScore(match: MatchResult | undefined) {
  if (!match) return "-";

  const homeScore = match.homeScore ?? "-";
  const awayScore = match.awayScore ?? "-";
  return `${homeScore}-${awayScore}`;
}

function formatChanceLabel(match: MatchResult | undefined) {
  if (!match) return "Chance unavailable";

  const chances = calculateMatchChances(match);
  return `Chance: Home ${chances.home}% / Draw ${chances.draw}% / Away ${chances.away}%`;
}

export function buildCurrentLockerRoomMatch(
  results: PoolResults,
  referencePicks: EntryPicks | undefined,
): LockerRoomMatch {
  const match = selectCurrentPoolMatch(results);
  const homeTeam = displayTeamName(match?.homeTeam ?? "Home");
  const awayTeam = displayTeamName(match?.awayTeam ?? "Away");
  const groupId = findMatchGroupId(referencePicks, homeTeam, awayTeam);

  return {
    competition: COMPETITION_LABEL,
    timeLabel: match ? formatMatchTime(match) : "Match day",
    groupLabel: groupId ? `Group Stage - Group ${groupId}` : "Match Room",
    homeTeam,
    awayTeam,
    scoreLabel: formatMatchScore(match),
    chanceLabel: formatChanceLabel(match),
    homeFlagCode: flagCodeForTeam(referencePicks, homeTeam),
    awayFlagCode: flagCodeForTeam(referencePicks, awayTeam),
    homeRankLabel: rankLabel(results, groupId, homeTeam),
    awayRankLabel: rankLabel(results, groupId, awayTeam),
  };
}

export function describeCurrentPoolMatch(
  results: PoolResults,
  referencePicks: EntryPicks | undefined,
) {
  const match = buildCurrentLockerRoomMatch(results, referencePicks);
  return `${match.homeTeam} vs ${match.awayTeam}`;
}

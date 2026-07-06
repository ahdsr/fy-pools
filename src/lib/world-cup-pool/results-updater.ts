import type { EntryPicks, MatchResult, PoolResults } from "@/lib/world-cup-pool/types";
import { sortRoundOf32ByOfficialSlot } from "@/lib/world-cup-pool/knockout-slots";
import {
  ESPN_SCOREBOARD_URL,
  FIFA_CALENDAR_URL,
  FIFA_FDH_TEAM_STATS_URL_TEMPLATE,
  FIFA_TIMELINE_URL_TEMPLATE,
} from "@/lib/world-cup-pool/reference-urls";

export {
  ESPN_SCOREBOARD_URL,
  FIFA_CALENDAR_URL,
  FIFA_FDH_TEAM_STATS_URL_TEMPLATE,
  FIFA_TEAM_STATISTICS_URL,
  FIFA_TIMELINE_URL_TEMPLATE,
} from "@/lib/world-cup-pool/reference-urls";

export const WORLD_CUP_GROUP_IDS = "ABCDEFGHIJKL".split("");
const FIELD_LENGTH_METERS = 105;
const FIELD_WIDTH_METERS = 68;
const PASS_COMPLETION_PERCENT_DECIMALS = 1;

type EspnCompetitor = {
  homeAway?: string;
  score?: string | number;
  winner?: boolean;
  team?: {
    displayName?: string;
    shortDisplayName?: string;
    name?: string;
    abbreviation?: string;
  };
};

type EspnEvent = {
  id?: string;
  name?: string;
  shortName?: string;
  date?: string;
  status?: {
    type?: {
      state?: string;
      completed?: boolean;
      detail?: string;
      description?: string;
    };
  };
  competitions?: {
    id?: string;
    date?: string;
    status?: EspnEvent["status"];
    competitors?: EspnCompetitor[];
  }[];
};

type TeamStat = {
  team: string;
  played: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};

type ParsedCompetitor = {
  team: string;
  homeAway: string;
  score: number | null;
  winner: boolean;
};

type ManualOverrides = Partial<PoolResults> & {
  meta?: PoolResults["meta"];
  knockout?: Partial<Record<"roundOf16" | "quarterFinalists" | "semifinalists" | "thirdPlaceMatch" | "finalists", string[]>>;
};

type FifaLocalizedDescription = {
  Locale?: string;
  Description?: string;
};

type FifaTeam = {
  IdTeam?: string | number;
  idTeam?: string | number;
  Id?: string | number;
  id?: string | number;
  ShortClubName?: string;
  TeamName?: FifaLocalizedDescription[];
  Abbreviation?: string;
  Bookings?: { Card?: string | number }[];
};

type FifaMatch = {
  IdCompetition?: string | number;
  IdSeason?: string | number;
  IdStage?: string | number;
  IdMatch?: string | number;
  MatchStatus?: string | number;
  HomeTeamScore?: string | number;
  AwayTeamScore?: string | number;
  HomeTeam?: FifaTeam;
  AwayTeam?: FifaTeam;
  Home?: FifaTeam;
  Away?: FifaTeam;
};

type FifaTimelineEvent = {
  Type?: string | number;
  Period?: string | number;
  IdTeam?: string | number;
  PositionX?: string | number;
  PositionY?: string | number;
};

type FifaTimeline = {
  Event?: FifaTimelineEvent[];
  Events?: FifaTimelineEvent[];
  events?: FifaTimelineEvent[];
};

type FifaTeamStatEntry =
  | [string, number, boolean?]
  | {
      Name?: string;
      name?: string;
      Key?: string;
      key?: string;
      Value?: number;
      value?: number;
    };

type FifaTeamStats = FifaTeamStatEntry[] | { Stat?: FifaTeamStatEntry[] };

type FifaBonusResults = Record<string, string[]>;

export function normalizeKey(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function numberValue(value: unknown) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function asArray<T>(value: T[] | undefined | null) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function localizedDescription(value: FifaLocalizedDescription[] | undefined) {
  return (
    asArray(value).find((item) => item.Locale === "en-GB")?.Description ??
    asArray(value).find((item) => item.Locale === "en")?.Description ??
    asArray(value)[0]?.Description ??
    ""
  );
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "fy-pools-world-cup-updater",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText} (${url})`);
  }

  return response.json() as Promise<T>;
}

export function buildTeamIndexes(picks: EntryPicks) {
  const teamToGroup = new Map<string, string>();
  const knownTeams = new Map<string, string>();
  const groupTeams: Record<string, string[]> = {};

  for (const [groupId, group] of Object.entries(picks.groups)) {
    groupTeams[groupId] = group.teams.map((team) => team.name);
    for (const team of group.teams) {
      const key = normalizeKey(team.name);
      teamToGroup.set(key, groupId);
      knownTeams.set(key, team.name);
    }
  }

  return {
    groupTeams,
    knownTeams,
    teamToGroup,
  };
}

export function createTeamResolver(
  picks: EntryPicks,
  aliases: { aliases?: Record<string, string> } | Record<string, string> = {},
) {
  const { knownTeams } = buildTeamIndexes(picks);
  const lookup = new Map(knownTeams);
  const aliasMap = "aliases" in aliases ? aliases.aliases : aliases;

  for (const [alias, canonical] of Object.entries(aliasMap ?? {})) {
    lookup.set(normalizeKey(alias), canonical);
  }

  return (value: unknown) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    return lookup.get(normalizeKey(raw)) ?? raw;
  };
}

function competitorName(competitor: EspnCompetitor) {
  return (
    competitor.team?.displayName ??
    competitor.team?.shortDisplayName ??
    competitor.team?.name ??
    competitor.team?.abbreviation ??
    ""
  );
}

export function parseEspnEvent(
  event: EspnEvent,
  resolveTeam: (value: unknown) => string = (value) => String(value ?? ""),
) {
  const competition = event.competitions?.[0] ?? {};
  const status = competition.status?.type ?? event.status?.type ?? {};
  const competitors = competition.competitors ?? [];
  const parsedCompetitors: ParsedCompetitor[] = competitors.map((competitor) => ({
    team: resolveTeam(competitorName(competitor)),
    homeAway: competitor.homeAway ?? "",
    score: numberValue(competitor.score),
    winner: Boolean(competitor.winner),
  }));
  const emptyCompetitor: ParsedCompetitor = {
    team: "",
    homeAway: "",
    score: null,
    winner: false,
  };
  const home =
    parsedCompetitors.find((item) => item.homeAway === "home") ??
    parsedCompetitors[0] ??
    emptyCompetitor;
  const away =
    parsedCompetitors.find((item) => item.homeAway === "away") ??
    parsedCompetitors.find((item) => item !== home) ??
    emptyCompetitor;
  const state = status.state ?? "pre";
  const completed = Boolean(status.completed) || state === "post";
  const winnerCompetitor = parsedCompetitors.find((item) => item.winner);
  let winner = winnerCompetitor?.team ?? "";
  let loser = "";

  if (
    !winner &&
    completed &&
    home.score !== null &&
    away.score !== null &&
    home.score !== away.score
  ) {
    winner = (home.score ?? 0) > (away.score ?? 0) ? home.team ?? "" : away.team ?? "";
  }

  if (winner && completed) {
    loser =
      parsedCompetitors.find((item) => item.team && item.team !== winner)?.team ?? "";
  }

  return {
    id: event.id ?? competition.id ?? "",
    name: event.name ?? "",
    shortName: event.shortName ?? "",
    date: event.date ?? competition.date ?? "",
    state,
    completed,
    detail: status.detail ?? status.description ?? "",
    homeTeam: home.team ?? "",
    awayTeam: away.team ?? "",
    homeScore: home.score,
    awayScore: away.score,
    winner,
    loser,
  };
}

function isCountedMatch(match: MatchResult) {
  return (
    (match.state === "in" || match.state === "post" || match.completed) &&
    match.homeScore !== null &&
    match.awayScore !== null
  );
}

function isDisplayableMatch(match: MatchResult) {
  return Boolean(match.id && match.date && match.homeTeam && match.awayTeam);
}

function matchTime(match: MatchResult) {
  const value = new Date(match.date).getTime();
  return Number.isFinite(value) ? value : 0;
}

function compareMatchesByRoomPriority(nowTime: number) {
  return (a: MatchResult, b: MatchResult) => {
    const aTime = matchTime(a);
    const bTime = matchTime(b);
    const aLive = a.state === "in";
    const bLive = b.state === "in";
    if (aLive !== bLive) return aLive ? -1 : 1;

    const aUpcoming = !a.completed && a.state !== "post" && aTime >= nowTime;
    const bUpcoming = !b.completed && b.state !== "post" && bTime >= nowTime;
    if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
    if (aUpcoming && bUpcoming) return aTime - bTime;

    return bTime - aTime;
  };
}

function emptyStats(team: string): TeamStat {
  return {
    team,
    played: 0,
    points: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
  };
}

function applyScore(home: TeamStat, away: TeamStat, homeScore: number, awayScore: number) {
  home.played += 1;
  away.played += 1;
  home.goalsFor += homeScore;
  home.goalsAgainst += awayScore;
  away.goalsFor += awayScore;
  away.goalsAgainst += homeScore;
  home.goalDifference = home.goalsFor - home.goalsAgainst;
  away.goalDifference = away.goalsFor - away.goalsAgainst;

  if (homeScore > awayScore) {
    home.points += 3;
  } else if (awayScore > homeScore) {
    away.points += 3;
  } else {
    home.points += 1;
    away.points += 1;
  }
}

function compareStats(a: TeamStat, b: TeamStat) {
  return (
    b.points - a.points ||
    b.goalDifference - a.goalDifference ||
    b.goalsFor - a.goalsFor ||
    a.team.localeCompare(b.team)
  );
}

export function buildGroupResults(matches: MatchResult[], picks: EntryPicks) {
  const { groupTeams, teamToGroup } = buildTeamIndexes(picks);
  const groupState = Object.fromEntries(
    WORLD_CUP_GROUP_IDS.map((groupId) => [
      groupId,
      {
        totalMatches: 0,
        countedMatches: 0,
        completedMatches: 0,
        liveMatches: 0,
        stats: new Map((groupTeams[groupId] ?? []).map((team) => [team, emptyStats(team)])),
      },
    ]),
  );

  for (const match of matches) {
    const homeGroup = teamToGroup.get(normalizeKey(match.homeTeam));
    const awayGroup = teamToGroup.get(normalizeKey(match.awayTeam));
    if (!homeGroup || homeGroup !== awayGroup) continue;

    const group = groupState[homeGroup];
    group.totalMatches += 1;

    if (!isCountedMatch(match)) continue;
    group.countedMatches += 1;
    if (match.completed) {
      group.completedMatches += 1;
    } else {
      group.liveMatches += 1;
    }

    const home = group.stats.get(match.homeTeam) ?? emptyStats(match.homeTeam);
    const away = group.stats.get(match.awayTeam) ?? emptyStats(match.awayTeam);
    applyScore(home, away, match.homeScore ?? 0, match.awayScore ?? 0);
    group.stats.set(match.homeTeam, home);
    group.stats.set(match.awayTeam, away);
  }

  return Object.fromEntries(
    WORLD_CUP_GROUP_IDS.map((groupId) => {
      const group = groupState[groupId];
      const sortedStats = [...group.stats.values()].sort(compareStats);
      const status =
        group.countedMatches === 0
          ? "not-started"
          : group.completedMatches === group.totalMatches
            ? "final"
            : group.liveMatches > 0
              ? "live"
              : "active";

      return [
        groupId,
        {
          currentOrder: group.countedMatches > 0 ? sortedStats.map((item) => item.team) : [],
          status,
          stats: sortedStats,
        },
      ];
    }),
  );
}

export function selectTopThirdGroups(groups: NonNullable<PoolResults["groups"]>) {
  return Object.entries(groups)
    .map(([groupId, group]) => {
      const thirdTeam = group.currentOrder?.[2];
      const thirdStats = group.stats?.find((item) => item.team === thirdTeam);
      return thirdTeam && thirdStats ? { groupId, ...thirdStats } : null;
    })
    .filter((item): item is TeamStat & { groupId: string } => Boolean(item))
    .sort((a, b) => compareStats(a, b) || a.groupId.localeCompare(b.groupId))
    .slice(0, 8)
    .map((item) => item.groupId);
}

function isGroupStageFinal(groups: NonNullable<PoolResults["groups"]>) {
  return WORLD_CUP_GROUP_IDS.every((groupId) => groups[groupId]?.status === "final");
}

function matchIsGroupStage(match: MatchResult, teamToGroup: Map<string, string>) {
  const homeGroup = teamToGroup.get(normalizeKey(match.homeTeam));
  const awayGroup = teamToGroup.get(normalizeKey(match.awayTeam));
  return Boolean(homeGroup && homeGroup === awayGroup);
}

function knownTeamName(team: string, knownTeams: Map<string, string>) {
  return knownTeams.get(normalizeKey(team)) ?? "";
}

function completedKnownWinner(match: MatchResult | undefined, knownTeams: Map<string, string>) {
  if (!match?.completed) return "";
  return knownTeamName(match.winner, knownTeams);
}

function completedKnownLoser(match: MatchResult | undefined, knownTeams: Map<string, string>) {
  if (!match?.completed) return "";
  return knownTeamName(match.loser, knownTeams);
}

export function buildKnockoutResults(matches: MatchResult[], picks: EntryPicks) {
  const { knownTeams, teamToGroup } = buildTeamIndexes(picks);
  const knockoutMatches = matches
    .filter((match) => !matchIsGroupStage(match, teamToGroup))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const roundOf32 = sortRoundOf32ByOfficialSlot(knockoutMatches.slice(0, 16));
  const roundOf16 = knockoutMatches.slice(16, 24);
  const quarterFinals = knockoutMatches.slice(24, 28);
  const semiFinals = knockoutMatches.slice(28, 30);
  const thirdPlaceMatch =
    knockoutMatches.find((match) => /semifinal/i.test(match.id) && /loser/i.test(match.id)) ??
    knockoutMatches[30];
  const final =
    knockoutMatches.find((match) => /semifinal/i.test(match.id) && /winner/i.test(match.id)) ??
    knockoutMatches[31];

  return {
    roundOf16: roundOf32.map((match) => completedKnownWinner(match, knownTeams)).filter(Boolean),
    quarterFinalists: roundOf16
      .map((match) => completedKnownWinner(match, knownTeams))
      .filter(Boolean),
    semifinalists: quarterFinals
      .map((match) => completedKnownWinner(match, knownTeams))
      .filter(Boolean),
    thirdPlaceMatch: semiFinals
      .map((match) => completedKnownLoser(match, knownTeams))
      .filter(Boolean),
    finalists: semiFinals.map((match) => completedKnownWinner(match, knownTeams)).filter(Boolean),
    finals: {
      champion: completedKnownWinner(final, knownTeams),
      runnerUp: completedKnownLoser(final, knownTeams),
      thirdPlace: completedKnownWinner(thirdPlaceMatch, knownTeams),
    },
  };
}

function allTeamStats(groups: NonNullable<PoolResults["groups"]>) {
  return Object.values(groups)
    .flatMap((group) => group.stats ?? [])
    .filter((item) => item.played > 0);
}

function leadersBy(stats: TeamStat[], key: "goalsFor" | "goalsAgainst") {
  if (stats.length === 0) return [];
  const max = Math.max(...stats.map((item) => item[key]));
  if (max <= 0) return [];
  return stats
    .filter((item) => item[key] === max)
    .map((item) => item.team)
    .sort((a, b) => a.localeCompare(b));
}

export function computeBonusResults(
  groups: NonNullable<PoolResults["groups"]>,
  picks: EntryPicks,
  fifaBonusResults: FifaBonusResults = {},
) {
  const base = Object.fromEntries(picks.bonus.map((item) => [item.id, [] as string[]]));
  const stats = allTeamStats(groups);
  return {
    ...base,
    ...fifaBonusResults,
    mostGoalsScored: leadersBy(stats, "goalsFor"),
    mostGoalsConceded: leadersBy(stats, "goalsAgainst"),
  };
}

function fifaTeamName(team: FifaTeam | undefined) {
  return team?.ShortClubName ?? localizedDescription(team?.TeamName) ?? team?.Abbreviation ?? "";
}

function fifaTeamId(team: FifaTeam | undefined) {
  const id = team?.IdTeam ?? team?.idTeam ?? team?.Id ?? team?.id;
  return id === undefined || id === null ? "" : String(id);
}

function countableFifaCard(booking: { Card?: string | number }) {
  return [1, 2, 3].includes(numberValue(booking.Card) ?? 0);
}

export function computeMostCardsFromFifaLiveMatches(
  matches: FifaMatch[],
  resolveTeam: (value: unknown) => string = (value) => String(value ?? ""),
) {
  const totals = new Map<string, number>();

  for (const match of asArray(matches)) {
    for (const team of [match.HomeTeam, match.AwayTeam]) {
      const name = resolveTeam(fifaTeamName(team));
      if (!name) continue;
      const cardCount = asArray(team?.Bookings).filter(countableFifaCard).length;
      totals.set(name, (totals.get(name) ?? 0) + cardCount);
    }
  }

  const max = Math.max(...totals.values(), 0);
  if (max <= 0) return [];
  return [...totals.entries()]
    .filter(([, total]) => total === max)
    .map(([team]) => team)
    .sort((a, b) => a.localeCompare(b));
}

function fifaMatchTeams(match: FifaMatch) {
  return [match.HomeTeam ?? match.Home, match.AwayTeam ?? match.Away].filter(
    (team): team is FifaTeam => Boolean(team),
  );
}

function buildFifaTeamLookup(
  matches: FifaMatch[],
  resolveTeam: (value: unknown) => string = (value) => String(value ?? ""),
) {
  const teams = new Map<string, string>();

  for (const match of asArray(matches)) {
    for (const team of fifaMatchTeams(match)) {
      const id = fifaTeamId(team);
      const name = resolveTeam(fifaTeamName(team));
      if (id && name) teams.set(id, name);
    }
  }

  return teams;
}

function startedFifaTeamIds(matches: FifaMatch[]) {
  return [
    ...new Set(
      asArray(matches)
        .flatMap(fifaMatchTeams)
        .map(fifaTeamId)
        .filter(Boolean),
    ),
  ];
}

function timelineEvents(timeline: FifaTimeline) {
  return asArray(timeline.Event ?? timeline.Events ?? timeline.events);
}

function isGoalTimelineEvent(event: FifaTimelineEvent) {
  return numberValue(event.Type) === 0 && numberValue(event.Period) !== 9;
}

function coordinateValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function goalDistanceMeters(event: FifaTimelineEvent) {
  const x = coordinateValue(event.PositionX);
  const y = coordinateValue(event.PositionY);
  if (x === null || y === null) return null;

  const distanceToNearestGoalLine = (Math.min(x, 100 - x) / 100) * FIELD_LENGTH_METERS;
  const distanceFromCenter = (Math.abs(y - 50) / 100) * FIELD_WIDTH_METERS;
  return Math.hypot(distanceToNearestGoalLine, distanceFromCenter);
}

export function computeFarthestGoalFromFifaTimelines(
  timelines: FifaTimeline[],
  teamById = new Map<string, string>(),
) {
  const leaders: string[] = [];
  let maxDistance = 0;

  for (const timeline of asArray(timelines)) {
    for (const event of timelineEvents(timeline)) {
      if (!isGoalTimelineEvent(event)) continue;
      const team = teamById.get(String(event.IdTeam ?? ""));
      const distance = goalDistanceMeters(event);
      if (!team || distance === null) continue;

      if (distance > maxDistance + Number.EPSILON) {
        leaders.length = 0;
        leaders.push(team);
        maxDistance = distance;
      } else if (Math.abs(distance - maxDistance) <= Number.EPSILON) {
        leaders.push(team);
      }
    }
  }

  return [...new Set(leaders)].sort((a, b) => a.localeCompare(b));
}

function statEntriesToMap(stats: FifaTeamStats | undefined) {
  const entries = Array.isArray(stats)
    ? stats
    : Array.isArray(stats?.Stat)
      ? stats.Stat
      : [];

  return new Map(
    entries
      .map((entry): [string | undefined, number | undefined] => {
        if (Array.isArray(entry)) return [entry[0], entry[1]];
        return [
          entry.Name ?? entry.name ?? entry.Key ?? entry.key,
          entry.Value ?? entry.value,
        ];
      })
      .filter((entry): entry is [string, number] => Boolean(entry[0])),
  );
}

function roundedPassCompletionPercent(completed: number, passes: number) {
  const scale = 10 ** PASS_COMPLETION_PERCENT_DECIMALS;
  return Math.round((completed / passes) * 100 * scale) / scale;
}

export function computeBestPassCompletionFromFifaTeamStats(
  teamStats: { team: string; stats: FifaTeamStats }[],
) {
  const leaders: string[] = [];
  let bestPercent = 0;

  for (const item of asArray(teamStats)) {
    const stats = statEntriesToMap(item.stats);
    const passes = Number(stats.get("Passes"));
    const completed = Number(stats.get("PassesCompleted"));
    if (!item.team || !Number.isFinite(passes) || !Number.isFinite(completed) || passes <= 0) {
      continue;
    }

    const percent = roundedPassCompletionPercent(completed, passes);
    if (percent > bestPercent) {
      leaders.length = 0;
      leaders.push(item.team);
      bestPercent = percent;
    } else if (percent === bestPercent) {
      leaders.push(item.team);
    }
  }

  return [...new Set(leaders)].sort((a, b) => a.localeCompare(b));
}

function fifaMatchHasStarted(match: FifaMatch) {
  return (
    [0, 3, 5].includes(numberValue(match.MatchStatus) ?? -1) ||
    (numberValue(match.HomeTeamScore) !== null && numberValue(match.AwayTeamScore) !== null)
  );
}

async function fetchFifaLiveMatch(match: FifaMatch) {
  const url = `https://api.fifa.com/api/v3/live/football/${match.IdCompetition}/${match.IdSeason}/${match.IdStage}/${match.IdMatch}?language=en`;
  return fetchJson<FifaMatch>(url);
}

async function fetchFifaTimeline(match: FifaMatch) {
  return fetchJson<FifaTimeline>(
    FIFA_TIMELINE_URL_TEMPLATE.replace("{idMatch}", String(match.IdMatch)),
  );
}

async function fetchFifaTeamStats(idTeam: string, teamById: Map<string, string>) {
  const stats = await fetchJson<FifaTeamStats>(
    FIFA_FDH_TEAM_STATS_URL_TEMPLATE.replace("{idTeam}", idTeam),
  );
  return {
    team: teamById.get(idTeam) ?? "",
    stats,
  };
}

export async function fetchFifaBonusResults(
  resolveTeam: (value: unknown) => string = (value) => String(value ?? ""),
) {
  const calendar = await fetchJson<{ Results?: FifaMatch[] }>(FIFA_CALENDAR_URL);
  const matches = asArray(calendar.Results).filter(fifaMatchHasStarted);
  const teamById = buildFifaTeamLookup(matches, resolveTeam);
  const [liveMatches, timelines, teamStats] = await Promise.all([
    Promise.all(matches.map(fetchFifaLiveMatch)),
    Promise.all(matches.map(fetchFifaTimeline)),
    Promise.all(startedFifaTeamIds(matches).map((idTeam) => fetchFifaTeamStats(idTeam, teamById))),
  ]);

  return {
    mostCards: computeMostCardsFromFifaLiveMatches(liveMatches, resolveTeam),
    farthestGoal: computeFarthestGoalFromFifaTimelines(timelines, teamById),
    bestPassCompletion: computeBestPassCompletionFromFifaTeamStats(teamStats),
  };
}

function stageOverride(manualOverrides: ManualOverrides, key: keyof typeof STAGE_KEYS) {
  return manualOverrides.knockout?.[key] ?? manualOverrides[key];
}

const STAGE_KEYS = {
  roundOf16: true,
  quarterFinalists: true,
  semifinalists: true,
  thirdPlaceMatch: true,
  finalists: true,
} as const;

export function applyResultsOverrides(results: PoolResults, manualOverrides: ManualOverrides = {}) {
  const output: PoolResults = structuredClone(results);

  if (manualOverrides.meta?.status && output.meta) output.meta.status = manualOverrides.meta.status;
  if (manualOverrides.meta?.sourceNote && output.meta) {
    output.meta.sourceNote = manualOverrides.meta.sourceNote;
  }

  for (const [groupId, override] of Object.entries(manualOverrides.groups ?? {})) {
    if (!output.groups?.[groupId]) continue;
    if (Array.isArray(override.currentOrder) && override.currentOrder.length > 0) {
      output.groups[groupId].currentOrder = override.currentOrder;
    }
    if (override.status) output.groups[groupId].status = override.status;
  }

  if (Array.isArray(manualOverrides.topThirdGroups)) {
    output.topThirdGroups = manualOverrides.topThirdGroups;
  }

  for (const key of Object.keys(STAGE_KEYS) as (keyof typeof STAGE_KEYS)[]) {
    const override = stageOverride(manualOverrides, key);
    if (Array.isArray(override)) output[key] = override;
  }

  for (const key of ["champion", "runnerUp", "thirdPlace"] as const) {
    if (manualOverrides.finals?.[key]) {
      output.finals = {
        ...output.finals,
        [key]: manualOverrides.finals[key],
      };
    }
  }

  for (const [key, value] of Object.entries(manualOverrides.bonus ?? {})) {
    if (Array.isArray(value) && value.length > 0) {
      output.bonus = {
        ...output.bonus,
        [key]: value,
      };
    }
  }

  return output;
}

export function buildResultsFromEvents(
  events: EspnEvent[],
  options: {
    picks: EntryPicks;
    aliases?: { aliases?: Record<string, string> } | Record<string, string>;
    manualOverrides?: ManualOverrides;
    fifaBonusResults?: FifaBonusResults;
    now?: string;
    sourceUrl?: string;
  },
): PoolResults {
  const {
    picks,
    aliases = {},
    manualOverrides = {},
    fifaBonusResults = {},
    now = new Date().toISOString(),
    sourceUrl = ESPN_SCOREBOARD_URL,
  } = options;
  const resolveTeam = createTeamResolver(picks, aliases);
  const matches = events.map((event) => parseEspnEvent(event, resolveTeam));
  const groups = buildGroupResults(matches, picks);
  const knockout = buildKnockoutResults(matches, picks);
  const topThirdGroups = isGroupStageFinal(groups) ? selectTopThirdGroups(groups) : [];
  const countedMatches = matches.filter(isCountedMatch).length;
  const liveMatches = matches.filter((match) => match.state === "in").length;
  const nowTime = new Date(now).getTime();
  const statusParts = [
    "Auto-updated from ESPN",
    `${countedMatches} live/final match${countedMatches === 1 ? "" : "es"} counted`,
  ];
  if (liveMatches > 0) statusParts.push(`${liveMatches} in progress`);

  return applyResultsOverrides(
    {
      meta: {
        lastUpdated: now,
        status: `${statusParts.join(": ")}.`,
        source: "espn",
        sourceUrl,
        sourceNote:
          "Group standings are computed from ESPN match scores. FIFA live bookings, match timelines, and team statistics are used for bonus results. Third-place qualifier scoring is withheld until the group stage is final unless manually overridden.",
      },
      matches: matches
        .filter(isDisplayableMatch)
        .map((match) => ({
          id: match.id,
          date: match.date,
          state: match.state,
          completed: match.completed,
          detail: match.detail,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          winner: match.winner,
          loser: match.loser,
        }))
        .sort(compareMatchesByRoomPriority(nowTime)),
      groups,
      topThirdGroups,
      roundOf16: knockout.roundOf16,
      quarterFinalists: knockout.quarterFinalists,
      semifinalists: knockout.semifinalists,
      thirdPlaceMatch: knockout.thirdPlaceMatch,
      finalists: knockout.finalists,
      finals: knockout.finals,
      bonus: computeBonusResults(groups, picks, fifaBonusResults),
    },
    manualOverrides,
  );
}

import type {
  BonusResultValue,
  EntryPicks,
  MatchResult,
  PoolResults,
} from "@/lib/world-cup-pool/types";
import { sortRoundOf32ByOfficialSlot } from "@/lib/world-cup-pool/knockout-slots";
import {
  FIFA_CALENDAR_URL,
  FIFA_FDH_TEAM_STATS_URL_TEMPLATE,
  FIFA_GROUP_TIEBREAKERS_URL,
  FIFA_MEN_RANKING_API_URL_TEMPLATE,
  FIFA_MEN_RANKING_URL,
  FIFA_STANDINGS_URL,
  FIFA_TEAM_STATISTICS_URL,
  FIFA_TIMELINE_URL_TEMPLATE,
} from "@/lib/world-cup-pool/reference-urls";

export {
  FIFA_CALENDAR_URL,
  FIFA_FDH_TEAM_STATS_URL_TEMPLATE,
  FIFA_GROUP_TIEBREAKERS_URL,
  FIFA_MEN_RANKING_API_URL_TEMPLATE,
  FIFA_MEN_RANKING_URL,
  FIFA_STANDINGS_URL,
  FIFA_TEAM_STATISTICS_URL,
  FIFA_TIMELINE_URL_TEMPLATE,
} from "@/lib/world-cup-pool/reference-urls";

export const WORLD_CUP_GROUP_IDS = "ABCDEFGHIJKL".split("");

const STAGE_KEYS = [
  "roundOf16",
  "quarterFinalists",
  "semifinalists",
  "thirdPlaceMatch",
  "finalists",
] as const;
const FIELD_LENGTH_METERS = 105;
const FIELD_WIDTH_METERS = 68;
const PASS_COMPLETION_PERCENT_DECIMALS = 1;

type TeamStat = {
  team: string;
  played: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  fairPlayPoints?: number;
  fifaRank?: number;
};

type FifaLocalizedDescription = {
  Locale?: string;
  Description?: string;
};

type FifaBooking = {
  Card?: string | number;
  IdPlayer?: string | number;
  IdCoach?: string | number;
  IdStaff?: string | number;
};

type FifaTeam = {
  IdTeam?: string | number;
  idTeam?: string | number;
  Id?: string | number;
  id?: string | number;
  Score?: string | number;
  ShortClubName?: string;
  TeamName?: FifaLocalizedDescription[];
  Abbreviation?: string;
  Bookings?: FifaBooking[];
};

export type FifaMatch = {
  IdCompetition?: string | number;
  IdSeason?: string | number;
  IdStage?: string | number;
  IdMatch?: string | number;
  MatchNumber?: string | number;
  Date?: string;
  MatchDate?: string;
  StageName?: FifaLocalizedDescription[];
  GroupName?: FifaLocalizedDescription[];
  MatchStatus?: string | number;
  MatchStatusDescription?: FifaLocalizedDescription[];
  ResultType?: string | number;
  OfficialityStatus?: string | number;
  HomeTeamScore?: string | number | null;
  AwayTeamScore?: string | number | null;
  HomeTeamPenaltyScore?: string | number | null;
  AwayTeamPenaltyScore?: string | number | null;
  Winner?: string | number | null;
  Home?: FifaTeam;
  Away?: FifaTeam;
  HomeTeam?: FifaTeam;
  AwayTeam?: FifaTeam;
  PlaceHolderA?: string;
  PlaceHolderB?: string;
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
  | [string, number | string, boolean?]
  | {
      Name?: string;
      name?: string;
      Key?: string;
      key?: string;
      Value?: number | string;
      value?: number | string;
    };

type FifaTeamStats = FifaTeamStatEntry[] | { Stat?: FifaTeamStatEntry[] };

type FifaTeamStatsResult = {
  team: string;
  stats: FifaTeamStats;
};

export type FifaBonusResults = Record<string, BonusResultValue>;

export type FifaRankingResults = {
  sourceUrl?: string;
  apiUrl?: string;
  dateId?: string;
  lastUpdateDate?: string;
  rankingsByTeam: Record<string, number>;
};

type ManualMatchOverride = Partial<
  Pick<
    MatchResult,
    | "id"
    | "homeTeam"
    | "awayTeam"
    | "homeScore"
    | "awayScore"
    | "homePenaltyScore"
    | "awayPenaltyScore"
    | "state"
    | "completed"
    | "detail"
    | "winner"
    | "loser"
  >
>;

type ManualOverrides = Omit<Partial<PoolResults>, "matches" | "bonus"> & {
  matches?: ManualMatchOverride[];
  knockout?: Partial<Record<(typeof STAGE_KEYS)[number], string[]>>;
  bonus?: Record<string, BonusResultValue | null | undefined>;
};

export function normalizeKey(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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

function numberValue(value: unknown) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function numericRecordValue(record: Record<string, number> | undefined, key: string) {
  const value = record?.[key];
  return Number.isFinite(value) ? value : null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "fy-pools-world-cup-fifa-updater",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`FIFA request failed: ${response.status} ${response.statusText} (${url})`);
  }

  return response.json() as Promise<T>;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      accept: "text/html,application/json",
      "user-agent": "fy-pools-world-cup-fifa-updater",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`FIFA request failed: ${response.status} ${response.statusText} (${url})`);
  }

  return response.text();
}

export function buildTeamIndexes(picks: EntryPicks) {
  const teamToGroup = new Map<string, string>();
  const knownTeams = new Map<string, string>();
  const groupTeams: Record<string, string[]> = {};

  for (const [groupId, group] of Object.entries(picks.groups ?? {})) {
    groupTeams[groupId] = (group.teams ?? []).map((team) => team.name);
    for (const team of group.teams ?? []) {
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

function fifaTeamName(team: FifaTeam | undefined) {
  return team?.ShortClubName ?? localizedDescription(team?.TeamName) ?? team?.Abbreviation ?? "";
}

function fifaTeamId(team: FifaTeam | undefined) {
  const id = team?.IdTeam ?? team?.idTeam ?? team?.Id ?? team?.id;
  return id === undefined || id === null ? "" : String(id);
}

function scoreValue(match: FifaMatch, side: "Home" | "Away") {
  return numberValue(match[`${side}TeamScore`] ?? match[side]?.Score);
}

function fifaMatchState(match: FifaMatch) {
  const status = numberValue(match.MatchStatus);
  const hasScore = scoreValue(match, "Home") !== null && scoreValue(match, "Away") !== null;
  if (status === 0 || (numberValue(match.OfficialityStatus) === 1 && hasScore)) return "post";
  if ([3, 5].includes(status ?? -1)) return "in";
  return "pre";
}

function fifaMatchDetail(match: FifaMatch, completed: boolean) {
  const statusText = localizedDescription(match.MatchStatusDescription);
  if (statusText) return statusText;
  if (!completed) return "Scheduled";
  if (numberValue(match.ResultType) === 2) return "FT-Pens";
  return "FT";
}

function winnerFromFifaMatch(
  match: FifaMatch,
  homeTeam: string,
  awayTeam: string,
  homeScore: number | null,
  awayScore: number | null,
) {
  const winnerId = String(match.Winner ?? "");
  const homeId = fifaTeamId(match.Home);
  const awayId = fifaTeamId(match.Away);

  if (winnerId && winnerId === homeId) return homeTeam;
  if (winnerId && winnerId === awayId) return awayTeam;
  if (homeScore !== null && awayScore !== null && homeScore !== awayScore) {
    return homeScore > awayScore ? homeTeam : awayTeam;
  }
  return "";
}

export function parseFifaMatch(
  match: FifaMatch,
  resolveTeam: (value: unknown) => string = (value) => String(value ?? ""),
): MatchResult {
  const homeTeam = resolveTeam(fifaTeamName(match.Home)) || match.PlaceHolderA || "";
  const awayTeam = resolveTeam(fifaTeamName(match.Away)) || match.PlaceHolderB || "";
  const homeScore = scoreValue(match, "Home");
  const awayScore = scoreValue(match, "Away");
  const state = fifaMatchState(match);
  const completed = state === "post";
  const winner = completed ? winnerFromFifaMatch(match, homeTeam, awayTeam, homeScore, awayScore) : "";
  const loser = winner && winner === homeTeam ? awayTeam : winner ? homeTeam : "";
  const stage = localizedDescription(match.StageName);
  const group = localizedDescription(match.GroupName);

  return {
    id: String(match.IdMatch ?? ""),
    source: "fifa",
    name: [stage, group].filter(Boolean).join(" - "),
    shortName: `${awayTeam} at ${homeTeam}`,
    date: match.Date ?? match.MatchDate ?? "",
    state,
    completed,
    detail: fifaMatchDetail(match, completed),
    stage,
    group,
    matchNumber: numberValue(match.MatchNumber),
    resultType: numberValue(match.ResultType),
    officialityStatus: numberValue(match.OfficialityStatus),
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    homePenaltyScore: numberValue(match.HomeTeamPenaltyScore),
    awayPenaltyScore: numberValue(match.AwayTeamPenaltyScore),
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

function samePair(match: MatchResult, override: { homeTeam?: string; awayTeam?: string }) {
  const matchTeams = [normalizeKey(match.homeTeam), normalizeKey(match.awayTeam)].sort().join("|");
  const overrideTeams = [normalizeKey(override.homeTeam), normalizeKey(override.awayTeam)]
    .sort()
    .join("|");
  return matchTeams === overrideTeams;
}

export function applyMatchOverrides(
  matches: MatchResult[],
  manualOverrides: ManualOverrides = {},
  resolveTeam: (value: unknown) => string = (value) => String(value ?? ""),
) {
  const output = matches.map((match) => ({ ...match }));

  for (const override of asArray(manualOverrides.matches)) {
    const homeTeam = resolveTeam(override.homeTeam);
    const awayTeam = resolveTeam(override.awayTeam);
    const index = output.findIndex(
      (match) => (override.id && match.id === override.id) || samePair(match, { homeTeam, awayTeam }),
    );
    const patch: Partial<MatchResult> = {
      ...(homeTeam ? { homeTeam } : {}),
      ...(awayTeam ? { awayTeam } : {}),
      ...(override.homeScore !== undefined ? { homeScore: numberValue(override.homeScore) } : {}),
      ...(override.awayScore !== undefined ? { awayScore: numberValue(override.awayScore) } : {}),
      ...(override.homePenaltyScore !== undefined
        ? { homePenaltyScore: numberValue(override.homePenaltyScore) }
        : {}),
      ...(override.awayPenaltyScore !== undefined
        ? { awayPenaltyScore: numberValue(override.awayPenaltyScore) }
        : {}),
      ...(override.state ? { state: override.state } : {}),
      ...(override.completed !== undefined ? { completed: Boolean(override.completed) } : {}),
      ...(override.detail ? { detail: override.detail } : {}),
      ...(override.winner ? { winner: resolveTeam(override.winner) } : {}),
      ...(override.loser ? { loser: resolveTeam(override.loser) } : {}),
    };

    if (index >= 0) {
      output[index] = {
        ...output[index],
        ...patch,
      };
    } else {
      throw new Error(
        `Manual match override does not match an official FIFA match: ${
          override.id ?? `${homeTeam} vs ${awayTeam}`
        }`,
      );
    }
  }

  return output.map((match) => {
    if (!match.completed || match.homeScore === null || match.awayScore === null) return match;
    if (match.winner) return match;
    if (match.homeScore === match.awayScore) return match;
    const winner = match.homeScore > match.awayScore ? match.homeTeam : match.awayTeam;
    return {
      ...match,
      winner,
      loser: winner === match.homeTeam ? match.awayTeam : match.homeTeam,
    };
  });
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

function decorateStats(
  stats: TeamStat[],
  options: {
    fairPlayPointsByTeam?: Record<string, number>;
    fifaRankByTeam?: Record<string, number>;
  } = {},
) {
  const { fairPlayPointsByTeam = {}, fifaRankByTeam = {} } = options;
  return stats.map((item) => {
    const fairPlayPoints = numericRecordValue(fairPlayPointsByTeam, item.team);
    const fifaRank = numericRecordValue(fifaRankByTeam, item.team);
    return {
      ...item,
      ...(fairPlayPoints !== null ? { fairPlayPoints } : {}),
      ...(fifaRank !== null ? { fifaRank } : {}),
    };
  });
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

function buildMiniTable(teams: string[], matches: MatchResult[]) {
  const teamSet = new Set(teams.map((team) => normalizeKey(team)));
  const stats = new Map(teams.map((team) => [team, emptyStats(team)] as const));

  for (const match of matches) {
    if (!isCountedMatch(match)) continue;
    if (!teamSet.has(normalizeKey(match.homeTeam)) || !teamSet.has(normalizeKey(match.awayTeam))) {
      continue;
    }

    const home = stats.get(match.homeTeam) ?? emptyStats(match.homeTeam);
    const away = stats.get(match.awayTeam) ?? emptyStats(match.awayTeam);
    applyScore(home, away, match.homeScore ?? 0, match.awayScore ?? 0);
    stats.set(match.homeTeam, home);
    stats.set(match.awayTeam, away);
  }

  return stats;
}

function valueBuckets(
  items: TeamStat[],
  values: Map<string, number>,
  direction: "asc" | "desc" = "desc",
) {
  const buckets = new Map<string, { value: number; items: TeamStat[] }>();

  for (const item of items) {
    const value = values.get(item.team);
    const key = Number.isFinite(value) ? String(value) : "missing";
    if (!buckets.has(key)) {
      buckets.set(key, {
        value: Number.isFinite(value) ? Number(value) : Number.NaN,
        items: [],
      });
    }
    buckets.get(key)?.items.push(item);
  }

  return [...buckets.values()].sort((a, b) => {
    const aMissing = !Number.isFinite(a.value);
    const bMissing = !Number.isFinite(b.value);
    if (aMissing && bMissing) return 0;
    if (aMissing) return 1;
    if (bMissing) return -1;
    return direction === "asc" ? a.value - b.value : b.value - a.value;
  });
}

function sortStatsWithCriteria(
  items: TeamStat[],
  criteria: {
    direction: "asc" | "desc";
    values: (items: TeamStat[]) => Map<string, number>;
  }[],
  index = 0,
): TeamStat[] {
  if (items.length <= 1) return items;
  if (index >= criteria.length) {
    return items.slice().sort((a, b) => a.team.localeCompare(b.team));
  }

  const criterion = criteria[index];
  const values = criterion.values(items);
  const buckets = valueBuckets(items, values, criterion.direction);

  if (buckets.length === 1) {
    return sortStatsWithCriteria(items, criteria, index + 1);
  }

  return buckets.flatMap((bucket) => sortStatsWithCriteria(bucket.items, criteria, index + 1));
}

function directValues(items: TeamStat[], key: keyof TeamStat) {
  return new Map(items.map((item) => [item.team, Number(item[key])]));
}

function headToHeadValues(matches: MatchResult[], key: keyof TeamStat) {
  return (items: TeamStat[]) => {
    const miniTable = buildMiniTable(
      items.map((item) => item.team),
      matches,
    );
    return new Map(items.map((item) => [item.team, Number(miniTable.get(item.team)?.[key])]));
  };
}

export function sortGroupStats(
  stats: TeamStat[],
  matches: MatchResult[] = [],
  options: {
    fairPlayPointsByTeam?: Record<string, number>;
    fifaRankByTeam?: Record<string, number>;
  } = {},
) {
  const criteria = [
    { direction: "desc" as const, values: (items: TeamStat[]) => directValues(items, "points") },
    { direction: "desc" as const, values: headToHeadValues(matches, "points") },
    { direction: "desc" as const, values: headToHeadValues(matches, "goalDifference") },
    { direction: "desc" as const, values: headToHeadValues(matches, "goalsFor") },
    {
      direction: "desc" as const,
      values: (items: TeamStat[]) => directValues(items, "goalDifference"),
    },
    { direction: "desc" as const, values: (items: TeamStat[]) => directValues(items, "goalsFor") },
    {
      direction: "asc" as const,
      values: (items: TeamStat[]) => directValues(items, "fairPlayPoints"),
    },
    { direction: "asc" as const, values: (items: TeamStat[]) => directValues(items, "fifaRank") },
  ];

  return sortStatsWithCriteria(decorateStats(stats, options), criteria);
}

function compareThirdPlaceStats(a: TeamStat & { groupId: string }, b: TeamStat & { groupId: string }) {
  return (
    b.points - a.points ||
    b.goalDifference - a.goalDifference ||
    b.goalsFor - a.goalsFor ||
    Number(a.fairPlayPoints ?? 0) - Number(b.fairPlayPoints ?? 0) ||
    Number(a.fifaRank ?? Number.POSITIVE_INFINITY) -
      Number(b.fifaRank ?? Number.POSITIVE_INFINITY) ||
    a.groupId.localeCompare(b.groupId)
  );
}

export function buildGroupResults(
  matches: MatchResult[],
  picks: EntryPicks,
  options: {
    fairPlayPointsByTeam?: Record<string, number>;
    fifaRankByTeam?: Record<string, number>;
  } = {},
) {
  const { groupTeams, teamToGroup } = buildTeamIndexes(picks);
  const groupState = Object.fromEntries(
    WORLD_CUP_GROUP_IDS.map((groupId) => [
      groupId,
      {
        totalMatches: 0,
        countedMatches: 0,
        completedMatches: 0,
        liveMatches: 0,
        matches: [] as MatchResult[],
        stats: new Map((groupTeams[groupId] ?? []).map((team) => [team, emptyStats(team)] as const)),
      },
    ]),
  );

  for (const match of matches) {
    const homeGroup = teamToGroup.get(normalizeKey(match.homeTeam));
    const awayGroup = teamToGroup.get(normalizeKey(match.awayTeam));
    if (!homeGroup || homeGroup !== awayGroup) continue;

    const group = groupState[homeGroup];
    group.totalMatches += 1;
    group.matches.push(match);

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
      const sortedStats = sortGroupStats([...group.stats.values()], group.matches, options);
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
    .sort(compareThirdPlaceStats)
    .slice(0, 8)
    .map((item) => item.groupId);
}

export function isGroupStageFinal(groups: NonNullable<PoolResults["groups"]>) {
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
    knockoutMatches.find((match) => /semifinal/i.test(match.name ?? "") && /loser/i.test(match.name ?? "")) ??
    knockoutMatches[30];
  const final =
    knockoutMatches.find((match) => /semifinal/i.test(match.name ?? "") && /winner/i.test(match.name ?? "")) ??
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

function buildBonusResults(
  groups: NonNullable<PoolResults["groups"]>,
  picks: EntryPicks,
  fifaBonusResults: FifaBonusResults = {},
) {
  const base = Object.fromEntries(picks.bonus.map((item) => [item.id, [] as string[]]));
  const stats = allTeamStats(groups);
  return {
    ...base,
    mostGoalsScored: leadersBy(stats, "goalsFor"),
    mostGoalsConceded: leadersBy(stats, "goalsAgainst"),
    ...fifaBonusResults,
  };
}

export function computeBonusResults(
  groups: NonNullable<PoolResults["groups"]>,
  picks: EntryPicks,
  fifaBonusResults: FifaBonusResults = {},
) {
  return buildBonusResults(groups, picks, fifaBonusResults);
}

const FIFA_CARD_WEIGHTS = new Map([
  [1, 1],
  [2, 3],
  [3, 4],
  [4, 4],
]);

function bookingParticipantKey(booking: FifaBooking, index: number) {
  if (booking.IdPlayer) return `player:${booking.IdPlayer}`;
  if (booking.IdCoach) return `coach:${booking.IdCoach}`;
  if (booking.IdStaff) return `staff:${booking.IdStaff}`;
  return `booking:${index}`;
}

function participantFairPlayPoints(bookings: FifaBooking[]) {
  const cards = bookings.map((booking) => numberValue(booking.Card));
  const yellowCount = cards.filter((card) => card === 1).length;
  const hasDirectRed = cards.includes(3) || cards.includes(4);

  if (hasDirectRed && yellowCount > 0) return 5;
  if (hasDirectRed) return 4;
  if (cards.includes(2) || yellowCount >= 2) return 3;
  return cards.reduce<number>((sum, card) => sum + (FIFA_CARD_WEIGHTS.get(card ?? 0) ?? 0), 0);
}

function teamFairPlayPoints(bookings: FifaBooking[] | undefined) {
  const participants = new Map<string, FifaBooking[]>();

  asArray(bookings).forEach((booking, index) => {
    const key = bookingParticipantKey(booking, index);
    participants.set(key, [...(participants.get(key) ?? []), booking]);
  });

  return [...participants.values()].reduce<number>(
    (sum, participantBookings) => sum + participantFairPlayPoints(participantBookings),
    0,
  );
}

export function computeCardPointsFromFifaLiveMatches(
  matches: FifaMatch[],
  resolveTeam: (value: unknown) => string = (value) => String(value ?? ""),
) {
  const totals = new Map<string, number>();

  for (const match of asArray(matches)) {
    for (const side of ["HomeTeam", "AwayTeam"] as const) {
      const team = match[side];
      const name = resolveTeam(fifaTeamName(team));
      if (!name) continue;
      const cardTotal = teamFairPlayPoints(team?.Bookings);
      totals.set(name, (totals.get(name) ?? 0) + cardTotal);
    }
  }

  return Object.fromEntries(
    [...totals.entries()]
      .filter(([, total]) => total > 0)
      .sort(([teamA], [teamB]) => teamA.localeCompare(teamB)),
  );
}

export function computeMostCardsFromFifaLiveMatches(
  matches: FifaMatch[],
  resolveTeam: (value: unknown) => string = (value) => String(value ?? ""),
) {
  const cardPoints = computeCardPointsFromFifaLiveMatches(matches, resolveTeam);
  const max = Math.max(...Object.values(cardPoints), 0);
  if (max <= 0) return [];
  return Object.entries(cardPoints)
    .filter(([, total]) => total === max)
    .map(([team]) => team)
    .sort((a, b) => a.localeCompare(b));
}

function statEntriesToMap(stats: FifaTeamStats | undefined) {
  const entries = Array.isArray(stats)
    ? stats
    : Array.isArray(stats?.Stat)
      ? stats.Stat
      : [];

  return new Map(
    entries
      .map((entry): [string | undefined, number | string | undefined] => {
        if (Array.isArray(entry)) return [entry[0], entry[1]];
        return [
          entry.Name ?? entry.name ?? entry.Key ?? entry.key,
          entry.Value ?? entry.value,
        ];
      })
      .filter((entry): entry is [string, number | string] => Boolean(entry[0])),
  );
}

export function computeCardPointsFromFifaTeamStats(teamStats: FifaTeamStatsResult[]) {
  const totals: Record<string, number> = {};

  for (const item of asArray(teamStats)) {
    const team = item.team;
    const stats = statEntriesToMap(item.stats);
    const yellowCards = Number(stats.get("YellowCards") ?? 0);
    const directRedCards = Number(stats.get("DirectRedCards") ?? stats.get("RedCards") ?? 0);
    const indirectRedCards = Number(stats.get("IndirectRedCards") ?? 0);

    if (!team) continue;
    const total =
      (Number.isFinite(yellowCards) ? yellowCards : 0) +
      (Number.isFinite(directRedCards) ? directRedCards * 4 : 0) +
      (Number.isFinite(indirectRedCards) ? indirectRedCards * 3 : 0);
    if (total > 0) totals[team] = total;
  }

  return Object.fromEntries(Object.entries(totals).sort(([teamA], [teamB]) => teamA.localeCompare(teamB)));
}

function leadersFromFifaTeamStats(teamStats: FifaTeamStatsResult[], statKey: string) {
  const rows = asArray(teamStats)
    .map((item) => {
      const stats = statEntriesToMap(item.stats);
      return {
        team: item.team,
        value: Number(stats.get(statKey) ?? 0),
      };
    })
    .filter((item) => item.team && Number.isFinite(item.value) && item.value > 0);
  const max = Math.max(...rows.map((item) => item.value), 0);
  if (max <= 0) return [];
  return rows
    .filter((item) => item.value === max)
    .map((item) => item.team)
    .sort((a, b) => a.localeCompare(b));
}

export function computeGoalBonusResultsFromFifaTeamStats(teamStats: FifaTeamStatsResult[]) {
  return {
    mostGoalsScored: leadersFromFifaTeamStats(teamStats, "Goals"),
    mostGoalsConceded: leadersFromFifaTeamStats(teamStats, "GoalsConceded"),
  };
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

function roundedPassCompletionPercent(completed: number, passes: number) {
  const scale = 10 ** PASS_COMPLETION_PERCENT_DECIMALS;
  return Math.round((completed / passes) * 100 * scale) / scale;
}

export function computeBestPassCompletionFromFifaTeamStats(teamStats: FifaTeamStatsResult[]) {
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

export async function fetchFifaCalendarMatches() {
  const calendar = await fetchJson<{ Results?: FifaMatch[] }>(FIFA_CALENDAR_URL);
  return calendar.Results ?? [];
}

export async function fetchFifaBonusResults(
  resolveTeam: (value: unknown) => string = (value) => String(value ?? ""),
  calendarMatches: FifaMatch[] | null = null,
): Promise<FifaBonusResults> {
  const sourceMatches = calendarMatches ?? (await fetchFifaCalendarMatches());
  const matches = asArray(sourceMatches).filter(fifaMatchHasStarted);
  const teamById = buildFifaTeamLookup(matches, resolveTeam);
  const [timelines, teamStats] = await Promise.all([
    Promise.all(matches.map(fetchFifaTimeline)),
    Promise.all(startedFifaTeamIds(matches).map((idTeam) => fetchFifaTeamStats(idTeam, teamById))),
  ]);

  return {
    ...computeGoalBonusResultsFromFifaTeamStats(teamStats),
    mostCards: computeCardPointsFromFifaTeamStats(teamStats),
    farthestGoal: computeFarthestGoalFromFifaTimelines(timelines, teamById),
    bestPassCompletion: computeBestPassCompletionFromFifaTeamStats(teamStats),
  };
}

function rankingDateIdsFromPage(html: string) {
  const nextDataMatch = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  const source = nextDataMatch?.[1] ?? html;
  return [
    ...new Set(
      [...source.matchAll(/(?:id\d+|FRS_Male_Football_\d+)/g)].map((match) => match[0]),
    ),
  ];
}

function fifaRankingApiUrl(dateId: string) {
  return FIFA_MEN_RANKING_API_URL_TEMPLATE.replace("{dateId}", dateId);
}

export async function fetchFifaRankings(
  resolveTeam: (value: unknown) => string = (value) => String(value ?? ""),
): Promise<FifaRankingResults> {
  const html = await fetchText(FIFA_MEN_RANKING_URL);
  const dateIds = rankingDateIdsFromPage(html);

  for (const dateId of dateIds) {
    const apiUrl = fifaRankingApiUrl(dateId);
    const data = await fetchJson<{
      rankings?: {
        lastUpdateDate?: string;
        rankingItem?: {
          name?: string;
          rank?: string | number;
        };
      }[];
    }>(apiUrl);
    const rankings = asArray(data.rankings);
    if (!rankings.length) continue;

    return {
      dateId,
      apiUrl,
      sourceUrl: FIFA_MEN_RANKING_URL,
      lastUpdateDate: rankings[0]?.lastUpdateDate ?? "",
      rankingsByTeam: Object.fromEntries(
        rankings
          .map((item) => {
            const team = resolveTeam(item.rankingItem?.name);
            const rank = numberValue(item.rankingItem?.rank);
            return team && rank !== null ? [team, rank] : null;
          })
          .filter((item): item is [string, number] => Boolean(item)),
      ),
    };
  }

  return {
    sourceUrl: FIFA_MEN_RANKING_URL,
    rankingsByTeam: {},
  };
}

function buildBonusSources() {
  return {
    mostGoalsScored: {
      source: "FIFA team statistics: goals",
      sourceUrl: FIFA_TEAM_STATISTICS_URL,
      apiUrl: FIFA_FDH_TEAM_STATS_URL_TEMPLATE,
      update: "Automatic with each results update",
    },
    mostGoalsConceded: {
      source: "FIFA team statistics: goals conceded",
      sourceUrl: FIFA_TEAM_STATISTICS_URL,
      apiUrl: FIFA_FDH_TEAM_STATS_URL_TEMPLATE,
      update: "Automatic with each results update",
    },
    farthestGoal: {
      source: "FIFA match timelines: goal location coordinates",
      sourceUrl: FIFA_TEAM_STATISTICS_URL,
      apiUrl: FIFA_TIMELINE_URL_TEMPLATE,
      update: "Automatic with each results update",
    },
    bestPassCompletion: {
      source: "FIFA team statistics: passes completed divided by passes attempted",
      sourceUrl: FIFA_TEAM_STATISTICS_URL,
      apiUrl: FIFA_FDH_TEAM_STATS_URL_TEMPLATE,
      update: "Automatic with each results update",
    },
    mostCards: {
      source:
        "FIFA team statistics judged by Fair Play Points: yellow 1, indirect red 3, direct red 4, yellow plus direct red 5",
      sourceUrl: FIFA_TEAM_STATISTICS_URL,
      apiUrl: FIFA_FDH_TEAM_STATS_URL_TEMPLATE,
      update: "Automatic with each results update",
    },
  };
}

function stageOverride(manualOverrides: ManualOverrides, key: (typeof STAGE_KEYS)[number]) {
  return manualOverrides.knockout?.[key] ?? manualOverrides[key];
}

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

  for (const key of STAGE_KEYS) {
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
    if (value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0) {
      output.bonus = {
        ...output.bonus,
        [key]: value,
      };
    }
  }

  return output;
}

function hasManualOverrideValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") {
    return Object.values(value).some(hasManualOverrideValue);
  }
  return Boolean(value);
}

function manualOverrideCount(manualOverrides: ManualOverrides = {}) {
  return Object.entries(manualOverrides)
    .filter(([key]) => key !== "meta")
    .reduce((count, [, value]) => count + (hasManualOverrideValue(value) ? 1 : 0), 0);
}

function serializedMatch(match: MatchResult): MatchResult {
  return {
    id: match.id,
    source: "fifa",
    name: match.name,
    shortName: match.shortName,
    date: match.date,
    state: match.state,
    completed: match.completed,
    detail: match.detail,
    stage: match.stage,
    group: match.group,
    matchNumber: match.matchNumber,
    resultType: match.resultType,
    officialityStatus: match.officialityStatus,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    ...(match.homePenaltyScore !== null ? { homePenaltyScore: match.homePenaltyScore } : {}),
    ...(match.awayPenaltyScore !== null ? { awayPenaltyScore: match.awayPenaltyScore } : {}),
    winner: match.winner,
    loser: match.loser,
  };
}

function toNumericRecord(value: BonusResultValue | undefined): Record<string, number> {
  if (!value || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([team, points]) => [team, Number(points)] as const)
      .filter(([, points]) => Number.isFinite(points)),
  );
}

export function fifaSourceSignature(fifaMatches: FifaMatch[], manualOverrides: ManualOverrides = {}) {
  return JSON.stringify({
    matches: fifaMatches.map((match) => ({
      id: String(match.IdMatch ?? ""),
      date: match.Date ?? match.MatchDate ?? "",
      status: numberValue(match.MatchStatus),
      officialityStatus: numberValue(match.OfficialityStatus),
      resultType: numberValue(match.ResultType),
      homeTeam: fifaTeamName(match.Home),
      awayTeam: fifaTeamName(match.Away),
      homeScore: scoreValue(match, "Home"),
      awayScore: scoreValue(match, "Away"),
      homePenaltyScore: numberValue(match.HomeTeamPenaltyScore),
      awayPenaltyScore: numberValue(match.AwayTeamPenaltyScore),
      winner: String(match.Winner ?? ""),
    })),
    manualOverrides,
  });
}

export function buildResultsFromFifaMatches(
  fifaMatches: FifaMatch[],
  options: {
    picks: EntryPicks;
    aliases?: { aliases?: Record<string, string> } | Record<string, string>;
    manualOverrides?: ManualOverrides;
    fifaBonusResults?: FifaBonusResults;
    fifaRankingResults?: FifaRankingResults;
    now?: string;
    sourceUrl?: string;
  },
): PoolResults {
  const {
    picks,
    aliases = {},
    manualOverrides = {},
    fifaBonusResults = {},
    fifaRankingResults = { rankingsByTeam: {} },
    now = new Date().toISOString(),
    sourceUrl = FIFA_CALENDAR_URL,
  } = options;
  const resolveTeam = createTeamResolver(picks, aliases);
  const parsedMatches = fifaMatches.map((match) => parseFifaMatch(match, resolveTeam));
  const matches = applyMatchOverrides(parsedMatches, manualOverrides, resolveTeam);
  const groups = buildGroupResults(matches, picks, {
    fairPlayPointsByTeam: toNumericRecord(fifaBonusResults.mostCards),
    fifaRankByTeam: fifaRankingResults.rankingsByTeam,
  });
  const knockout = buildKnockoutResults(matches, picks);
  const topThirdGroups = isGroupStageFinal(groups) ? selectTopThirdGroups(groups) : [];
  const countedMatches = matches.filter(isCountedMatch).length;
  const liveMatches = matches.filter((match) => match.state === "in").length;
  const statusParts = [
    "Auto-updated from FIFA",
    `${countedMatches} live/final match${countedMatches === 1 ? "" : "es"} counted`,
  ];
  if (liveMatches > 0) statusParts.push(`${liveMatches} in progress`);
  const overridesCount = manualOverrideCount(manualOverrides);

  const results: PoolResults = {
    meta: {
      lastUpdated: now,
      status: `${statusParts.join(": ")}.`,
      source: "fifa",
      sourceUrl,
      sources: {
        matches: {
          source: "FIFA calendar/matches API",
          sourceUrl: FIFA_STANDINGS_URL,
          apiUrl: sourceUrl,
        },
        tiebreakers: {
          source: "FIFA World Cup 2026 group tiebreakers",
          sourceUrl: FIFA_GROUP_TIEBREAKERS_URL,
        },
        rankings: {
          source: "FIFA/Coca-Cola Men's World Ranking",
          sourceUrl: fifaRankingResults.sourceUrl ?? FIFA_MEN_RANKING_URL,
          apiUrl: fifaRankingResults.apiUrl ?? "",
          dateId: fifaRankingResults.dateId ?? "",
          lastUpdateDate: fifaRankingResults.lastUpdateDate ?? "",
        },
      },
      bonusSources: buildBonusSources(),
      manualOverrideCount: overridesCount,
      manualOverrideSource: overridesCount > 0 ? "src/data/marcins-world-cup-2026/manual-overrides.json" : "",
      sourceNote:
        "All match results, fixtures, knockout winners, group standings, and third-place rankings are computed from FIFA official match data. FIFA team statistics, timelines, and rankings are used for bonus answers and unresolved tiebreakers. Manual overrides are explicit official-correction patches only.",
    },
    matches: matches
      .filter(isCountedMatch)
      .map(serializedMatch)
      .sort((a, b) => String(b.date).localeCompare(String(a.date))),
    fixtures: matches
      .filter((match) => !match.completed)
      .map(serializedMatch)
      .sort((a, b) => String(a.date).localeCompare(String(b.date))),
    groups,
    topThirdGroups,
    roundOf16: knockout.roundOf16,
    quarterFinalists: knockout.quarterFinalists,
    semifinalists: knockout.semifinalists,
    thirdPlaceMatch: knockout.thirdPlaceMatch,
    finalists: knockout.finalists,
    finals: knockout.finals,
    bonus: buildBonusResults(groups, picks, fifaBonusResults),
  };

  return applyResultsOverrides(results, manualOverrides);
}

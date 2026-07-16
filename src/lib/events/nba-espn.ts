import { createHash } from "node:crypto";

import {
  catalogReadiness,
  type CatalogEvent,
  type CatalogMatchup,
  type CatalogSeries,
  type CatalogStage,
  type CatalogTeam,
} from "@/lib/events/types";

const ESPN_SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";
const ESPN_STANDINGS_URL = "https://site.api.espn.com/apis/v2/sports/basketball/nba/standings";

type EspnTeam = { id?: string; displayName?: string; shortDisplayName?: string; abbreviation?: string };
type EspnCompetitor = { homeAway?: string; team?: EspnTeam };
type EspnEvent = {
  id?: string;
  date?: string;
  name?: string;
  season?: { year?: number; type?: number; slug?: string };
  status?: { type?: { state?: string } };
  competitions?: Array<{
    competitors?: EspnCompetitor[];
    notes?: Array<{ headline?: string }>;
    status?: { type?: { state?: string } };
  }>;
};
type EspnScoreboard = { events?: EspnEvent[] };
type EspnStandingEntry = {
  team?: EspnTeam;
  stats?: Array<{ name?: string; value?: number }>;
};
type EspnStandings = {
  children?: Array<{ name?: string; standings?: { entries?: EspnStandingEntry[] } }>;
};

export type EspnFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Pick<Response, "ok" | "status" | "statusText" | "json">>;

function defaultNbaSeason(now = new Date()) {
  return String(now.getUTCFullYear() + (now.getUTCMonth() >= 6 ? 1 : 0));
}

async function fetchPayload<T>(fetchImpl: EspnFetch, url: string): Promise<T> {
  const response = await fetchImpl(url, {
    headers: { accept: "application/json", "user-agent": "fy-pools-event-catalog/1.0" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`ESPN request failed: ${response.status} ${response.statusText}.`);
  return response.json() as Promise<T>;
}

function conferenceId(name: string | undefined) {
  const normalized = name?.toLowerCase() ?? "";
  if (normalized.includes("eastern")) return "east";
  if (normalized.includes("western")) return "west";
  return undefined;
}

function stat(entry: EspnStandingEntry, name: string) {
  return entry.stats?.find((candidate) => candidate.name === name)?.value;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function matchupStatus(value: string | undefined): CatalogMatchup["status"] {
  if (value === "in") return "in-progress";
  if (value === "post") return "complete";
  if (value === "pre") return "scheduled";
  return "unknown";
}

function playoffTeams(standings: EspnStandings): CatalogTeam[] {
  const teams: CatalogTeam[] = [];
  for (const conference of standings.children ?? []) {
    const conferenceIdValue = conferenceId(conference.name);
    if (!conferenceIdValue) continue;
    for (const entry of conference.standings?.entries ?? []) {
      const seed = stat(entry, "playoffSeed");
      const externalId = entry.team?.id?.trim();
      const name = entry.team?.displayName?.trim();
      if (!externalId || !name || !Number.isInteger(seed) || typeof seed !== "number" || seed < 1 || seed > 8) continue;
      const shortName = entry.team?.shortDisplayName?.trim() || entry.team?.abbreviation?.trim();
      teams.push({
        externalId,
        name,
        ...(shortName ? { shortName } : {}),
        conference: conferenceIdValue,
        seed,
        status: "confirmed",
      });
    }
  }
  return teams.sort((left, right) => left.conference!.localeCompare(right.conference!) || left.seed! - right.seed!);
}

function noteFor(event: EspnEvent) {
  return event.competitions?.[0]?.notes?.map((note) => note.headline).find(Boolean) ?? "";
}

function stageFor(note: string) {
  const label = note.replace(/\s*-\s*Game\s+\d+.*$/i, "").trim() || "NBA Playoffs";
  return { id: slug(label), label };
}

export function nbaCatalogSignature(event: CatalogEvent) {
  return createHash("sha256").update(JSON.stringify(event)).digest("hex");
}

export function normalizeEspnNbaPlayoffCatalog({
  season,
  scoreboard,
  standings,
}: {
  season: string;
  scoreboard: EspnScoreboard;
  standings: EspnStandings;
}): CatalogEvent {
  const postseason = (scoreboard.events ?? []).filter(
    (event) => String(event.season?.year ?? "") === season && event.season?.type === 3,
  );
  const teams = playoffTeams(standings);
  const matchups: CatalogMatchup[] = postseason.flatMap((event) => {
    const competition = event.competitions?.[0];
    const home = competition?.competitors?.find((competitor) => competitor.homeAway === "home")?.team?.id;
    const away = competition?.competitors?.find((competitor) => competitor.homeAway === "away")?.team?.id;
    if (!event.id || !event.name) return [];
    return [{
      externalId: event.id,
      label: event.name,
      stageId: stageFor(noteFor(event)).id,
      ...(event.date ? { startsAt: event.date } : {}),
      ...(home ? { homeTeamId: home } : {}),
      ...(away ? { awayTeamId: away } : {}),
      status: matchupStatus(competition?.status?.type?.state ?? event.status?.type?.state),
    }];
  });
  const stages = Array.from(new Map(
    postseason.map((event) => {
      const stage = stageFor(noteFor(event));
      return [stage.id, stage];
    }),
  ).values()).map((stage, index): CatalogStage => ({ ...stage, order: index + 1, kind: "series" }));
  const seriesByKey = new Map<string, CatalogSeries>();
  for (const matchup of matchups) {
    const teamIds = [matchup.homeTeamId, matchup.awayTeamId].filter((teamId): teamId is string => Boolean(teamId)).sort();
    if (teamIds.length !== 2) continue;
    const key = `${matchup.stageId ?? "playoffs"}:${teamIds.join(":")}`;
    const current = seriesByKey.get(key);
    const startsAt = [current?.startsAt, matchup.startsAt].filter(Boolean).sort()[0];
    const statuses = [...(current?.matchupIds ?? []), matchup.externalId]
      .map((matchupId) => matchups.find((candidate) => candidate.externalId === matchupId)?.status);
    seriesByKey.set(key, {
      externalId: `nba-${season}-${slug(key)}`,
      label: current?.label ?? matchup.label.replace(/\s+(at|vs)\s+/i, " vs "),
      ...(matchup.stageId ? { stageId: matchup.stageId } : {}),
      ...(startsAt ? { startsAt } : {}),
      teamIds,
      matchupIds: [...(current?.matchupIds ?? []), matchup.externalId],
      bestOf: 7,
      status: statuses.includes("in-progress") ? "in-progress" : statuses.every((status) => status === "complete") ? "complete" : "scheduled",
    });
  }
  const series = [...seriesByKey.values()].sort((left, right) => (left.startsAt ?? "").localeCompare(right.startsAt ?? ""));
  const firstRoundSeries = series.filter((candidate) => /(?:east|west)-1st-round/.test(candidate.stageId ?? ""));
  const firstTip = firstRoundSeries.map((candidate) => candidate.startsAt).filter((value): value is string => Boolean(value)).sort()[0];
  const base: Omit<CatalogEvent, "readiness" | "readinessReason"> = {
    provider: "espn",
    externalId: `nba-${season}-playoffs`,
    sportSlug: "basketball",
    competitionSlug: "nba-playoffs",
    seasonSlug: season,
    displayName: `NBA Playoffs ${season}`,
    ...(firstTip ? { startsAt: firstTip } : {}),
    sessions: firstTip ? [{ id: "first-tip", label: "First playoff tip", startsAt: firstTip }] : [],
    participants: [],
    teams,
    stages,
    matchups,
    series,
    lockWindows: firstTip ? [{ id: "first-tip", label: "Before first playoff tip", locksAt: firstTip, scope: "event" }] : [],
    fieldStatus: teams.length === 16 && firstRoundSeries.length === 8 ? "confirmed" : "unknown",
    sourceUrl: `${ESPN_SCOREBOARD_URL}?dates=${season}0401-${season}0630&limit=500`,
  };
  return {
    ...base,
    ...catalogReadiness(base, {
      requiredSessionIds: ["first-tip"],
      minimumTeams: 16,
      requireSeries: true,
    }),
  };
}

export async function fetchEspnNbaPlayoffCatalog({
  season = defaultNbaSeason(),
  fetchImpl = fetch as EspnFetch,
}: {
  season?: string;
  fetchImpl?: EspnFetch;
} = {}) {
  if (!/^20\d{2}$/.test(season)) throw new Error("NBA season must be a four-digit year.");
  const [scoreboard, standings] = await Promise.all([
    fetchPayload<EspnScoreboard>(fetchImpl, `${ESPN_SCOREBOARD_URL}?dates=${season}0401-${season}0630&limit=500`),
    fetchPayload<EspnStandings>(fetchImpl, `${ESPN_STANDINGS_URL}?season=${season}`),
  ]);
  const event = normalizeEspnNbaPlayoffCatalog({ season, scoreboard, standings });
  return { season, events: [event], sourceSignature: nbaCatalogSignature(event) };
}

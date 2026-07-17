import { createHash } from "node:crypto";

import {
  catalogReadiness,
  type CatalogEvent,
  type CatalogParticipant,
} from "@/lib/events/types";

const ESPN_ATP_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard";

type EspnTennisCompetitor = {
  id?: string;
  type?: string;
  athlete?: { displayName?: string; shortName?: string };
};

type EspnTennisCompetition = {
  date?: string;
  startDate?: string;
  competitors?: EspnTennisCompetitor[];
  round?: { displayName?: string };
};

type EspnTennisEvent = {
  id?: string;
  name?: string;
  date?: string;
  venue?: { displayName?: string };
  groupings?: Array<{
    grouping?: { slug?: string };
    competitions?: EspnTennisCompetition[];
  }>;
  links?: Array<{ href?: string; rel?: string[] }>;
};

type EspnAtpScoreboard = { events?: EspnTennisEvent[] };

export type EspnAtpFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Pick<Response, "ok" | "status" | "statusText" | "json">>;

function mainDrawCompetitions(event: EspnTennisEvent) {
  return (event.groupings ?? [])
    .filter((group) => group.grouping?.slug === "mens-singles")
    .flatMap((group) => group.competitions ?? [])
    .filter((competition) => !competition.round?.displayName?.toLowerCase().includes("qualifying"));
}

function players(event: EspnTennisEvent): CatalogParticipant[] {
  const byId = new Map<string, CatalogParticipant>();
  for (const competition of mainDrawCompetitions(event)) {
    for (const competitor of competition.competitors ?? []) {
      const externalId = competitor.id?.trim();
      const name = competitor.athlete?.displayName?.trim();
      if (!externalId || !name || competitor.type !== "athlete") continue;
      byId.set(externalId, {
        externalId,
        name,
        shortName: competitor.athlete?.shortName?.trim() || undefined,
        status: "confirmed",
      });
    }
  }
  return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function firstMainDrawMatch(event: EspnTennisEvent) {
  return mainDrawCompetitions(event)
    .map((competition) => competition.startDate ?? competition.date)
    .filter((value): value is string => typeof value === "string" && !Number.isNaN(Date.parse(value)))
    .sort()[0];
}

export function atpCatalogSignature(events: CatalogEvent[]) {
  return createHash("sha256").update(JSON.stringify(events)).digest("hex");
}

/** ESPN's ATP scoreboard supplies the individual main-draw field per tournament. */
export function normalizeEspnAtpCatalog({
  season,
  scoreboard,
}: {
  season: string;
  scoreboard: EspnAtpScoreboard;
}): CatalogEvent[] {
  return (scoreboard.events ?? [])
    .flatMap((event) => {
      const externalId = event.id?.trim();
      const displayName = event.name?.trim();
      const startsAt = firstMainDrawMatch(event) ?? event.date;
      if (!externalId || !displayName || !startsAt || Number.isNaN(Date.parse(startsAt))) {
        return [];
      }

      const participants = players(event);
      const firstServeAt = new Date(startsAt).toISOString();
      const sourceUrl = event.links?.find((link) => link.rel?.includes("summary"))?.href
        ?? `https://www.espn.com/tennis/scoreboard/tournament/_/eventId/${externalId}`;
      const base: Omit<CatalogEvent, "readiness" | "readinessReason"> = {
        provider: "espn",
        externalId: `atp-${season}-${externalId}`,
        sportSlug: "tennis",
        competitionSlug: "atp-tour",
        seasonSlug: season,
        displayName,
        location: event.venue?.displayName?.trim() || undefined,
        startsAt: firstServeAt,
        sessions: [{ id: "first-serve", label: "First main-draw serve", startsAt: firstServeAt }],
        participants,
        lockWindows: [{
          id: "first-serve",
          label: "First main-draw serve",
          locksAt: new Date(Date.parse(firstServeAt) - 15 * 60 * 1000).toISOString(),
          scope: "event",
        }],
        fieldStatus: participants.length ? "confirmed" : "unknown",
        sourceUrl,
      };
      return [{
        ...base,
        ...catalogReadiness(base, {
          requiredSessionIds: ["first-serve"],
          minimumParticipants: 2,
        }),
      }];
    })
    .sort((left, right) => (left.startsAt ?? "").localeCompare(right.startsAt ?? ""));
}

export async function fetchEspnAtpCatalog({
  season = String(new Date().getUTCFullYear()),
  fetchImpl = fetch as EspnAtpFetch,
}: {
  season?: string;
  fetchImpl?: EspnAtpFetch;
} = {}) {
  if (!/^20\d{2}$/.test(season)) throw new Error("ATP season must be a four-digit year.");
  const response = await fetchImpl(`${ESPN_ATP_SCOREBOARD}?limit=200&dates=${season}`, {
    headers: { accept: "application/json", "user-agent": "fy-pools-event-catalog/1.0" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`ESPN ATP request failed: ${response.status} ${response.statusText}.`);
  const events = normalizeEspnAtpCatalog({
    season,
    scoreboard: await response.json() as EspnAtpScoreboard,
  });
  if (!events.length) throw new Error(`ESPN returned no ATP events for ${season}.`);
  return { season, events, sourceSignature: atpCatalogSignature(events) };
}

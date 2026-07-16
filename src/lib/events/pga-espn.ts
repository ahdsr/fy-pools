import { createHash } from "node:crypto";

import {
  catalogReadiness,
  type CatalogEvent,
  type CatalogParticipant,
} from "@/lib/events/types";

const ESPN_PGA_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard";

type EspnGolfer = {
  id?: string;
  athlete?: { displayName?: string; shortName?: string };
};

type EspnPgaEvent = {
  id?: string;
  name?: string;
  date?: string;
  competitions?: Array<{
    date?: string;
    competitors?: EspnGolfer[];
  }>;
};

type EspnPgaScoreboard = { events?: EspnPgaEvent[] };

export type EspnPgaFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Pick<Response, "ok" | "status" | "statusText" | "json">>;

function golfers(event: EspnPgaEvent): CatalogParticipant[] {
  return (event.competitions?.[0]?.competitors ?? [])
    .flatMap((competitor) => {
      const externalId = competitor.id?.trim();
      const name = competitor.athlete?.displayName?.trim();
      return externalId && name
        ? [{
            externalId,
            name,
            shortName: competitor.athlete?.shortName?.trim() || undefined,
            status: "confirmed" as const,
          }]
        : [];
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function pgaCatalogSignature(events: CatalogEvent[]) {
  return createHash("sha256").update(JSON.stringify(events)).digest("hex");
}

/**
 * ESPN publishes the full PGA schedule before every tournament field. We keep
 * those future events visible, but only mark one setup-ready when its actual
 * competitor list is present in the provider response.
 */
export function normalizeEspnPgaCatalog({
  season,
  scoreboard,
}: {
  season: string;
  scoreboard: EspnPgaScoreboard;
}): CatalogEvent[] {
  return (scoreboard.events ?? [])
    .flatMap((event) => {
      const externalId = event.id?.trim();
      const displayName = event.name?.trim();
      const startsAt = event.competitions?.[0]?.date ?? event.date;
      if (!externalId || !displayName || !startsAt || Number.isNaN(Date.parse(startsAt))) {
        return [];
      }

      const participants = golfers(event);
      const base: Omit<CatalogEvent, "readiness" | "readinessReason"> = {
        provider: "espn",
        externalId: `pga-${season}-${externalId}`,
        sportSlug: "golf",
        competitionSlug: "pga-tour",
        seasonSlug: season,
        displayName,
        startsAt: new Date(startsAt).toISOString(),
        sessions: [{ id: "first-tee", label: "Round 1 first tee", startsAt: new Date(startsAt).toISOString() }],
        participants,
        lockWindows: [{
          id: "first-tee",
          label: "First tee time",
          locksAt: new Date(Date.parse(startsAt) - 15 * 60 * 1000).toISOString(),
          scope: "event",
        }],
        fieldStatus: participants.length ? "confirmed" : "unknown",
        sourceUrl: `https://www.espn.com/golf/leaderboard/_/tournamentId/${externalId}`,
      };
      return [{
        ...base,
        ...catalogReadiness(base, {
          requiredSessionIds: ["first-tee"],
          minimumParticipants: 2,
        }),
      }];
    })
    .sort((left, right) => (left.startsAt ?? "").localeCompare(right.startsAt ?? ""));
}

export async function fetchEspnPgaCatalog({
  season = String(new Date().getUTCFullYear()),
  fetchImpl = fetch as EspnPgaFetch,
}: {
  season?: string;
  fetchImpl?: EspnPgaFetch;
} = {}) {
  if (!/^20\d{2}$/.test(season)) throw new Error("PGA season must be a four-digit year.");
  const response = await fetchImpl(`${ESPN_PGA_SCOREBOARD}?limit=200&dates=${season}`, {
    headers: { accept: "application/json", "user-agent": "fy-pools-event-catalog/1.0" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`ESPN PGA request failed: ${response.status} ${response.statusText}.`);
  const events = normalizeEspnPgaCatalog({
    season,
    scoreboard: await response.json() as EspnPgaScoreboard,
  });
  if (!events.length) throw new Error(`ESPN returned no PGA events for ${season}.`);
  return { season, events, sourceSignature: pgaCatalogSignature(events) };
}

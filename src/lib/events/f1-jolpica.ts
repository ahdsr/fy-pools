import { createHash } from "node:crypto";

import {
  catalogReadiness,
  type CatalogEvent,
  type CatalogParticipant,
} from "@/lib/events/types";

const JOLPICA_API = "https://api.jolpi.ca/ergast/f1";

type JolpicaDateTime = { date?: string; time?: string };
type JolpicaRace = JolpicaDateTime & {
  round?: string;
  raceName?: string;
  Circuit?: { circuitName?: string; Location?: { locality?: string; country?: string } };
  Qualifying?: JolpicaDateTime;
};
type JolpicaDriver = {
  driverId?: string;
  givenName?: string;
  familyName?: string;
  code?: string;
  permanentNumber?: string;
};
type JolpicaPayload = {
  MRData?: {
    RaceTable?: { season?: string; Races?: JolpicaRace[] };
    DriverTable?: { season?: string; Drivers?: JolpicaDriver[] };
  };
};

export type JolpicaFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Pick<Response, "ok" | "status" | "statusText" | "json">>;

function eventTime(value: JolpicaDateTime | undefined) {
  if (!value?.date) return undefined;
  const time = value.time?.trim() || "00:00:00Z";
  const candidate = `${value.date}T${time}`;
  return Number.isNaN(Date.parse(candidate)) ? undefined : new Date(candidate).toISOString();
}

function participant(driver: JolpicaDriver): CatalogParticipant | null {
  const externalId = driver.driverId?.trim();
  const name = `${driver.givenName ?? ""} ${driver.familyName ?? ""}`.trim();
  if (!externalId || !name) return null;
  return {
    externalId,
    name,
    shortName: driver.code?.trim() || driver.permanentNumber?.trim() || undefined,
    status: "provisional",
  };
}

async function fetchPayload(fetchImpl: JolpicaFetch, url: string) {
  const response = await fetchImpl(url, {
    headers: {
      accept: "application/json",
      "user-agent": "fy-pools-event-catalog/1.0",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Jolpica request failed: ${response.status} ${response.statusText}.`);
  }
  return response.json() as Promise<JolpicaPayload>;
}

export function f1CatalogSignature(events: CatalogEvent[]) {
  return createHash("sha256")
    .update(JSON.stringify(events))
    .digest("hex");
}

export function normalizeJolpicaF1Catalog({
  season,
  races,
  drivers,
}: {
  season: string;
  races: JolpicaPayload;
  drivers: JolpicaPayload;
}): CatalogEvent[] {
  const roster = (drivers.MRData?.DriverTable?.Drivers ?? [])
    .map(participant)
    .filter((driver): driver is CatalogParticipant => Boolean(driver))
    .sort((left, right) => left.name.localeCompare(right.name));

  const events: CatalogEvent[] = [];
  for (const race of races.MRData?.RaceTable?.Races ?? []) {
    const round = race.round?.trim();
    if (!round || !race.raceName?.trim()) continue;
    const qualifyingAt = eventTime(race.Qualifying);
    const startsAt = eventTime(race);
    const location = [race.Circuit?.Location?.locality, race.Circuit?.Location?.country]
      .filter(Boolean)
      .join(", ");
    const base: Omit<CatalogEvent, "readiness" | "readinessReason"> = {
      provider: "jolpica",
      externalId: `f1-${season}-${round}`,
      sportSlug: "motorsport",
      competitionSlug: "formula-1",
      seasonSlug: season,
      displayName: race.raceName.trim(),
      ...(location ? { location } : {}),
      ...(startsAt ? { startsAt } : {}),
      sessions: [
        { id: "qualifying", label: "Qualifying", ...(qualifyingAt ? { startsAt: qualifyingAt } : {}) },
        { id: "race", label: "Race", ...(startsAt ? { startsAt } : {}) },
      ],
      participants: roster,
      // Jolpica's season driver endpoint is a useful setup default, but it
      // does not certify a particular race weekend's entry list.
      fieldStatus: "season-roster",
      sourceUrl: `${JOLPICA_API}/${season}/${round}.json`,
    };
    events.push({ ...base, ...catalogReadiness(base) });
  }
  return events.sort((left, right) => (left.startsAt ?? "").localeCompare(right.startsAt ?? ""));
}

export async function fetchF1JolpicaCatalog({
  season = String(new Date().getUTCFullYear()),
  fetchImpl = fetch as JolpicaFetch,
}: {
  season?: string;
  fetchImpl?: JolpicaFetch;
} = {}) {
  if (!/^20\d{2}$/.test(season)) throw new Error("F1 season must be a four-digit year.");
  const [races, drivers] = await Promise.all([
    fetchPayload(fetchImpl, `${JOLPICA_API}/${season}.json?limit=100`),
    fetchPayload(fetchImpl, `${JOLPICA_API}/${season}/drivers.json?limit=100`),
  ]);
  const events = normalizeJolpicaF1Catalog({ season, races, drivers });
  if (!events.length) throw new Error(`Jolpica returned no Formula 1 events for ${season}.`);
  return { season, events, sourceSignature: f1CatalogSignature(events) };
}

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  fetchF1JolpicaCatalog,
  normalizeJolpicaF1Catalog,
} from "@/lib/events/f1-jolpica";
import { withSnapshotFreshness } from "@/lib/events/types";
import { createF1SettingsFromCatalogEvent } from "@/lib/ranked-finish/f1";
import { createNbaSettingsFromCatalogEvent } from "@/lib/nba-series/catalog";
import { createNbaSimulation } from "@/lib/nba-series/draft";
import {
  fetchEspnNbaPlayoffCatalog,
  normalizeEspnNbaPlayoffCatalog,
} from "@/lib/events/nba-espn";

const drivers = Array.from({ length: 10 }, (_, index) => ({
  driverId: `driver-${index + 1}`,
  givenName: `Driver${index + 1}`,
  familyName: "Example",
  code: `D${index + 1}`,
}));

const races = {
  MRData: {
    RaceTable: {
      season: "2026",
      Races: [
        {
          round: "7",
          raceName: "Canadian Grand Prix",
          date: "2026-06-14",
          time: "18:00:00Z",
          Qualifying: { date: "2026-06-13", time: "18:00:00Z" },
          Circuit: { circuitName: "Circuit Gilles Villeneuve", Location: { locality: "Montreal", country: "Canada" } },
        },
      ],
    },
  },
};

const nbaTeams = [
  ["east", "Boston Celtics", "1"], ["east", "New York Knicks", "2"], ["east", "Cleveland Cavaliers", "3"], ["east", "Orlando Magic", "4"], ["east", "Milwaukee Bucks", "5"], ["east", "Indiana Pacers", "6"], ["east", "Miami Heat", "7"], ["east", "Atlanta Hawks", "8"],
  ["west", "Oklahoma City Thunder", "1"], ["west", "Denver Nuggets", "2"], ["west", "Los Angeles Lakers", "3"], ["west", "Houston Rockets", "4"], ["west", "Minnesota Timberwolves", "5"], ["west", "Golden State Warriors", "6"], ["west", "Memphis Grizzlies", "7"], ["west", "LA Clippers", "8"],
] as const;

const nbaStandings = {
  children: ["Eastern Conference", "Western Conference"].map((name) => ({
    name,
    standings: {
      entries: nbaTeams
        .filter(([conference]) => name.startsWith(conference === "east" ? "Eastern" : "Western"))
        .map(([conference, team, seed]) => ({
          team: { id: `${conference}-${seed}`, displayName: team, shortDisplayName: team.split(" ").at(-1) },
          stats: [{ name: "playoffSeed", value: Number(seed) }],
        })),
    },
  })),
};

const nbaFirstRoundPairs = [
  ["east", "1", "8"], ["east", "4", "5"], ["east", "3", "6"], ["east", "2", "7"],
  ["west", "1", "8"], ["west", "4", "5"], ["west", "3", "6"], ["west", "2", "7"],
] as const;

const nbaScoreboard = {
  events: nbaFirstRoundPairs.map(([conference, firstSeed, secondSeed], index) => {
    const findTeam = (seed: string) => nbaTeams.find(([candidateConference, , candidateSeed]) => candidateConference === conference && candidateSeed === seed)!;
    const home = findTeam(firstSeed);
    const away = findTeam(secondSeed);
    return {
      id: `game-${index + 1}`,
      date: `2026-04-${String(18 + index).padStart(2, "0")}T20:00:00Z`,
      name: `${away[1]} at ${home[1]}`,
      season: { year: 2026, type: 3 },
      competitions: [{
        competitors: [
          { homeAway: "home", team: { id: `${home[0]}-${home[2]}`, displayName: home[1] } },
          { homeAway: "away", team: { id: `${away[0]}-${away[2]}`, displayName: away[1] } },
        ],
        notes: [{ headline: `${conference === "east" ? "East" : "West"} 1st Round - Game 1` }],
        status: { type: { state: "pre" } },
      }],
    };
  }),
};

describe("live event catalog", () => {
  it("normalizes a captured F1 schedule and flags a season roster as provisional", () => {
    const [event] = normalizeJolpicaF1Catalog({ season: "2026", races, drivers: { MRData: { DriverTable: { Drivers: drivers } } } });

    expect(event).toMatchObject({
      provider: "jolpica",
      externalId: "f1-2026-7",
      competitionSlug: "formula-1",
      readiness: "provisional",
      fieldStatus: "season-roster",
      location: "Montreal, Canada",
    });
    expect(event?.participants).toHaveLength(10);
    expect(event?.sessions.find((session) => session.id === "qualifying")?.startsAt).toBe("2026-06-13T18:00:00.000Z");
  });

  it("replays the provider boundary with injected responses instead of relying on a live API in tests", async () => {
    const fetchImpl = async (url: string) => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => url.includes("drivers")
        ? { MRData: { DriverTable: { Drivers: drivers } } }
        : races,
    });
    const catalog = await fetchF1JolpicaCatalog({ season: "2026", fetchImpl });

    expect(catalog.events).toHaveLength(1);
    expect(catalog.sourceSignature).toMatch(/^[a-f0-9]{64}$/);
  });

  it("seeds a F1 ranked-finish instance from the snapshot and computes the qualifying lock", () => {
    const [event] = normalizeJolpicaF1Catalog({ season: "2026", races, drivers: { MRData: { DriverTable: { Drivers: drivers } } } });
    const snapshot = withSnapshotFreshness(event!, {
      fetchedAt: "2026-06-01T00:00:00.000Z",
      expiresAt: "2026-06-02T12:00:00.000Z",
      sourceSignature: "fixture",
      now: new Date("2026-06-01T01:00:00.000Z"),
    });
    const settings = createF1SettingsFromCatalogEvent(snapshot, { commissionerName: "Ada" });

    expect(settings.basics).toMatchObject({
      commissionerName: "Ada",
      eventLabel: "Canadian Grand Prix",
      picksLockAt: "2026-06-13T17:45:00.000Z",
    });
    expect(settings.competitors).toHaveLength(10);
    expect(settings.competitors[0]).toEqual({ id: "driver-1", name: "Driver1 Example" });
  });

  it("marks expired snapshots stale without rewriting their provider readiness", () => {
    const [event] = normalizeJolpicaF1Catalog({ season: "2026", races, drivers: { MRData: { DriverTable: { Drivers: drivers } } } });
    const stale = withSnapshotFreshness(event!, {
      fetchedAt: "2026-06-01T00:00:00.000Z",
      expiresAt: "2026-06-01T01:00:00.000Z",
      sourceSignature: "fixture",
      now: new Date("2026-06-01T01:00:01.000Z"),
    });

    expect(stale.freshness).toBe("stale");
    expect(stale.readiness).toBe("provisional");
  });

  it("normalizes a confirmed NBA playoff field, stages, matchups, and series from a provider replay", () => {
    const event = normalizeEspnNbaPlayoffCatalog({ season: "2026", scoreboard: nbaScoreboard, standings: nbaStandings });

    expect(event).toMatchObject({ provider: "espn", externalId: "nba-2026-playoffs", readiness: "ready", fieldStatus: "confirmed" });
    expect(event.teams).toHaveLength(16);
    expect(event.series).toHaveLength(8);
    expect(event.matchups).toHaveLength(8);
    expect(event.lockWindows?.[0]).toMatchObject({ id: "first-tip", scope: "event" });
  });

  it("maps a reviewed NBA snapshot into the existing bracket simulation without hardcoded teams", () => {
    const event = normalizeEspnNbaPlayoffCatalog({ season: "2026", scoreboard: nbaScoreboard, standings: nbaStandings });
    const snapshot = withSnapshotFreshness(event, {
      fetchedAt: "2026-04-10T00:00:00.000Z",
      expiresAt: "2026-04-11T12:00:00.000Z",
      sourceSignature: "nba-fixture",
      now: new Date("2026-04-10T01:00:00.000Z"),
    });
    const settings = createNbaSettingsFromCatalogEvent(snapshot, { commissionerName: "Ada" });
    const firstSeries = createNbaSimulation(settings).series[0];

    expect(settings.basics.picksLockAt).toBe("2026-04-18T19:45:00.000Z");
    expect(settings.sourceSnapshot).toMatchObject({ provider: "espn", eventExternalId: "nba-2026-playoffs" });
    expect(firstSeries).toMatchObject({ home: { team: "Boston Celtics" }, away: { team: "Atlanta Hawks" } });
  });

  it("replays the ESPN provider boundary without live network access", async () => {
    const fetchImpl = async (url: string) => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => url.includes("standings") ? nbaStandings : nbaScoreboard,
    });
    const catalog = await fetchEspnNbaPlayoffCatalog({ season: "2026", fetchImpl });

    expect(catalog.events[0]?.readiness).toBe("ready");
    expect(catalog.sourceSignature).toMatch(/^[a-f0-9]{64}$/);
  });

  it("ships server-only catalog persistence and a protected scheduler route", () => {
    const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260716002000_event_catalog_snapshots.sql"), "utf8");
    const route = readFileSync(join(process.cwd(), "src/app/api/events/f1/refresh/route.ts"), "utf8");

    expect(migration).toContain("event_catalog_snapshots");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("unique (provider, event_external_id)");
    expect(route).toContain("CRON_SECRET");
    expect(route).toContain("syncF1EventCatalogToDatabase");
  });
});

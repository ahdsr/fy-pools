import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  fetchF1JolpicaCatalog,
  normalizeJolpicaF1Catalog,
} from "@/lib/events/f1-jolpica";
import { withSnapshotFreshness } from "@/lib/events/types";
import { createF1SettingsFromCatalogEvent } from "@/lib/ranked-finish/f1";

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

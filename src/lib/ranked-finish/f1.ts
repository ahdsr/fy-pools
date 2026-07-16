import type { CatalogEventSnapshot } from "@/lib/events/types";
import type { RankedFinishSettings } from "@/lib/ranked-finish/types";

export const F1_GRAND_PRIX_TEMPLATE_SLUG = "f1-grand-prix-predictor";

const DRIVERS = [
  "Max Verstappen", "Lando Norris", "Charles Leclerc", "Oscar Piastri", "George Russell",
  "Lewis Hamilton", "Fernando Alonso", "Carlos Sainz", "Alex Albon", "Kimi Antonelli",
];

export function createDefaultF1GrandPrixSettings(): RankedFinishSettings {
  return {
    templateSlug: F1_GRAND_PRIX_TEMPLATE_SLUG,
    basics: { poolName: "F1 Grand Prix Predictor", commissionerName: "", eventLabel: "Grand Prix Weekend", picksLockAt: "2026-08-02T08:00", timezone: "America/Toronto", description: "" },
    competitors: DRIVERS.map((name, index) => ({ id: `driver-${index + 1}`, name })),
    markets: [
      { id: "qualifying", label: "Qualifying", positions: 3, pointsPerExactPosition: 2 },
      { id: "race", label: "Race", positions: 3, pointsPerExactPosition: 3 },
    ],
    results: {},
  };
}

/** Builds a pool instance from a captured live-event snapshot, never from the shared template definition. */
export function createF1SettingsFromCatalogEvent(
  event: CatalogEventSnapshot,
  {
    commissionerName = "",
    poolName = `${event.displayName} Predictor`,
    timezone = "America/Toronto",
  }: {
    commissionerName?: string;
    poolName?: string;
    timezone?: string;
  } = {},
): RankedFinishSettings {
  if (event.competitionSlug !== "formula-1") {
    throw new Error("This event cannot be used with the F1 Grand Prix template.");
  }
  const qualifying = event.sessions.find((session) => session.id === "qualifying");
  if (!qualifying?.startsAt) {
    throw new Error("This event is missing a qualifying start time.");
  }
  const picksLockAt = new Date(Date.parse(qualifying.startsAt) - 15 * 60 * 1000).toISOString();
  const defaults = createDefaultF1GrandPrixSettings();
  return {
    ...defaults,
    basics: {
      ...defaults.basics,
      poolName,
      commissionerName,
      eventLabel: event.displayName,
      picksLockAt,
      timezone,
      description: `${event.location ? `${event.location}. ` : ""}Setup snapshot from ${event.provider}; ${event.readinessReason}`,
    },
    competitors: event.participants.map((participant) => ({
      id: participant.externalId,
      name: participant.name,
    })),
  };
}

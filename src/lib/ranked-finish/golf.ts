import type { CatalogEventSnapshot } from "@/lib/events/types";
import type { RankedFinishSettings } from "@/lib/ranked-finish/types";

export const GOLF_PGA_TOP_FIVE_TEMPLATE_SLUG = "golf-pga-top-five-predictor";

const GOLFERS = [
  "Scottie Scheffler", "Rory McIlroy", "Xander Schauffele", "Collin Morikawa",
  "Ludvig Åberg", "Justin Thomas", "Tommy Fleetwood", "Viktor Hovland",
  "Hideki Matsuyama", "Jordan Spieth",
];

export function createDefaultGolfPgaTopFiveSettings(): RankedFinishSettings {
  return {
    templateSlug: GOLF_PGA_TOP_FIVE_TEMPLATE_SLUG,
    basics: {
      poolName: "PGA Tour Top Five Predictor",
      commissionerName: "",
      eventLabel: "PGA Tour tournament",
      picksLockAt: "2026-08-06T11:45:00.000Z",
      timezone: "America/Toronto",
      description: "",
    },
    competitors: GOLFERS.map((name, index) => ({ id: `golfer-${index + 1}`, name })),
    markets: [{ id: "final-standings", label: "Final standings", positions: 5, pointsPerExactPosition: 3 }],
    results: {},
  };
}

/** Builds an individual pool from ESPN's captured tournament field, never a generic ranking list. */
export function createGolfSettingsFromCatalogEvent(
  event: CatalogEventSnapshot,
  {
    commissionerName = "",
    poolName = `${event.displayName} Top Five Predictor`,
    timezone = "America/Toronto",
  }: {
    commissionerName?: string;
    poolName?: string;
    timezone?: string;
  } = {},
): RankedFinishSettings {
  if (event.competitionSlug !== "pga-tour") {
    throw new Error("This event cannot be used with the PGA Tour Top Five template.");
  }
  const firstTee = event.sessions.find((session) => session.id === "first-tee");
  if (!firstTee?.startsAt) throw new Error("This tournament is missing a first-tee time.");
  if (event.participants.length < 2) throw new Error("This tournament field has not been published yet.");
  const defaults = createDefaultGolfPgaTopFiveSettings();
  return {
    ...defaults,
    basics: {
      ...defaults.basics,
      poolName,
      commissionerName,
      eventLabel: event.displayName,
      picksLockAt: new Date(Date.parse(firstTee.startsAt) - 15 * 60 * 1000).toISOString(),
      timezone,
      description: `${event.location ? `${event.location}. ` : ""}Setup snapshot from ${event.provider}; ${event.readinessReason}`,
    },
    competitors: event.participants.map((participant) => ({ id: participant.externalId, name: participant.name })),
    sourceSnapshot: {
      provider: event.provider,
      eventExternalId: event.externalId,
      sourceSignature: event.sourceSignature,
      fetchedAt: event.fetchedAt,
      fieldStatus: event.fieldStatus,
      rosterReviewed: false,
    },
  };
}

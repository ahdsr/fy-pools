import type { CatalogEventSnapshot } from "@/lib/events/types";
import type { RankedFinishSettings } from "@/lib/ranked-finish/types";

export const ATP_TOP_FOUR_TEMPLATE_SLUG = "tennis-atp-top-four-predictor";

const PLAYERS = [
  "Jannik Sinner", "Carlos Alcaraz", "Novak Djokovic", "Alexander Zverev",
  "Taylor Fritz", "Daniil Medvedev", "Casper Ruud", "Alex de Minaur",
  "Tommy Paul", "Lorenzo Musetti",
];

export function createDefaultAtpTopFourSettings(): RankedFinishSettings {
  return {
    templateSlug: ATP_TOP_FOUR_TEMPLATE_SLUG,
    basics: {
      poolName: "ATP Tour Top Four Predictor",
      commissionerName: "",
      eventLabel: "ATP Tour tournament",
      picksLockAt: "2026-08-03T10:45:00.000Z",
      timezone: "America/Toronto",
      description: "",
    },
    competitors: PLAYERS.map((name, index) => ({ id: `player-${index + 1}`, name })),
    markets: [{ id: "final-standings", label: "Final standings", positions: 4, pointsPerExactPosition: 3 }],
    results: {},
  };
}

/** Builds a pool from ESPN's captured ATP main-draw player field. */
export function createAtpSettingsFromCatalogEvent(
  event: CatalogEventSnapshot,
  {
    commissionerName = "",
    poolName = `${event.displayName} Top Four Predictor`,
    timezone = "America/Toronto",
  }: {
    commissionerName?: string;
    poolName?: string;
    timezone?: string;
  } = {},
): RankedFinishSettings {
  if (event.competitionSlug !== "atp-tour") {
    throw new Error("This event cannot be used with the ATP Tour Top Four template.");
  }
  const firstServe = event.sessions.find((session) => session.id === "first-serve");
  if (!firstServe?.startsAt) throw new Error("This tournament is missing its first main-draw serve time.");
  if (event.participants.length < 2) throw new Error("This tournament field has not been published yet.");
  const defaults = createDefaultAtpTopFourSettings();
  return {
    ...defaults,
    basics: {
      ...defaults.basics,
      poolName,
      commissionerName,
      eventLabel: event.displayName,
      picksLockAt: new Date(Date.parse(firstServe.startsAt) - 15 * 60 * 1000).toISOString(),
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

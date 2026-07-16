import type { CatalogEventSnapshot } from "@/lib/events/types";
import { createDefaultNbaSeriesSettings } from "@/lib/nba-series/draft";
import type { NbaSeriesSettings, NbaTeam } from "@/lib/nba-series/types";

function catalogTeams(event: CatalogEventSnapshot): NbaTeam[] {
  const teams = event.teams ?? [];
  const mapped = teams.map((team) => {
    if ((team.conference !== "east" && team.conference !== "west") || !Number.isInteger(team.seed) || typeof team.seed !== "number") {
      throw new Error("The live NBA field is missing a conference or playoff seed.");
    }
    return { id: team.externalId, name: team.name, conference: team.conference, seed: team.seed } satisfies NbaTeam;
  });
  if (mapped.length !== 16) throw new Error("The live NBA field must include all 16 playoff teams.");
  return mapped;
}

export function createNbaSettingsFromCatalogEvent(
  event: CatalogEventSnapshot,
  {
    commissionerName = "",
    poolName = `${event.displayName} Bracket`,
    timezone = "America/Toronto",
  }: { commissionerName?: string; poolName?: string; timezone?: string } = {},
): NbaSeriesSettings {
  if (event.competitionSlug !== "nba-playoffs") throw new Error("This event cannot seed the NBA Series Bracket.");
  if (event.freshness !== "ready" || event.readiness !== "ready") throw new Error("Refresh the confirmed NBA playoff event before using it for a pool.");
  const lock = event.lockWindows?.find((window) => window.id === "first-tip")?.locksAt ?? event.startsAt;
  if (!lock) throw new Error("This NBA event is missing the first playoff tip.");
  const defaults = createDefaultNbaSeriesSettings();
  return {
    ...defaults,
    basics: {
      ...defaults.basics,
      poolName,
      commissionerName,
      eventLabel: event.displayName,
      picksLockAt: new Date(Date.parse(lock) - 15 * 60 * 1000).toISOString(),
      timezone,
      description: `Setup snapshot from ${event.provider}. ${event.readinessReason}`,
    },
    teams: catalogTeams(event),
    sourceSnapshot: {
      provider: event.provider,
      eventExternalId: event.externalId,
      sourceSignature: event.sourceSignature,
      fetchedAt: event.fetchedAt,
      fieldStatus: event.fieldStatus,
    },
  };
}

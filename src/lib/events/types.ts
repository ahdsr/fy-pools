export type EventCatalogProvider = "jolpica";

export type EventCatalogReadiness =
  | "ready"
  | "provisional"
  | "unavailable"
  | "stale";

export type EventFieldStatus = "confirmed" | "season-roster" | "unknown";

export type CatalogParticipant = {
  externalId: string;
  name: string;
  shortName?: string;
  status: "confirmed" | "provisional";
};

export type CatalogSession = {
  id: string;
  label: string;
  startsAt?: string;
};

/**
 * The provider-neutral setup snapshot used by every event-backed template.
 * It deliberately distinguishes a confirmed event field from a season roster:
 * providers often publish the latter well before individual entries are final.
 */
export type CatalogEvent = {
  provider: EventCatalogProvider;
  externalId: string;
  sportSlug: string;
  competitionSlug: string;
  seasonSlug: string;
  displayName: string;
  location?: string;
  startsAt?: string;
  sessions: CatalogSession[];
  participants: CatalogParticipant[];
  fieldStatus: EventFieldStatus;
  readiness: Exclude<EventCatalogReadiness, "stale">;
  readinessReason: string;
  sourceUrl: string;
};

export type CatalogEventSnapshot = CatalogEvent & {
  fetchedAt: string;
  sourceSignature: string;
  expiresAt: string;
  freshness: EventCatalogReadiness;
};

export function catalogReadiness(
  event: Pick<
    CatalogEvent,
    "startsAt" | "sessions" | "participants" | "fieldStatus"
  >,
): Pick<CatalogEvent, "readiness" | "readinessReason"> {
  const qualifying = event.sessions.find((session) => session.id === "qualifying");

  if (!event.startsAt || !qualifying?.startsAt) {
    return {
      readiness: "unavailable",
      readinessReason: "The race or qualifying schedule is not available from the provider.",
    };
  }

  if (event.participants.length < 10) {
    return {
      readiness: "unavailable",
      readinessReason: "The provider returned too few competitors to safely prepare a Top 3 pool.",
    };
  }

  if (event.fieldStatus !== "confirmed") {
    return {
      readiness: "provisional",
      readinessReason:
        "Using the current season roster. Review the final event entry list before publishing.",
    };
  }

  return {
    readiness: "ready",
    readinessReason: "Schedule and event-specific competitor field are confirmed.",
  };
}

export function withSnapshotFreshness(
  event: CatalogEvent,
  {
    fetchedAt,
    sourceSignature,
    expiresAt,
    now = new Date(),
  }: {
    fetchedAt: string;
    sourceSignature: string;
    expiresAt: string;
    now?: Date;
  },
): CatalogEventSnapshot {
  const expiry = Date.parse(expiresAt);
  const freshness = Number.isFinite(expiry) && now.getTime() > expiry
    ? "stale"
    : event.readiness;

  return { ...event, fetchedAt, sourceSignature, expiresAt, freshness };
}

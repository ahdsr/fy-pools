/** Provider names are intentionally open so adding a sport never changes the catalog schema. */
export type EventCatalogProvider = string;

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

export type CatalogTeam = {
  externalId: string;
  name: string;
  shortName?: string;
  conference?: string;
  seed?: number;
  status: "confirmed" | "provisional";
};

export type CatalogSession = {
  id: string;
  label: string;
  startsAt?: string;
};

export type CatalogStage = {
  id: string;
  label: string;
  order: number;
  kind: "group" | "round" | "series" | "race" | "other";
};

export type CatalogMatchup = {
  externalId: string;
  label: string;
  stageId?: string;
  startsAt?: string;
  homeTeamId?: string;
  awayTeamId?: string;
  status: "scheduled" | "in-progress" | "complete" | "unknown";
};

export type CatalogSeries = {
  externalId: string;
  label: string;
  stageId?: string;
  startsAt?: string;
  teamIds: string[];
  matchupIds: string[];
  bestOf?: number;
  status: "scheduled" | "in-progress" | "complete" | "unknown";
};

export type CatalogLockWindow = {
  id: string;
  label: string;
  locksAt: string;
  scope: "event" | "stage" | "matchup";
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
  teams?: CatalogTeam[];
  stages?: CatalogStage[];
  matchups?: CatalogMatchup[];
  series?: CatalogSeries[];
  lockWindows?: CatalogLockWindow[];
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
  event: Pick<CatalogEvent, "startsAt" | "sessions" | "participants" | "teams" | "series" | "fieldStatus">,
  {
    requiredSessionIds = [],
    minimumParticipants = 0,
    minimumTeams = 0,
    requireSeries = false,
  }: {
    requiredSessionIds?: string[];
    minimumParticipants?: number;
    minimumTeams?: number;
    requireSeries?: boolean;
  } = {},
): Pick<CatalogEvent, "readiness" | "readinessReason"> {
  const missingSession = requiredSessionIds.find(
    (sessionId) => !event.sessions.some((session) => session.id === sessionId && session.startsAt),
  );
  if (!event.startsAt || missingSession) {
    return {
      readiness: "unavailable",
      readinessReason: "The event schedule is not complete enough to set a safe pick lock.",
    };
  }

  if (event.participants.length < minimumParticipants) {
    return {
      readiness: "unavailable",
      readinessReason: "The provider returned too few competitors for this template.",
    };
  }

  if ((event.teams?.length ?? 0) < minimumTeams) {
    return {
      readiness: "unavailable",
      readinessReason: "The provider has not confirmed enough teams for this template.",
    };
  }

  if (requireSeries && !(event.series?.length)) {
    return {
      readiness: "unavailable",
      readinessReason: "The provider has not published a playable bracket or series schedule.",
    };
  }

  if (event.fieldStatus !== "confirmed") {
    return {
      readiness: "provisional",
      readinessReason:
        "The field is provisional. Review the final event entry list before publishing.",
    };
  }

  return {
    readiness: "ready",
    readinessReason: "The schedule and event-specific field are confirmed.",
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

export const RESTORABLE_POOL_STATUSES = [
  "draft",
  "open",
  "locked",
  "completed",
] as const;

export type RestorablePoolStatus = (typeof RESTORABLE_POOL_STATUSES)[number];

type PoolSettings = Record<string, unknown>;

function asSettings(value: unknown): PoolSettings {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as PoolSettings) }
    : {};
}

function asLifecycle(value: unknown): PoolSettings {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as PoolSettings) }
    : {};
}

export function isArchivedPool(status: unknown) {
  return status === "archived";
}

export function archivePoolSettings(settings: unknown, status: unknown) {
  const nextSettings = asSettings(settings);
  const lifecycle = asLifecycle(nextSettings.lifecycle);
  const previousStatus = RESTORABLE_POOL_STATUSES.includes(
    status as RestorablePoolStatus,
  )
    ? status
    : "open";

  return {
    ...nextSettings,
    lifecycle: {
      ...lifecycle,
      archivedStatus: previousStatus,
    },
  };
}

export function restorePoolSettings(settings: unknown) {
  const nextSettings = asSettings(settings);
  const lifecycle = asLifecycle(nextSettings.lifecycle);
  const archivedStatus = lifecycle.archivedStatus;
  const status = RESTORABLE_POOL_STATUSES.includes(
    archivedStatus as RestorablePoolStatus,
  )
    ? archivedStatus
    : "open";
  const remainingLifecycle = { ...lifecycle };
  delete remainingLifecycle.archivedStatus;

  return {
    status,
    settings: {
      ...nextSettings,
      lifecycle: remainingLifecycle,
    },
  } as const;
}

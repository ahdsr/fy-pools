import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { unstable_rethrow } from "next/navigation";

import {
  buildResultsFromEvents,
  ESPN_SCOREBOARD_URL,
  createTeamResolver,
  fetchFifaBonusResults,
} from "@/lib/world-cup-pool/results-updater";
import type {
  EntriesConfig,
  EntryPicks,
  PoolFixture,
  PoolResults,
} from "@/lib/world-cup-pool/types";

export const MARCINS_POOL_SLUG = "marcins-2026-world-cup-pool";

export const PUBLIC_POOL_SLUGS = [
  MARCINS_POOL_SLUG,
  "marcins-world-cup-2026",
  "marcin-world-cup-2026",
] as const;

const POOL_ALIASES = new Set<string>([
  ...PUBLIC_POOL_SLUGS,
]);

const DATA_DIR = path.join(
  process.cwd(),
  "src",
  "data",
  "marcins-world-cup-2026",
);
const DEFAULT_FIFA_BONUS_CACHE_MS = 60 * 1000;
const DEFAULT_FIFA_BONUS_REQUEST_TIMEOUT_MS = 1800;
const DEFAULT_FIFA_BONUS_WARM_TIMEOUT_MS = 15 * 1000;
const DEFAULT_ESPN_REQUEST_TIMEOUT_MS = 8 * 1000;

type FifaBonusResults = Record<string, string[]>;

type LiveResultsCacheState = {
  lastResults?: PoolResults;
  lastResultsAt?: number;
  bonusResults?: FifaBonusResults;
  bonusFetchedAt?: number;
  bonusPromise?: Promise<FifaBonusResults>;
};

const globalScope = globalThis as typeof globalThis & {
  __fyPoolsLiveResultsCache?: LiveResultsCacheState;
};

function liveResultsCache() {
  globalScope.__fyPoolsLiveResultsCache ??= {};
  return globalScope.__fyPoolsLiveResultsCache;
}

function envMs(name: string, fallback: number, minimum = 0) {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) ? Math.max(parsed, minimum) : fallback;
}

function timeoutError(message: string) {
  const error = new Error(message);
  error.name = "TimeoutError";
  return error;
}

function logRefreshWarning(message: string, error: unknown) {
  if (error instanceof Error && error.name === "TimeoutError") {
    console.warn(`${message}: ${error.message}`);
    return;
  }

  console.warn(message, error);
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
) {
  if (timeoutMs <= 0) return promise;

  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(timeoutError(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function readFixtureJson<T>(fileName: string): Promise<T> {
  const json = await readFile(path.join(DATA_DIR, fileName), "utf8");
  return JSON.parse(json) as T;
}

function fixtureFileFromPicksPath(picksPath: string) {
  return path.basename(picksPath);
}

type StaticPoolFixture = Omit<PoolFixture, "results"> & {
  fallbackResults: PoolResults;
  manualOverrides: Partial<PoolResults>;
  aliases: { aliases?: Record<string, string> };
};

const getMarcinsWorldCupStaticPool = cache(async (): Promise<StaticPoolFixture> => {
  const entriesConfig = await readFixtureJson<EntriesConfig>("entries.json");
  const [fallbackResults, manualOverrides, aliases, picksByPathEntries] =
    await Promise.all([
      readFixtureJson<PoolResults>("results.json"),
      readFixtureJson<Partial<PoolResults>>("manual-overrides.json"),
      readFixtureJson<{ aliases?: Record<string, string> }>("team-aliases.json"),
      Promise.all(
        entriesConfig.entries
          .map((entry) => entry.picksPath)
          .filter((picksPath): picksPath is string => Boolean(picksPath))
          .map(async (picksPath) => [
            picksPath,
            await readFixtureJson<EntryPicks>(fixtureFileFromPicksPath(picksPath)),
          ] as const),
      ),
    ]);

  return {
    slug: MARCINS_POOL_SLUG,
    entriesConfig,
    fallbackResults,
    manualOverrides,
    aliases,
    picksByPath: new Map(picksByPathEntries),
  };
});

async function fetchLiveResults({
  referencePicks,
  aliases,
  manualOverrides,
  fallbackResults,
  forceBonusRefresh = false,
  bonusTimeoutMs = envMs(
    "FY_POOLS_FIFA_BONUS_REQUEST_TIMEOUT_MS",
    DEFAULT_FIFA_BONUS_REQUEST_TIMEOUT_MS,
  ),
}: {
  referencePicks?: EntryPicks;
  aliases: { aliases?: Record<string, string> };
  manualOverrides: Partial<PoolResults>;
  fallbackResults: PoolResults;
  forceBonusRefresh?: boolean;
  bonusTimeoutMs?: number;
}) {
  if (!referencePicks) return fallbackResults;

  try {
    const events = await fetchEspnEvents();
    const resolveTeam = createTeamResolver(referencePicks, aliases);
    const fifaBonusResults = await getFifaBonusResults(resolveTeam, {
      force: forceBonusRefresh,
      timeoutMs: bonusTimeoutMs,
    });

    const results = buildResultsFromEvents(events, {
      picks: referencePicks,
      aliases,
      manualOverrides,
      fifaBonusResults,
    });

    const state = liveResultsCache();
    state.lastResults = results;
    state.lastResultsAt = Date.now();

    return results;
  } catch (error) {
    unstable_rethrow(error);
    const state = liveResultsCache();
    console.error(
      state.lastResults
        ? "[fy-pools] Live results fetch failed; using last successful live results"
        : "[fy-pools] Live results fetch failed; using fixture fallback",
      error,
    );
    return state.lastResults ?? fallbackResults;
  }
}

async function fetchEspnEvents() {
  const response = await withTimeout(
    fetch(ESPN_SCOREBOARD_URL, {
      cache: "no-store",
    }),
    envMs(
      "FY_POOLS_ESPN_REQUEST_TIMEOUT_MS",
      DEFAULT_ESPN_REQUEST_TIMEOUT_MS,
      1000,
    ),
    "ESPN scoreboard request timed out",
  );

  if (!response.ok) {
    throw new Error(`ESPN scoreboard request failed with ${response.status}`);
  }

  const scoreboard = (await response.json()) as { events?: unknown };
  if (!Array.isArray(scoreboard.events)) {
    throw new Error("ESPN scoreboard response did not include events");
  }

  return scoreboard.events as Parameters<typeof buildResultsFromEvents>[0];
}

async function getFifaBonusResults(
  resolveTeam: (value: unknown) => string,
  {
    force = false,
    timeoutMs,
  }: {
    force?: boolean;
    timeoutMs: number;
  },
): Promise<FifaBonusResults> {
  const state = liveResultsCache();
  const now = Date.now();
  const bonusCacheMs = envMs(
    "FY_POOLS_FIFA_BONUS_CACHE_MS",
    DEFAULT_FIFA_BONUS_CACHE_MS,
  );

  if (
    !force &&
    state.bonusResults &&
    state.bonusFetchedAt &&
    now - state.bonusFetchedAt < bonusCacheMs
  ) {
    return state.bonusResults;
  }

  if (!force && state.bonusPromise) {
    try {
      return await withTimeout(
        state.bonusPromise,
        timeoutMs,
        "FIFA bonus results request timed out",
      );
    } catch (error) {
      unstable_rethrow(error);
      logRefreshWarning("[fy-pools] FIFA bonus refresh is still pending", error);
      return state.bonusResults ?? {};
    }
  }

  const pending = fetchFifaBonusResults(resolveTeam).then((results) => {
    state.bonusResults = results;
    state.bonusFetchedAt = Date.now();
    return results;
  });
  const trackedPending = pending.finally(() => {
    if (state.bonusPromise === trackedPending) {
      state.bonusPromise = undefined;
    }
  });
  state.bonusPromise = trackedPending;

  try {
    return await withTimeout(
      trackedPending,
      timeoutMs,
      "FIFA bonus results request timed out",
    );
  } catch (error) {
    unstable_rethrow(error);
    logRefreshWarning(
      "[fy-pools] FIFA bonus refresh failed; using cached bonus results",
      error,
    );
    return state.bonusResults ?? {};
  }
}

type GetMarcinsWorldCupPoolOptions = {
  forceBonusRefresh?: boolean;
  bonusTimeoutMs?: number;
};

export async function getMarcinsWorldCupPool(
  options: GetMarcinsWorldCupPoolOptions = {},
): Promise<PoolFixture> {
  const staticPool = await getMarcinsWorldCupStaticPool();
  const referencePicksPath = staticPool.entriesConfig.entries.find(
    (entry) => entry.picksPath,
  )?.picksPath;
  const referencePicks = referencePicksPath
    ? staticPool.picksByPath.get(referencePicksPath)
    : undefined;
  const results = await fetchLiveResults({
    referencePicks,
    aliases: staticPool.aliases,
    manualOverrides: staticPool.manualOverrides,
    fallbackResults: staticPool.fallbackResults,
    forceBonusRefresh: options.forceBonusRefresh,
    bonusTimeoutMs: options.bonusTimeoutMs,
  });

  return {
    slug: staticPool.slug,
    entriesConfig: staticPool.entriesConfig,
    picksByPath: staticPool.picksByPath,
    results,
  };
}

export async function getPublicPool(poolSlug: string) {
  if (!POOL_ALIASES.has(poolSlug)) return null;
  return getMarcinsWorldCupPool();
}

export async function warmMarcinsWorldCupResults() {
  return getMarcinsWorldCupPool({
    forceBonusRefresh: true,
    bonusTimeoutMs: envMs(
      "FY_POOLS_FIFA_BONUS_WARM_TIMEOUT_MS",
      DEFAULT_FIFA_BONUS_WARM_TIMEOUT_MS,
      1000,
    ),
  });
}

export function formatDateTime(value: string | undefined) {
  if (!value) return "Not updated";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatList(items: string[]) {
  const values = items.filter(Boolean);
  if (values.length <= 1) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { unstable_rethrow } from "next/navigation";

import { formatDateTime } from "@/lib/date-time";
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
  ResultsFreshness,
} from "@/lib/world-cup-pool/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
export { formatDateTime };

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
const DEFAULT_FIFA_BONUS_WARM_TIMEOUT_MS = 15 * 1000;
const DEFAULT_ESPN_REQUEST_TIMEOUT_MS = 1200;
const DEFAULT_RESULTS_STALE_MS = 5 * 60 * 1000;

type FifaBonusResults = Record<string, string[]>;

type LiveResultsCacheState = {
  bonusResults?: FifaBonusResults;
  bonusFetchedAt?: number;
  bonusPromise?: Promise<FifaBonusResults>;
};

type StoredWorldCupResultSnapshot = {
  results: PoolResults;
  freshness: ResultsFreshness;
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

function teamSignature(competitor: {
  team?: {
    displayName?: string;
    shortDisplayName?: string;
    name?: string;
    abbreviation?: string;
  };
}) {
  return (
    competitor.team?.displayName ??
    competitor.team?.shortDisplayName ??
    competitor.team?.name ??
    competitor.team?.abbreviation ??
    ""
  );
}

function scoreboardSignature(
  events: Parameters<typeof buildResultsFromEvents>[0],
  manualOverrides: Partial<PoolResults>,
) {
  return JSON.stringify({
    events: events.map((event) => {
      const competition = event.competitions?.[0] ?? {};
      const status = competition.status?.type ?? event.status?.type ?? {};
      const competitors = (competition.competitors ?? []).map((competitor) => ({
        homeAway: competitor.homeAway ?? "",
        score: competitor.score ?? null,
        winner: Boolean(competitor.winner),
        team: teamSignature(competitor),
      }));

      return {
        id: event.id ?? competition.id ?? "",
        date: event.date ?? competition.date ?? "",
        state: status.state ?? "pre",
        completed: Boolean(status.completed),
        competitors,
      };
    }),
    manualOverrides,
  });
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

type StaticPoolFixture = Omit<PoolFixture, "results" | "resultsFreshness"> & {
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

export function resultAgeSeconds(fetchedAt: string, now = Date.now()) {
  const fetchedTime = new Date(fetchedAt).getTime();
  if (!Number.isFinite(fetchedTime)) return Number.POSITIVE_INFINITY;

  return Math.max(0, Math.floor((now - fetchedTime) / 1000));
}

export function resultsAreStale(fetchedAt: string, now = Date.now()) {
  const staleMs = envMs("FY_POOLS_RESULTS_STALE_MS", DEFAULT_RESULTS_STALE_MS);
  return resultAgeSeconds(fetchedAt, now) * 1000 > staleMs;
}

function freshnessFromSnapshot({
  fetchedAt,
  source,
  sourceSignature,
  status,
  lastError,
}: {
  fetchedAt: string;
  source: string;
  sourceSignature?: string;
  status: string;
  lastError?: string | null;
}): ResultsFreshness {
  return {
    fetchedAt,
    source,
    sourceSignature,
    stale: resultsAreStale(fetchedAt),
    ageSeconds: resultAgeSeconds(fetchedAt),
    status,
    lastError,
  };
}

function fallbackFreshness(results: PoolResults): ResultsFreshness {
  const fetchedAt = results.meta?.lastUpdated ?? "";

  return {
    fetchedAt,
    source: "fixture",
    stale: true,
    ageSeconds: fetchedAt ? resultAgeSeconds(fetchedAt) : Number.POSITIVE_INFINITY,
    status:
      "Using bundled fixture results because no durable live result snapshot is available.",
    lastError: null,
  };
}

export async function readWorldCupResultSnapshot(
  poolSlug: string,
): Promise<StoredWorldCupResultSnapshot | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("public_result_snapshots")
      .select(
        "results_payload,source,source_signature,fetched_at,status,last_error",
      )
      .eq("pool_slug", poolSlug)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data?.results_payload) return null;

    const fetchedAt = String(data.fetched_at ?? "");
    return {
      results: data.results_payload as PoolResults,
      freshness: freshnessFromSnapshot({
        fetchedAt,
        source: String(data.source ?? "unknown"),
        sourceSignature: data.source_signature
          ? String(data.source_signature)
          : undefined,
        status: String(data.status ?? "ok"),
        lastError: data.last_error ? String(data.last_error) : null,
      }),
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[fy-pools] Stored result snapshot read failed", error);
    return null;
  }
}

async function writeWorldCupResultSnapshot({
  poolSlug,
  results,
  sourceSignature,
}: {
  poolSlug: string;
  results: PoolResults;
  sourceSignature: string;
}) {
  if (!isSupabaseConfigured()) return;

  const fetchedAt = results.meta?.lastUpdated ?? new Date().toISOString();
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("public_result_snapshots").upsert(
    {
      pool_slug: poolSlug,
      results_payload: results,
      source: results.meta?.source ?? "espn",
      source_signature: sourceSignature,
      fetched_at: fetchedAt,
      status: results.meta?.status ?? "ok",
      last_error: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "pool_slug" },
  );

  if (error) throw new Error(error.message);
}

export async function recordWorldCupResultSnapshotError({
  poolSlug,
  error,
}: {
  poolSlug: string;
  error: unknown;
}) {
  if (!isSupabaseConfigured()) return;

  try {
    const admin = createSupabaseAdminClient();
    const { error: updateError } = await admin
      .from("public_result_snapshots")
      .update({
        last_error: error instanceof Error ? error.message : String(error),
        updated_at: new Date().toISOString(),
      })
      .eq("pool_slug", poolSlug);

    if (updateError) throw new Error(updateError.message);
  } catch (updateError) {
    unstable_rethrow(updateError);
    console.error("[fy-pools] Stored result snapshot error update failed", updateError);
  }
}

async function buildFreshLiveResults({
  referencePicks,
  aliases,
  manualOverrides,
  bonusTimeoutMs,
}: {
  referencePicks: EntryPicks;
  aliases: { aliases?: Record<string, string> };
  manualOverrides: Partial<PoolResults>;
  bonusTimeoutMs: number;
}) {
  const events = await fetchEspnEvents();
  const sourceSignature = scoreboardSignature(events, manualOverrides);
  const resolveTeam = createTeamResolver(referencePicks, aliases);
  const fifaBonusResults = await getFifaBonusResults(resolveTeam, {
    force: true,
    timeoutMs: bonusTimeoutMs,
  });
  const results = buildResultsFromEvents(events, {
    picks: referencePicks,
    aliases,
    manualOverrides,
    fifaBonusResults,
  });

  return { results, sourceSignature };
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

function getReferencePicks(staticPool: StaticPoolFixture) {
  const referencePicksPath = staticPool.entriesConfig.entries.find(
    (entry) => entry.picksPath,
  )?.picksPath;

  return referencePicksPath
    ? staticPool.picksByPath.get(referencePicksPath)
    : undefined;
}

export async function getMarcinsWorldCupPool(): Promise<PoolFixture> {
  const staticPool = await getMarcinsWorldCupStaticPool();
  const storedSnapshot = await readWorldCupResultSnapshot(MARCINS_POOL_SLUG);
  const results = storedSnapshot?.results ?? staticPool.fallbackResults;
  const resultsFreshness =
    storedSnapshot?.freshness ?? fallbackFreshness(staticPool.fallbackResults);

  return {
    slug: staticPool.slug,
    entriesConfig: staticPool.entriesConfig,
    picksByPath: staticPool.picksByPath,
    results,
    resultsFreshness,
  };
}

export async function getPublicPool(poolSlug: string) {
  if (!POOL_ALIASES.has(poolSlug)) return null;
  return getMarcinsWorldCupPool();
}

export async function warmMarcinsWorldCupResults() {
  const staticPool = await getMarcinsWorldCupStaticPool();
  const referencePicks = getReferencePicks(staticPool);
  if (!referencePicks) {
    throw new Error("Reference picks were not found for live result refresh.");
  }

  const { results, sourceSignature } = await buildFreshLiveResults({
    referencePicks,
    aliases: staticPool.aliases,
    manualOverrides: staticPool.manualOverrides,
    bonusTimeoutMs: envMs(
      "FY_POOLS_FIFA_BONUS_WARM_TIMEOUT_MS",
      DEFAULT_FIFA_BONUS_WARM_TIMEOUT_MS,
      1000,
    ),
  });

  await writeWorldCupResultSnapshot({
    poolSlug: MARCINS_POOL_SLUG,
    results,
    sourceSignature,
  });

  return {
    slug: staticPool.slug,
    entriesConfig: staticPool.entriesConfig,
    picksByPath: staticPool.picksByPath,
    results,
    resultsFreshness: freshnessFromSnapshot({
      fetchedAt: results.meta?.lastUpdated ?? new Date().toISOString(),
      source: results.meta?.source ?? "espn",
      sourceSignature,
      status: results.meta?.status ?? "ok",
      lastError: null,
    }),
  } satisfies PoolFixture;
}

export function scoreRefreshLabel(pool: PoolFixture) {
  return formatDateTime(
    pool.resultsFreshness.fetchedAt || pool.results.meta?.lastUpdated,
  );
}

export function scoreRefreshSourceLabel(pool: PoolFixture) {
  if (pool.resultsFreshness.source === "fixture") return "fixture fallback";
  if (pool.resultsFreshness.source === "espn") return "ESPN/FIFA";
  return pool.resultsFreshness.source;
}

export function scoreRefreshStatus(pool: PoolFixture) {
  const liveMatches = (pool.results.matches ?? []).filter(
    (match) => match.state === "in" && !match.completed,
  ).length;
  const parts = [
    pool.resultsFreshness.stale
      ? `Snapshot is older than the freshness target (${pool.resultsFreshness.ageSeconds}s).`
      : "",
    liveMatches > 0
      ? `${liveMatches} live match${liveMatches === 1 ? "" : "es"} counted; totals can move until matches finish.`
      : "",
    pool.resultsFreshness.lastError
      ? `Last refresh error: ${pool.resultsFreshness.lastError}`
      : "",
  ].filter(Boolean);

  return parts.join(" ");
}

export function formatList(items: string[]) {
  const values = items.filter(Boolean);
  if (values.length <= 1) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

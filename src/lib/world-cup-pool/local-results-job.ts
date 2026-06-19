import "server-only";

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildResultsFromEvents,
  ESPN_SCOREBOARD_URL,
} from "@/lib/world-cup-pool/results-updater";
import type { EntryPicks, PoolResults } from "@/lib/world-cup-pool/types";

const DATA_DIR = path.join(
  process.cwd(),
  "src",
  "data",
  "marcins-world-cup-2026",
);
const DEFAULT_REFRESH_MS = 2 * 60 * 1000;
const MIN_REFRESH_MS = 30 * 1000;

type EntriesConfigForUpdate = {
  entries: { picksPath?: string }[];
};

type LocalResultsJobState = {
  started: boolean;
  running: boolean;
  interval?: ReturnType<typeof setInterval>;
  lastRunAt?: string;
  lastError?: string;
};

const globalScope = globalThis as typeof globalThis & {
  __fyPoolsLocalResultsJob?: LocalResultsJobState;
};

function getState() {
  globalScope.__fyPoolsLocalResultsJob ??= {
    started: false,
    running: false,
  };

  return globalScope.__fyPoolsLocalResultsJob;
}

function localResultsJobEnabled() {
  if (process.env.FY_POOLS_LOCAL_RESULTS_JOB === "0") return false;
  return (
    process.env.NODE_ENV === "development" ||
    process.env.FY_POOLS_LOCAL_RESULTS_JOB === "1"
  );
}

function refreshIntervalMs() {
  const parsed = Number.parseInt(
    process.env.FY_POOLS_LOCAL_RESULTS_REFRESH_MS ?? "",
    10,
  );

  return Number.isFinite(parsed)
    ? Math.max(parsed, MIN_REFRESH_MS)
    : DEFAULT_REFRESH_MS;
}

async function readJson<T>(fileName: string): Promise<T> {
  const json = await readFile(path.join(DATA_DIR, fileName), "utf8");
  return JSON.parse(json) as T;
}

function pickSeedFileName(entriesConfig: EntriesConfigForUpdate) {
  const picksPath =
    entriesConfig.entries.find((entry) => entry.picksPath)?.picksPath ??
    "picks.json";

  return path.basename(picksPath);
}

async function fetchEspnEvents() {
  const response = await fetch(ESPN_SCOREBOARD_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`ESPN scoreboard request failed with ${response.status}`);
  }

  const scoreboard = (await response.json()) as { events?: unknown };
  if (!Array.isArray(scoreboard.events)) {
    throw new Error("ESPN scoreboard response did not include events");
  }

  return scoreboard.events as Parameters<typeof buildResultsFromEvents>[0];
}

export async function updateLocalWorldCupResults() {
  const entriesConfig = await readJson<EntriesConfigForUpdate>("entries.json");
  const [picks, aliases, manualOverrides, events] = await Promise.all([
    readJson<EntryPicks>(pickSeedFileName(entriesConfig)),
    readJson<{ aliases?: Record<string, string> }>("team-aliases.json"),
    readJson<Partial<PoolResults>>("manual-overrides.json"),
    fetchEspnEvents(),
  ]);

  const results = buildResultsFromEvents(events, {
    picks,
    aliases,
    manualOverrides,
  });

  await writeFile(
    path.join(DATA_DIR, "results.json"),
    `${JSON.stringify(results, null, 2)}\n`,
    "utf8",
  );

  return results.meta?.lastUpdated;
}

async function runUpdate(state: LocalResultsJobState) {
  if (state.running) return;

  state.running = true;
  try {
    state.lastRunAt = await updateLocalWorldCupResults();
    state.lastError = undefined;
  } catch (error) {
    state.lastError = error instanceof Error ? error.message : String(error);
    console.error("[fy-pools] Local results update failed", error);
  } finally {
    state.running = false;
  }
}

export function startLocalResultsJob() {
  if (!localResultsJobEnabled()) return;

  const state = getState();
  if (state.started) return;

  state.started = true;
  void runUpdate(state);

  const interval = setInterval(() => {
    void runUpdate(state);
  }, refreshIntervalMs());

  if (typeof interval === "object" && "unref" in interval) {
    interval.unref();
  }

  state.interval = interval;
}

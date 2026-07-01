import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { unstable_rethrow } from "next/navigation";

import {
  buildResultsFromEvents,
  ESPN_SCOREBOARD_URL,
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
}: {
  referencePicks?: EntryPicks;
  aliases: { aliases?: Record<string, string> };
  manualOverrides: Partial<PoolResults>;
  fallbackResults: PoolResults;
}) {
  if (!referencePicks) return fallbackResults;

  try {
    const response = await fetch(ESPN_SCOREBOARD_URL, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`ESPN scoreboard request failed with ${response.status}`);
    }

    const scoreboard = (await response.json()) as { events?: unknown };
    if (!Array.isArray(scoreboard.events)) {
      throw new Error("ESPN scoreboard response did not include events");
    }

    return buildResultsFromEvents(
      scoreboard.events as Parameters<typeof buildResultsFromEvents>[0],
      {
        picks: referencePicks,
        aliases,
        manualOverrides,
      },
    );
  } catch (error) {
    unstable_rethrow(error);
    console.error("[fy-pools] Live results fetch failed; using fixture fallback", error);
    return fallbackResults;
  }
}

export async function getMarcinsWorldCupPool(): Promise<PoolFixture> {
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

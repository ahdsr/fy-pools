import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import type {
  EntriesConfig,
  EntryPicks,
  PoolFixture,
  PoolResults,
} from "@/lib/world-cup-pool/types";

export const MARCINS_POOL_SLUG = "marcins-2026-world-cup-pool";

const POOL_ALIASES = new Set([
  MARCINS_POOL_SLUG,
  "marcins-world-cup-2026",
  "marcin-world-cup-2026",
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

export const getMarcinsWorldCupPool = cache(async (): Promise<PoolFixture> => {
  const entriesConfig = await readFixtureJson<EntriesConfig>("entries.json");
  const results = await readFixtureJson<PoolResults>("results.json");
  const picksByPathEntries = await Promise.all(
    entriesConfig.entries
      .map((entry) => entry.picksPath)
      .filter((picksPath): picksPath is string => Boolean(picksPath))
      .map(async (picksPath) => [
        picksPath,
        await readFixtureJson<EntryPicks>(fixtureFileFromPicksPath(picksPath)),
      ] as const),
  );

  return {
    slug: MARCINS_POOL_SLUG,
    entriesConfig,
    results,
    picksByPath: new Map(picksByPathEntries),
  };
});

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

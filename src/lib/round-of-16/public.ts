import "server-only";

import { getLatestRoundOf16Standings } from "@/lib/round-of-16/persistence";
import {
  pickPayloadAndItemIdsFromItems,
  type RoundOf16StoredLeaderboardRow,
} from "@/lib/round-of-16/persistence";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type {
  RoundOf16PickPayload,
  RoundOf16PoolSettings,
} from "@/lib/templates/round-of-16-draft";
import { PUBLIC_POOL_SLUGS } from "@/lib/world-cup-pool/data";

export type RoundOf16PublicEntry = {
  entryId: string;
  entryName: string;
  submittedAt: string;
  status: string;
  picks: RoundOf16PickPayload;
};

export type RoundOf16PublicPool = {
  poolId: string;
  poolSlug: string;
  poolName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  settings: RoundOf16PoolSettings;
  entries: RoundOf16PublicEntry[];
  latestStandings: RoundOf16StoredLeaderboardRow[];
};

export async function getPublicRoundOf16Pool(poolSlug: string) {
  if ((PUBLIC_POOL_SLUGS as readonly string[]).includes(poolSlug)) return null;
  if (!isSupabaseConfigured()) return null;

  const admin = createSupabaseAdminClient();
  const { data: pool, error: poolError } = await admin
    .from("pools")
    .select("id,slug,name,status,settings,created_at,updated_at")
    .eq("slug", poolSlug)
    .maybeSingle();

  if (poolError) throw new Error(poolError.message);
  if (!pool) return null;

  const settings = (pool.settings as { roundOf16?: RoundOf16PoolSettings })
    .roundOf16;
  if (!settings) return null;

  const { data: entries, error: entriesError } = await admin
    .from("entries")
    .select(
      "id,display_name,entry_picks(id,status,submitted_at,entry_pick_items(id,value))",
    )
    .eq("pool_id", pool.id)
    .order("created_at", { ascending: true });

  if (entriesError) throw new Error(entriesError.message);

  const publicEntries = (entries ?? []).flatMap((entry) => {
    const entryPick = Array.isArray(entry.entry_picks)
      ? entry.entry_picks[0]
      : entry.entry_picks;

    if (
      entryPick?.status !== "submitted" &&
      entryPick?.status !== "locked"
    ) {
      return [];
    }

    const items = Array.isArray(entryPick.entry_pick_items)
      ? entryPick.entry_pick_items
      : [];
    const { payload } = pickPayloadAndItemIdsFromItems({ settings, items });

    return [
      {
        entryId: String(entry.id),
        entryName: String(entry.display_name),
        submittedAt: String(entryPick.submitted_at ?? ""),
        status: String(entryPick.status ?? "submitted"),
        picks: payload,
      } satisfies RoundOf16PublicEntry,
    ];
  });

  return {
    poolId: String(pool.id),
    poolSlug: String(pool.slug),
    poolName: String(pool.name),
    status: String(pool.status ?? "open"),
    createdAt: String(pool.created_at ?? ""),
    updatedAt: String(pool.updated_at ?? ""),
    settings,
    entries: publicEntries,
    latestStandings: await getLatestRoundOf16Standings(String(pool.id)),
  } satisfies RoundOf16PublicPool;
}

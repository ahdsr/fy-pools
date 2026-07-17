import "server-only";

import { getLatestRoundOf16StandingsSnapshot } from "@/lib/round-of-16/persistence";
import {
  pickPayloadAndItemIdsFromItems,
  type RoundOf16StoredLeaderboardRow,
} from "@/lib/round-of-16/persistence";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  createSupabaseAdminClient,
  getSupabaseUser,
} from "@/lib/supabase/server";
import { pickDeadlineHasPassed } from "@/lib/round-of-16/deadlines";
import type {
  RoundOf16PickPayload,
  RoundOf16PoolSettings,
} from "@/lib/templates/round-of-16-draft";
import { PUBLIC_POOL_SLUGS } from "@/lib/world-cup-pool/data";
import { isArchivedPool } from "@/lib/pool-lifecycle";

export type RoundOf16PublicEntry = {
  entryId: string;
  entryName: string;
  submittedAt: string;
  status: string;
  picks?: RoundOf16PickPayload;
  picksVisible: boolean;
};

export type RoundOf16ViewerEntry = RoundOf16PublicEntry & {
  picks: RoundOf16PickPayload;
  editHref: string;
  canEdit: boolean;
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
  latestStandingsCalculatedAt: string;
  picksArePublic: boolean;
  viewerEntry?: RoundOf16ViewerEntry;
};

type GetPublicRoundOf16PoolOptions = {
  includeViewer?: boolean;
};

type PublicEntryPickRecord = {
  status?: unknown;
  submitted_at?: unknown;
  entry_pick_items?: unknown;
};

function entryMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function getPublicRoundOf16Pool(
  poolSlug: string,
  { includeViewer = true }: GetPublicRoundOf16PoolOptions = {},
) {
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
  if (isArchivedPool(pool.status)) return null;

  const settings = (pool.settings as { roundOf16?: RoundOf16PoolSettings })
    .roundOf16;
  if (!settings) return null;
  const status = String(pool.status ?? "open");
  const picksArePublic =
    pickDeadlineHasPassed(settings) ||
    ["locked", "completed", "archived"].includes(status);
  const shouldLoadPickItems = picksArePublic || includeViewer;
  const entrySelect = shouldLoadPickItems
    ? "id,user_id,display_name,metadata,entry_picks(id,status,submitted_at,entry_pick_items(id,value))"
    : "id,user_id,display_name,metadata,entry_picks(id,status,submitted_at)";

  const { data: entries, error: entriesError } = await admin
    .from("entries")
    .select(entrySelect)
    .eq("pool_id", pool.id)
    .order("created_at", { ascending: true });

  if (entriesError) throw new Error(entriesError.message);

  const user = includeViewer ? await getSupabaseUser() : null;
  const viewerEntryRecord = user
    ? (entries ?? []).find((entry) => String(entry.user_id ?? "") === user.id)
    : undefined;
  const { data: shareInvite } =
    viewerEntryRecord && user
      ? await admin
          .from("pool_invites")
          .select("code")
          .eq("pool_id", pool.id)
          .is("email", null)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle()
      : { data: null };

  let viewerEntry: RoundOf16ViewerEntry | undefined;
  const publicEntries = (entries ?? []).flatMap((entry) => {
    const entryPick = (Array.isArray(entry.entry_picks)
      ? entry.entry_picks[0]
      : entry.entry_picks) as PublicEntryPickRecord | undefined;

    if (
      entryPick?.status !== "submitted" &&
      entryPick?.status !== "locked"
    ) {
      return [];
    }

    const items = Array.isArray(entryPick.entry_pick_items)
      ? entryPick.entry_pick_items
      : [];
    const isViewerEntry = String(entry.id) === String(viewerEntryRecord?.id ?? "");
    const entryCanRevealPicks = picksArePublic || isViewerEntry;
    const { payload } = entryCanRevealPicks
      ? pickPayloadAndItemIdsFromItems({ settings, items })
      : { payload: undefined };
    const publicEntry = {
      entryId: String(entry.id),
      entryName: String(entry.display_name),
      submittedAt: String(entryPick.submitted_at ?? ""),
      status: String(entryPick.status ?? "submitted"),
      picks: payload,
      picksVisible: entryCanRevealPicks,
    } satisfies RoundOf16PublicEntry;

    if (isViewerEntry) {
      const viewerMetadata = entryMetadata(entry.metadata);
      const editInviteCode =
        String(viewerMetadata.inviteCode ?? "") || String(shareInvite?.code ?? "");

      if (editInviteCode) {
        viewerEntry = {
          ...publicEntry,
          picks: payload ?? { winners: {}, bonusAnswers: {} },
          editHref: `/join/${editInviteCode}`,
          canEdit: !pickDeadlineHasPassed(settings),
        };
      }
    }

    return [publicEntry];
  });

  const latestStandingsSnapshot = picksArePublic
    ? await getLatestRoundOf16StandingsSnapshot(String(pool.id))
    : { rows: [], calculatedAt: "" };

  return {
    poolId: String(pool.id),
    poolSlug: String(pool.slug),
    poolName: String(pool.name),
    status,
    createdAt: String(pool.created_at ?? ""),
    updatedAt: String(pool.updated_at ?? ""),
    settings,
    entries: publicEntries,
    latestStandings: latestStandingsSnapshot.rows,
    latestStandingsCalculatedAt: latestStandingsSnapshot.calculatedAt,
    picksArePublic,
    viewerEntry,
  } satisfies RoundOf16PublicPool;
}

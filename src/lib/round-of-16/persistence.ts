import "server-only";

import {
  ROUND_OF_16_TEMPLATE_SLUG,
  getEnabledRoundOf16BonusProps,
  slugifyPoolName,
  validateRoundOf16InviteInputs,
  validateRoundOf16PoolSettings,
  type RoundOf16InviteInput,
  type RoundOf16PickPayload,
  type RoundOf16PoolSettings,
} from "@/lib/templates/round-of-16-draft";
import {
  scoreRoundOf16Entry,
  type RoundOf16ResultPayload,
  type RoundOf16ScoreLine,
} from "@/lib/round-of-16/scoring";
import {
  createSupabaseAdminClient,
  getSupabaseUser,
} from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdminClient>;

export type PublishedRoundOf16Pool = {
  poolId: string;
  poolSlug: string;
  poolName: string;
  inviteLinks: {
    email: string;
    displayName: string;
    code: string;
    href: string;
    status: string;
    expiresAt: string;
  }[];
};

export type JoinPoolData = {
  invite: {
    id: string;
    code: string;
    email: string;
    displayName: string;
    status: string;
    expiresAt: string;
    acceptedBy: string;
    acceptedAt: string;
  };
  pool: {
    id: string;
    slug: string;
    name: string;
    ownerId: string;
    templateVersionId: string;
    settings: RoundOf16PoolSettings;
  };
  existingSubmission?: {
    entryId: string;
    entryPickId: string;
    status: string;
    submittedAt: string;
    payload: RoundOf16PickPayload;
  };
  deadlineHasPassed: boolean;
};

export type CommissionerNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  poolName: string;
};

export type RoundOf16StoredLeaderboardRow = {
  entryId: string;
  entryName: string;
  rank: number;
  total: number;
  maxPoints: number;
  submittedAt: string;
  lines: RoundOf16ScoreLine[];
};

export type RoundOf16ScoringPoolData = {
  poolId: string;
  poolName: string;
  poolSlug: string;
  settings: RoundOf16PoolSettings;
  submittedEntries: number;
  latestStandings: RoundOf16StoredLeaderboardRow[];
};

export type CommissionerPoolSummary = {
  poolId: string;
  poolName: string;
  poolSlug: string;
  status: string;
  templateName: string;
  createdAt: string;
  updatedAt: string;
  pickDeadline: string;
  deadlineStatus: "No deadline" | "Upcoming" | "Locked";
  inviteCounts: {
    total: number;
    pending: number;
    accepted: number;
    revoked: number;
    expired: number;
  };
  entryCounts: {
    total: number;
    submitted: number;
    locked: number;
    missing: number;
  };
  latestStandingsAt: string;
};

function assertSupabaseConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
}

export async function requireSupabaseUser() {
  assertSupabaseConfigured();
  const user = await getSupabaseUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  return user;
}

export async function ensureProfile({
  userId,
  displayName,
}: {
  userId: string;
  displayName: string;
}) {
  const admin = createSupabaseAdminClient();

  const { error } = await admin.from("profiles").upsert({
    id: userId,
    display_name: displayName,
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);
}

async function ensureRoundOf16TemplateVersion(admin: SupabaseAdmin) {
  const { data, error } = await admin
    .from("template_versions")
    .upsert(
      {
        slug: ROUND_OF_16_TEMPLATE_SLUG,
        name: "Mini Round of 16 Pool",
        version: 1,
        description: "Round of 16 winner picks with configurable bonus props.",
        config: {
          wizardType: "round-of-16",
        },
      },
      { onConflict: "slug,version" },
    )
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  return data.id as string;
}

async function ensureRoundOf16PickFields({
  admin,
  templateVersionId,
  settings,
}: {
  admin: SupabaseAdmin;
  templateVersionId: string;
  settings: RoundOf16PoolSettings;
}) {
  const winnerFields = settings.matchups.map((matchup, index) => ({
    template_version_id: templateVersionId,
    key: `r16_${index + 1}_winner`,
    label: `${matchup.label || `Round of 16 Match ${index + 1}`} winner`,
    pick_type: "bracket_winner",
    required: true,
    sort_order: index + 1,
    config: {
      matchupId: matchup.id,
      teams: [matchup.teamOne, matchup.teamTwo],
    },
  }));
  const bonusFields = getEnabledRoundOf16BonusProps(settings).map(
    (prop, index) => ({
      template_version_id: templateVersionId,
      key: `bonus_${prop.id}`,
      label: prop.label,
      pick_type: prop.id === "penalty-decisions" ? "numeric_bonus" : "text_bonus",
      required: true,
      sort_order: 100 + index,
      config: {
        propId: prop.id,
        points: prop.points,
      },
    }),
  );

  const { data, error } = await admin
    .from("template_pick_fields")
    .upsert([...winnerFields, ...bonusFields], {
      onConflict: "template_version_id,key",
    })
    .select("id,key,config");

  if (error) throw new Error(error.message);

  return new Map(
    (data ?? []).map((field) => [
      String(field.key),
      {
        id: String(field.id),
        config: field.config as { matchupId?: string; propId?: string },
      },
    ]),
  );
}

function buildPoolSlug(poolName: string) {
  return `${slugifyPoolName(poolName)}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildInviteCode() {
  return `r16-${crypto.randomUUID()}`;
}

function pickDeadlineHasPassed(settings: RoundOf16PoolSettings) {
  const deadline = settings.basics.picksLockAt;
  if (!deadline) return false;

  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) return false;

  return Date.now() >= parsed.getTime();
}

function getInviteExpiresAt(settings: RoundOf16PoolSettings) {
  const deadline = settings.basics.picksLockAt;
  if (!deadline) return null;

  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString();
}

function effectiveInviteStatus({
  status,
  expiresAt,
}: {
  status: string;
  expiresAt?: string | null;
}) {
  if (status === "revoked" || status === "accepted") return status;
  if (status === "expired") return "expired";
  if (expiresAt) {
    const parsed = new Date(expiresAt);
    if (!Number.isNaN(parsed.getTime()) && parsed.getTime() <= Date.now()) {
      return "expired";
    }
  }

  return "pending";
}

function normalizeRoundOf16Participants(participants: RoundOf16InviteInput[]) {
  if (!Array.isArray(participants)) return [];

  return participants
    .map((participant) => {
      const rawEmail =
        typeof participant?.email === "string" ? participant.email : "";
      const rawDisplayName =
        typeof participant?.displayName === "string"
          ? participant.displayName
          : "";
      const email = rawEmail.trim().toLowerCase();
      const displayName =
        rawDisplayName.trim() || email.split("@")[0] || "Participant";

      return {
        email,
        displayName,
      };
    })
    .filter((participant) => participant.email);
}

function emptyRoundOf16PickPayload(): RoundOf16PickPayload {
  return {
    winners: {},
    bonusAnswers: {},
  };
}

function pickPayloadFromItems(
  items: { value?: unknown }[] | null | undefined,
): RoundOf16PickPayload {
  const payload = emptyRoundOf16PickPayload();

  for (const item of items ?? []) {
    const value =
      item.value && typeof item.value === "object"
        ? (item.value as Record<string, unknown>)
        : {};
    const matchupId = typeof value.matchupId === "string" ? value.matchupId : "";
    const winner = typeof value.winner === "string" ? value.winner : "";
    const propId = typeof value.propId === "string" ? value.propId : "";
    const answer =
      typeof value.answer === "string" || typeof value.answer === "number"
        ? String(value.answer)
        : "";

    if (matchupId && winner) {
      payload.winners[matchupId] = winner;
    }

    if (propId && answer) {
      payload.bonusAnswers[propId] = answer;
    }
  }

  return payload;
}

export function pickPayloadAndItemIdsFromItems({
  settings,
  items,
}: {
  settings: RoundOf16PoolSettings;
  items: { id?: unknown; value?: unknown }[] | null | undefined;
}) {
  const payload = emptyRoundOf16PickPayload();
  const itemIds = new Map<string, string>();

  for (const item of items ?? []) {
    const value =
      item.value && typeof item.value === "object"
        ? (item.value as Record<string, unknown>)
        : {};
    const itemId = typeof item.id === "string" ? item.id : "";
    const matchupId = typeof value.matchupId === "string" ? value.matchupId : "";
    const winner = typeof value.winner === "string" ? value.winner : "";
    const propId = typeof value.propId === "string" ? value.propId : "";
    const answer =
      typeof value.answer === "string" || typeof value.answer === "number"
        ? String(value.answer)
        : "";

    if (matchupId && winner) {
      const matchupIndex = settings.matchups.findIndex(
        (matchup) => matchup.id === matchupId,
      );
      const key = `r16_${matchupIndex + 1}_winner`;
      payload.winners[matchupId] = winner;
      if (itemId && matchupIndex >= 0) itemIds.set(key, itemId);
    }

    if (propId && answer) {
      const key = `bonus_${propId}`;
      payload.bonusAnswers[propId] = answer;
      if (itemId) itemIds.set(key, itemId);
    }
  }

  return { payload, itemIds };
}

export async function publishRoundOf16Pool({
  settings,
  participants,
}: {
  settings: RoundOf16PoolSettings;
  participants: RoundOf16InviteInput[];
}): Promise<PublishedRoundOf16Pool> {
  const user = await requireSupabaseUser();
  const admin = createSupabaseAdminClient();
  const displayName =
    user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? "Commissioner";
  const settingsError = validateRoundOf16PoolSettings(settings);
  if (settingsError) throw new Error(settingsError);

  const participantsError = validateRoundOf16InviteInputs(participants);
  if (participantsError) throw new Error(participantsError);

  const validParticipants = normalizeRoundOf16Participants(participants);

  await ensureProfile({ userId: user.id, displayName });
  const templateVersionId = await ensureRoundOf16TemplateVersion(admin);
  await ensureRoundOf16PickFields({ admin, templateVersionId, settings });

  const poolSlug = buildPoolSlug(settings.basics.poolName);
  const { data: pool, error: poolError } = await admin
    .from("pools")
    .insert({
      owner_id: user.id,
      template_version_id: templateVersionId,
      slug: poolSlug,
      name: settings.basics.poolName,
      status: "open",
      settings: {
        roundOf16: settings,
      },
    })
    .select("id,slug,name")
    .single();

  if (poolError) throw new Error(poolError.message);

  const { error: memberError } = await admin.from("pool_members").upsert(
    {
      pool_id: pool.id,
      user_id: user.id,
      role: "commissioner",
    },
    { onConflict: "pool_id,user_id" },
  );

  if (memberError) throw new Error(memberError.message);

  const inviteRows = validParticipants.map((participant) => ({
    pool_id: pool.id,
    email: participant.email,
    display_name: participant.displayName,
    code: buildInviteCode(),
    status: "pending",
    expires_at: getInviteExpiresAt(settings),
  }));
  const { data: invites, error: invitesError } = await admin
    .from("pool_invites")
    .insert(inviteRows)
    .select("email,display_name,code,status,expires_at");

  if (invitesError) throw new Error(invitesError.message);

  return {
    poolId: pool.id,
    poolSlug: pool.slug,
    poolName: pool.name,
    inviteLinks: (invites ?? []).map((invite) => ({
      email: String(invite.email ?? ""),
      displayName: String(invite.display_name ?? ""),
      code: String(invite.code),
      href: `/join/${invite.code}`,
      status: String(invite.status ?? "pending"),
      expiresAt: String(invite.expires_at ?? ""),
    })),
  };
}

export async function getJoinPoolData(inviteCode: string) {
  assertSupabaseConfigured();
  const admin = createSupabaseAdminClient();
  const { data: invite, error } = await admin
    .from("pool_invites")
    .select(
      "id,code,email,display_name,status,expires_at,accepted_by,accepted_at,pools(id,slug,name,owner_id,template_version_id,settings)",
    )
    .eq("code", inviteCode)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!invite?.pools) return null;

  const poolRecord = Array.isArray(invite.pools) ? invite.pools[0] : invite.pools;
  const settings = (poolRecord.settings as { roundOf16?: RoundOf16PoolSettings })
    .roundOf16;

  if (!settings) return null;

  const user = isSupabaseConfigured() ? await getSupabaseUser() : null;
  let existingSubmission: JoinPoolData["existingSubmission"];
  const deadlineHasPassed = pickDeadlineHasPassed(settings);

  if (user) {
    const { data: entry } = await admin
      .from("entries")
      .select(
        "id,entry_picks(id,status,submitted_at,entry_pick_items(value))",
      )
      .eq("pool_id", poolRecord.id)
      .eq("user_id", user.id)
      .maybeSingle();
    const entryPick = Array.isArray(entry?.entry_picks)
      ? entry.entry_picks[0]
      : entry?.entry_picks;

    if (entryPick?.status === "submitted" || entryPick?.status === "locked") {
      const items = Array.isArray(entryPick.entry_pick_items)
        ? entryPick.entry_pick_items
        : [];

      existingSubmission = {
        entryId: String(entry?.id),
        entryPickId: String(entryPick.id),
        status: String(entryPick.status),
        submittedAt: String(entryPick.submitted_at ?? ""),
        payload: pickPayloadFromItems(items),
      };
    }
  }

  return {
    invite: {
      id: String(invite.id),
      code: String(invite.code),
      email: String(invite.email ?? ""),
      displayName: String(invite.display_name ?? ""),
      status: effectiveInviteStatus({
        status: String(invite.status),
        expiresAt: String(invite.expires_at ?? ""),
      }),
      expiresAt: String(invite.expires_at ?? ""),
      acceptedBy: String(invite.accepted_by ?? ""),
      acceptedAt: String(invite.accepted_at ?? ""),
    },
    pool: {
      id: String(poolRecord.id),
      slug: String(poolRecord.slug),
      name: String(poolRecord.name),
      ownerId: String(poolRecord.owner_id),
      templateVersionId: String(poolRecord.template_version_id),
      settings,
    },
    existingSubmission,
    deadlineHasPassed,
  } satisfies JoinPoolData;
}

export async function submitRoundOf16Picks({
  inviteCode,
  payload,
}: {
  inviteCode: string;
  payload: RoundOf16PickPayload;
}) {
  const user = await requireSupabaseUser();
  const admin = createSupabaseAdminClient();
  const joinData = await getJoinPoolData(inviteCode);

  if (!joinData) throw new Error("Invite not found.");
  if (joinData.invite.status === "revoked" || joinData.invite.status === "expired") {
    throw new Error("This invite is no longer available.");
  }
  if (
    joinData.invite.status === "accepted" &&
    joinData.invite.acceptedBy &&
    joinData.invite.acceptedBy !== user.id
  ) {
    throw new Error("This invite has already been accepted.");
  }

  const settings = joinData.pool.settings;
  if (pickDeadlineHasPassed(settings)) {
    throw new Error("The pick deadline has passed.");
  }

  const missingWinner = settings.matchups.find(
    (matchup) => !payload.winners[matchup.id],
  );
  const missingBonus = getEnabledRoundOf16BonusProps(settings).find(
    (prop) => !String(payload.bonusAnswers[prop.id] ?? "").trim(),
  );

  if (missingWinner || missingBonus) {
    throw new Error("Complete every required winner and bonus pick.");
  }

  const displayName =
    user.user_metadata?.display_name ??
    joinData.invite.displayName ??
    user.email?.split("@")[0] ??
    "Participant";
  await ensureProfile({ userId: user.id, displayName });

  await admin.from("pool_members").upsert(
    {
      pool_id: joinData.pool.id,
      user_id: user.id,
      role: "player",
    },
    { onConflict: "pool_id,user_id" },
  );

  await admin
    .from("pool_invites")
    .update({
      status: "accepted",
      accepted_by: user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", joinData.invite.id);

  const { data: entry, error: entryError } = await admin
    .from("entries")
    .upsert(
      {
        pool_id: joinData.pool.id,
        user_id: user.id,
        display_name: displayName,
        entry_number: 1,
        metadata: {
          inviteCode,
          inviteEmail: joinData.invite.email,
        },
      },
      { onConflict: "pool_id,user_id,entry_number" },
    )
    .select("id")
    .single();

  if (entryError) throw new Error(entryError.message);

  const { data: existingPick } = await admin
    .from("entry_picks")
    .select("id,status")
    .eq("entry_id", entry.id)
    .eq("template_version_id", joinData.pool.templateVersionId)
    .maybeSingle();

  if (existingPick?.status === "locked") {
    throw new Error("Your picks are locked.");
  }

  const submittedAt = new Date().toISOString();
  const { data: entryPick, error: entryPickError } = await admin
    .from("entry_picks")
    .upsert(
      {
        entry_id: entry.id,
        template_version_id: joinData.pool.templateVersionId,
        status: "submitted",
        submitted_at: submittedAt,
        updated_at: submittedAt,
      },
      { onConflict: "entry_id,template_version_id" },
    )
    .select("id")
    .single();

  if (entryPickError) throw new Error(entryPickError.message);

  const fieldMap = await ensureRoundOf16PickFields({
    admin,
    templateVersionId: joinData.pool.templateVersionId,
    settings,
  });
  const winnerItems = settings.matchups.map((matchup, index) => ({
    entry_pick_id: entryPick.id,
    template_pick_field_id: fieldMap.get(`r16_${index + 1}_winner`)?.id,
    pick_type: "bracket_winner",
    value: {
      matchupId: matchup.id,
      winner: payload.winners[matchup.id],
    },
    submitted_at: submittedAt,
  }));
  const bonusItems = getEnabledRoundOf16BonusProps(settings).map((prop) => ({
    entry_pick_id: entryPick.id,
    template_pick_field_id: fieldMap.get(`bonus_${prop.id}`)?.id,
    pick_type: prop.id === "penalty-decisions" ? "numeric_bonus" : "text_bonus",
    value: {
      propId: prop.id,
      answer: payload.bonusAnswers[prop.id],
    },
    submitted_at: submittedAt,
  }));
  const pickItems = [...winnerItems, ...bonusItems].filter(
    (item) => item.template_pick_field_id,
  );
  const { error: itemsError } = await admin
    .from("entry_pick_items")
    .upsert(pickItems, {
      onConflict: "entry_pick_id,template_pick_field_id",
    });

  if (itemsError) throw new Error(itemsError.message);

  await admin.from("commissioner_notifications").insert({
    pool_id: joinData.pool.id,
    recipient_id: joinData.pool.ownerId,
    actor_id: user.id,
    event_type: "entry_submitted",
    title: "Entry submitted",
    body: `${displayName} submitted picks for ${joinData.pool.name}.`,
    metadata: {
      entryId: entry.id,
      entryPickId: entryPick.id,
      inviteCode,
    },
  });

  return {
    entryId: String(entry.id),
    entryPickId: String(entryPick.id),
    submittedAt,
  };
}

export async function getCommissionerNotifications() {
  if (!isSupabaseConfigured()) return [];

  const user = await getSupabaseUser();
  if (!user) return [];

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("commissioner_notifications")
    .select("id,title,body,created_at,pools(name)")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) return [];

  return (data ?? []).map((item) => {
    const pool = Array.isArray(item.pools) ? item.pools[0] : item.pools;

    return {
      id: String(item.id),
      title: String(item.title),
      body: String(item.body),
      createdAt: String(item.created_at),
      poolName: String(pool?.name ?? "Pool"),
    } satisfies CommissionerNotification;
  });
}

function getRoundOf16DeadlineStatus(settings?: RoundOf16PoolSettings) {
  const deadline = settings?.basics.picksLockAt;
  if (!deadline) {
    return {
      pickDeadline: "",
      deadlineStatus: "No deadline" as const,
    };
  }

  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) {
    return {
      pickDeadline: deadline,
      deadlineStatus: "No deadline" as const,
    };
  }

  return {
    pickDeadline: parsed.toISOString(),
    deadlineStatus:
      parsed.getTime() <= Date.now()
        ? ("Locked" as const)
        : ("Upcoming" as const),
  };
}

export async function getCommissionerPoolSummaries() {
  if (!isSupabaseConfigured()) return [];

  const user = await getSupabaseUser();
  if (!user) return [];

  const admin = createSupabaseAdminClient();
  const { data: pools, error } = await admin
    .from("pools")
    .select(
      "id,name,slug,status,settings,created_at,updated_at,template_versions(name),pool_invites(id,status,expires_at),entries(id,entry_picks(status,submitted_at))",
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const poolIds = (pools ?? []).map((pool) => String(pool.id));
  const latestSnapshotByPool = new Map<string, string>();

  if (poolIds.length > 0) {
    const { data: snapshots, error: snapshotsError } = await admin
      .from("standings_snapshots")
      .select("pool_id,calculated_at")
      .in("pool_id", poolIds)
      .order("calculated_at", { ascending: false });

    if (snapshotsError) throw new Error(snapshotsError.message);

    for (const snapshot of snapshots ?? []) {
      const snapshotPoolId = String(snapshot.pool_id);
      if (!latestSnapshotByPool.has(snapshotPoolId)) {
        latestSnapshotByPool.set(
          snapshotPoolId,
          String(snapshot.calculated_at ?? ""),
        );
      }
    }
  }

  return (pools ?? []).map((pool) => {
    const settings = (pool.settings as { roundOf16?: RoundOf16PoolSettings })
      .roundOf16;
    const deadline = getRoundOf16DeadlineStatus(settings);
    const invites = Array.isArray(pool.pool_invites) ? pool.pool_invites : [];
    const entries = Array.isArray(pool.entries) ? pool.entries : [];
    const inviteCounts = invites.reduce(
      (counts, invite) => {
        const status = effectiveInviteStatus({
          status: String(invite.status ?? "pending"),
          expiresAt: invite.expires_at ? String(invite.expires_at) : null,
        });
        counts[status] += 1;
        counts.total += 1;

        return counts;
      },
      {
        total: 0,
        pending: 0,
        accepted: 0,
        revoked: 0,
        expired: 0,
      },
    );
    const entryCounts = entries.reduce(
      (counts, entry) => {
        const entryPick = Array.isArray(entry.entry_picks)
          ? entry.entry_picks[0]
          : entry.entry_picks;
        const status = String(entryPick?.status ?? "draft");

        counts.total += 1;
        if (status === "submitted") counts.submitted += 1;
        if (status === "locked") counts.locked += 1;

        return counts;
      },
      {
        total: 0,
        submitted: 0,
        locked: 0,
        missing: 0,
      },
    );
    const templateVersion = Array.isArray(pool.template_versions)
      ? pool.template_versions[0]
      : pool.template_versions;

    return {
      poolId: String(pool.id),
      poolName: String(pool.name),
      poolSlug: String(pool.slug),
      status: String(pool.status ?? "draft"),
      templateName: String(templateVersion?.name ?? "Round of 16 Pool"),
      createdAt: String(pool.created_at ?? ""),
      updatedAt: String(pool.updated_at ?? ""),
      pickDeadline: deadline.pickDeadline,
      deadlineStatus: deadline.deadlineStatus,
      inviteCounts,
      entryCounts: {
        ...entryCounts,
        missing: Math.max(0, inviteCounts.total - entryCounts.total),
      },
      latestStandingsAt: latestSnapshotByPool.get(String(pool.id)) ?? "",
    } satisfies CommissionerPoolSummary;
  });
}

function rankRoundOf16Rows(rows: Omit<RoundOf16StoredLeaderboardRow, "rank">[]) {
  let lastTotal: number | null = null;
  let lastRank = 0;

  return rows
    .slice()
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.entryName.localeCompare(b.entryName);
    })
    .map((row, index) => {
      const rank = row.total === lastTotal ? lastRank : index + 1;
      lastTotal = row.total;
      lastRank = rank;

      return {
        ...row,
        rank,
      } satisfies RoundOf16StoredLeaderboardRow;
    });
}

export async function refreshRoundOf16Scoring({
  poolId,
  results,
}: {
  poolId: string;
  results: RoundOf16ResultPayload;
}) {
  const user = await requireSupabaseUser();
  const admin = createSupabaseAdminClient();
  const { data: pool, error: poolError } = await admin
    .from("pools")
    .select("id,name,owner_id,settings")
    .eq("id", poolId)
    .single();

  if (poolError) throw new Error(poolError.message);
  if (String(pool.owner_id) !== user.id) {
    throw new Error("Only the pool commissioner can refresh scoring.");
  }

  const settings = (pool.settings as { roundOf16?: RoundOf16PoolSettings })
    .roundOf16;
  if (!settings) throw new Error("Round of 16 settings were not found.");

  const { data: entries, error: entriesError } = await admin
    .from("entries")
    .select(
      "id,display_name,entry_picks(id,status,submitted_at,entry_pick_items(id,value))",
    )
    .eq("pool_id", poolId);

  if (entriesError) throw new Error(entriesError.message);

  const scoredRows = (entries ?? []).flatMap((entry) => {
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
    const { payload, itemIds } = pickPayloadAndItemIdsFromItems({
      settings,
      items,
    });
    const score = scoreRoundOf16Entry({ settings, picks: payload, results });

    return [
      {
        entryId: String(entry.id),
        entryName: String(entry.display_name),
        total: score.total,
        maxPoints: score.maxPoints,
        submittedAt: String(entryPick.submitted_at ?? ""),
        lines: score.lines,
        breakdownRows: score.lines.map((line) => ({
          entry_id: entry.id,
          entry_pick_item_id: itemIds.get(line.key) ?? null,
          points_awarded: line.pointsAwarded,
          max_points: line.maxPoints,
          reason: `${line.label}: ${line.reason}`,
        })),
      },
    ];
  });

  const entryIds = scoredRows.map((row) => row.entryId);
  if (entryIds.length > 0) {
    const { error: deleteError } = await admin
      .from("score_breakdowns")
      .delete()
      .in("entry_id", entryIds);

    if (deleteError) throw new Error(deleteError.message);

    const breakdownRows = scoredRows.flatMap((row) => row.breakdownRows);
    if (breakdownRows.length > 0) {
      const { error: insertError } = await admin
        .from("score_breakdowns")
        .insert(breakdownRows);

      if (insertError) throw new Error(insertError.message);
    }
  }

  const rowsWithoutBreakdowns = scoredRows.map((row) => ({
    entryId: row.entryId,
    entryName: row.entryName,
    total: row.total,
    maxPoints: row.maxPoints,
    submittedAt: row.submittedAt,
    lines: row.lines,
  }));
  const rankedRows = rankRoundOf16Rows(rowsWithoutBreakdowns);

  const { error: snapshotError } = await admin
    .from("standings_snapshots")
    .insert({
      pool_id: poolId,
      rows: rankedRows,
    });

  if (snapshotError) throw new Error(snapshotError.message);

  return rankedRows;
}

export async function getLatestRoundOf16Standings(poolId: string) {
  if (!isSupabaseConfigured()) return [];

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("standings_snapshots")
    .select("rows")
    .eq("pool_id", poolId)
    .order("calculated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !Array.isArray(data?.rows)) return [];

  return data.rows as RoundOf16StoredLeaderboardRow[];
}

export async function getCommissionerRoundOf16ScoringPool(poolId: string) {
  const user = await requireSupabaseUser();
  const admin = createSupabaseAdminClient();
  const { data: pool, error: poolError } = await admin
    .from("pools")
    .select("id,name,slug,owner_id,settings")
    .eq("id", poolId)
    .maybeSingle();

  if (poolError) throw new Error(poolError.message);
  if (!pool) return null;
  if (String(pool.owner_id) !== user.id) {
    throw new Error("Only the pool commissioner can view scoring.");
  }

  const settings = (pool.settings as { roundOf16?: RoundOf16PoolSettings })
    .roundOf16;
  if (!settings) return null;

  const { data: entries, error: entriesError } = await admin
    .from("entries")
    .select("entry_picks(status)")
    .eq("pool_id", poolId);

  if (entriesError) throw new Error(entriesError.message);

  const submittedEntries = (entries ?? []).filter((entry) => {
    const entryPick = Array.isArray(entry.entry_picks)
      ? entry.entry_picks[0]
      : entry.entry_picks;

    return entryPick?.status === "submitted" || entryPick?.status === "locked";
  }).length;

  return {
    poolId: String(pool.id),
    poolName: String(pool.name),
    poolSlug: String(pool.slug),
    settings,
    submittedEntries,
    latestStandings: await getLatestRoundOf16Standings(poolId),
  } satisfies RoundOf16ScoringPoolData;
}

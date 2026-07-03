import "server-only";

import {
  ROUND_OF_16_TEMPLATE_SLUG,
  getEnabledRoundOf16BonusProps,
  slugifyPoolName,
  type RoundOf16InviteInput,
  type RoundOf16PickPayload,
  type RoundOf16PoolSettings,
} from "@/lib/templates/round-of-16-draft";
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
  }[];
};

export type JoinPoolData = {
  invite: {
    id: string;
    code: string;
    email: string;
    displayName: string;
    status: string;
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
    submittedAt: string;
  };
};

export type CommissionerNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  poolName: string;
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
  const validParticipants = participants
    .map((participant) => ({
      email: participant.email.trim().toLowerCase(),
      displayName: participant.displayName.trim(),
    }))
    .filter((participant) => participant.email);

  if (validParticipants.length === 0) {
    throw new Error("Add at least one participant email before publishing.");
  }

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

  const inviteRows = validParticipants.map((participant) => ({
    pool_id: pool.id,
    email: participant.email,
    display_name: participant.displayName,
    code: buildInviteCode(),
    status: "pending",
  }));
  const { data: invites, error: invitesError } = await admin
    .from("pool_invites")
    .insert(inviteRows)
    .select("email,display_name,code");

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
    })),
  };
}

export async function getJoinPoolData(inviteCode: string) {
  assertSupabaseConfigured();
  const admin = createSupabaseAdminClient();
  const { data: invite, error } = await admin
    .from("pool_invites")
    .select(
      "id,code,email,display_name,status,accepted_by,pools(id,slug,name,owner_id,template_version_id,settings)",
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

  if (user) {
    const { data: entry } = await admin
      .from("entries")
      .select("id,entry_picks(id,status,submitted_at)")
      .eq("pool_id", poolRecord.id)
      .eq("user_id", user.id)
      .maybeSingle();
    const entryPick = Array.isArray(entry?.entry_picks)
      ? entry.entry_picks[0]
      : entry?.entry_picks;

    if (entryPick?.status === "locked") {
      existingSubmission = {
        entryId: String(entry?.id),
        submittedAt: String(entryPick.submitted_at ?? ""),
      };
    }
  }

  return {
    invite: {
      id: String(invite.id),
      code: String(invite.code),
      email: String(invite.email ?? ""),
      displayName: String(invite.display_name ?? ""),
      status: String(invite.status),
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

import "server-only";

import { revalidatePath } from "next/cache";

import {
  DOUBLE_DOWN_CHIP_COUNT,
  marketStatusAt,
  selectDoubleDownCandidate,
  settleDoubleDownCalls,
  type DoubleDownAccount,
  type DoubleDownCall,
  type DoubleDownMarket,
  type DoubleDownMatchImpact,
  type DoubleDownParticipant,
} from "@/lib/double-down/engine";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseAdminClient, getSupabaseUser } from "@/lib/supabase/server";
import { normalizeName } from "@/lib/world-cup-pool/scoring";
import { buildFutureLeverageReport } from "@/lib/world-cup-pool/future-leverage";
import { buildLeaderboardRows, buildPoolAnalytics } from "@/lib/world-cup-pool/leaderboard";
import type { MatchResult } from "@/lib/world-cup-pool/types";
import type { EntriesConfig, EntryPicks, PoolResults } from "@/lib/world-cup-pool/types";

type Admin = ReturnType<typeof createSupabaseAdminClient>;
type RawMarket = {
  id: string; pool_id: string; match_id: string; match_snapshot: Record<string, unknown>;
  status: DoubleDownMarket["status"]; available_outcomes: string[]; opens_at: string; locks_at: string;
  impact_summary: string; representative_entries: Record<string, string>; settlement_outcome: string | null;
};

export type DoubleDownPublicSnapshot = {
  poolSlug: string;
  market: DoubleDownMarket;
  viewer: { memberId: string; eligible: boolean; account: DoubleDownAccount; call?: Pick<DoubleDownCall, "outcome" | "placedAt"> } | null;
  revealedCalls: Pick<DoubleDownCall, "memberId" | "memberName" | "outcome" | "creditsAwarded">[];
  leaderboard: { memberId: string; name: string; credits: number; correctCalls: number; chipsRemaining: number }[];
  clutchCallerMemberIds: string[];
};

function enabled(settings: unknown) {
  return Boolean(settings && typeof settings === "object" && (settings as { doubleDown?: { enabled?: unknown } }).doubleDown?.enabled === true);
}

function asMarket(value: RawMarket): DoubleDownMarket {
  const match = value.match_snapshot;
  return {
    id: String(value.id), poolId: String(value.pool_id), matchId: String(value.match_id),
    status: value.status, homeTeam: String(match.homeTeam ?? "Home"), awayTeam: String(match.awayTeam ?? "Away"),
    detail: String(match.detail ?? ""), opensAt: String(value.opens_at), locksAt: String(value.locks_at),
    availableOutcomes: (value.available_outcomes ?? []) as DoubleDownMarket["availableOutcomes"],
    impactSummary: String(value.impact_summary), representativeEntries: value.representative_entries ?? {},
    settledOutcome: value.settlement_outcome as DoubleDownMarket["settledOutcome"],
  };
}

function marketOutcome(match: MatchResult) {
  if (match.homeScore !== null && match.awayScore !== null && match.homeScore === match.awayScore) return "draw" as const;
  if (normalizeName(match.winner) === normalizeName(match.homeTeam)) return "home" as const;
  if (normalizeName(match.winner) === normalizeName(match.awayTeam)) return "away" as const;
  return null;
}

async function settlePersistedMarket({
  admin, poolId, market, outcome, sourceSignature, now,
}: {
  admin: Admin; poolId: string; market: DoubleDownMarket; outcome: NonNullable<ReturnType<typeof marketOutcome>>;
  sourceSignature?: string; now: Date;
}) {
  const [{ data: rawCalls, error: callsError }, { data: rawAccounts, error: accountsError }] = await Promise.all([
    admin.from("double_down_calls").select("id,market_id,pool_member_id,outcome,placed_at,credits_awarded").eq("market_id", market.id),
    admin.from("double_down_accounts").select("pool_member_id,chips_spent,credits,correct_calls").eq("pool_id", poolId),
  ]);
  if (callsError) throw new Error(callsError.message);
  if (accountsError) throw new Error(accountsError.message);
  const settlement = settleDoubleDownCalls({
    calls: (rawCalls ?? []).map((call) => ({ id: String(call.id), marketId: String(call.market_id), memberId: String(call.pool_member_id), memberName: "", outcome: call.outcome as DoubleDownCall["outcome"], placedAt: String(call.placed_at), creditsAwarded: Number(call.credits_awarded) })),
    accounts: (rawAccounts ?? []).map((account) => ({ memberId: String(account.pool_member_id), chipsSpent: Number(account.chips_spent), credits: Number(account.credits), correctCalls: Number(account.correct_calls) })),
    outcome,
  });
  const writes = await Promise.all([
    ...settlement.calls.map((call) => admin.from("double_down_calls").update({ credits_awarded: call.creditsAwarded, settled_outcome: outcome, settled_at: now.toISOString() }).eq("id", call.id)),
    ...settlement.accounts.map((account) => admin.from("double_down_accounts").update({ credits: account.credits, correct_calls: account.correctCalls, updated_at: now.toISOString() }).eq("pool_id", poolId).eq("pool_member_id", account.memberId)),
    admin.from("double_down_markets").update({ status: "settled", settlement_outcome: outcome, settlement_source_signature: sourceSignature ?? null, settled_at: now.toISOString(), updated_at: now.toISOString() }).eq("id", market.id),
  ]);
  for (const write of writes) if (write.error) throw new Error(write.error.message);
}

async function cancelPersistedMarket(admin: Admin, poolId: string, marketId: string, now: Date) {
  const { data: calls, error } = await admin.from("double_down_calls").select("pool_member_id").eq("market_id", marketId);
  if (error) throw new Error(error.message);
  const writes = await Promise.all([
    ...(calls ?? []).map((call) => admin.rpc("cancel_double_down_chip", { p_pool_id: poolId, p_member_id: String(call.pool_member_id) })),
    admin.from("double_down_markets").update({ status: "cancelled", cancelled_at: now.toISOString(), updated_at: now.toISOString() }).eq("id", marketId),
  ]);
  for (const write of writes) if (write.error) throw new Error(write.error.message);
}

export async function getDoubleDownPublicSnapshot(poolSlug: string): Promise<DoubleDownPublicSnapshot | null> {
  if (!isSupabaseConfigured()) return null;
  const admin = createSupabaseAdminClient();
  const { data: pool, error: poolError } = await admin
    .from("pools").select("id,slug,settings").eq("slug", poolSlug).maybeSingle();
  if (poolError || !pool || !enabled(pool.settings)) return null;
  const { data: rawMarket, error: marketError } = await admin
    .from("double_down_markets")
    .select("id,pool_id,match_id,match_snapshot,status,available_outcomes,opens_at,locks_at,impact_summary,representative_entries,settlement_outcome")
    .eq("pool_id", pool.id)
    .in("status", ["scheduled", "open", "locked", "settled"])
    .order("locks_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (marketError || !rawMarket) return null;

  const market = asMarket(rawMarket as RawMarket);
  const visibleStatus = marketStatusAt(market);
  const revealed = visibleStatus === "locked" || visibleStatus === "settled";
  const user = await getSupabaseUser();
  const { data: members, error: memberError } = await admin
    .from("pool_members")
    .select("id,user_id,profiles(display_name)")
    .eq("pool_id", pool.id);
  if (memberError) throw new Error(memberError.message);
  const memberName = new Map((members ?? []).map((member) => {
    const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
    return [String(member.id), String(profile?.display_name ?? "Pool member")];
  }));
  const viewerMember = (members ?? []).find((member) => String(member.user_id) === user?.id);
  const { data: accountRows, error: accountError } = await admin
    .from("double_down_accounts")
    .select("pool_member_id,chips_spent,credits,correct_calls")
    .eq("pool_id", pool.id);
  if (accountError) throw new Error(accountError.message);
  const accounts = (accountRows ?? []).map((account) => ({
    memberId: String(account.pool_member_id), chipsSpent: Number(account.chips_spent), credits: Number(account.credits), correctCalls: Number(account.correct_calls),
  }));
  const { data: rawCalls, error: callsError } = await admin
    .from("double_down_calls")
    .select("id,pool_member_id,outcome,placed_at,credits_awarded")
    .eq("market_id", market.id);
  if (callsError) throw new Error(callsError.message);
  const calls = (rawCalls ?? []).map((call) => ({
    id: String(call.id), marketId: market.id, memberId: String(call.pool_member_id), memberName: memberName.get(String(call.pool_member_id)) ?? "Pool member",
    outcome: call.outcome as DoubleDownCall["outcome"], placedAt: String(call.placed_at), creditsAwarded: Number(call.credits_awarded),
  }));
  const viewerCall = viewerMember ? calls.find((call) => call.memberId === String(viewerMember.id)) : undefined;
  const viewerAccount = viewerMember
    ? accounts.find((account) => account.memberId === String(viewerMember.id)) ?? { memberId: String(viewerMember.id), chipsSpent: 0, credits: 0, correctCalls: 0 }
    : null;
  const leaderboard = accounts
    .map((account) => ({ memberId: account.memberId, name: memberName.get(account.memberId) ?? "Pool member", credits: account.credits, correctCalls: account.correctCalls, chipsRemaining: DOUBLE_DOWN_CHIP_COUNT - account.chipsSpent }))
    .sort((left, right) => right.credits - left.credits || right.correctCalls - left.correctCalls || left.name.localeCompare(right.name));
  const topCredits = Math.max(0, ...leaderboard.map((account) => account.credits));

  return {
    poolSlug,
    market: { ...market, status: visibleStatus },
    viewer: viewerMember && viewerAccount ? {
      memberId: String(viewerMember.id),
      eligible: Object.prototype.hasOwnProperty.call(market.representativeEntries, String(viewerMember.id)),
      account: viewerAccount,
      call: viewerCall ? { outcome: viewerCall.outcome, placedAt: viewerCall.placedAt } : undefined,
    } : null,
    revealedCalls: revealed ? calls.map((call) => ({ memberId: call.memberId, memberName: call.memberName, outcome: call.outcome, creditsAwarded: call.creditsAwarded })) : [],
    leaderboard,
    clutchCallerMemberIds: topCredits > 0 ? leaderboard.filter((account) => account.credits === topCredits).map((account) => account.memberId) : [],
  };
}

/** Reconciles one persisted pool from a trusted scoring job after results refresh. */
export async function reconcileDoubleDownMarket({
  poolId, matches, participants, impacts, sourceSignature, now = new Date(),
}: {
  poolId: string;
  matches: MatchResult[];
  participants: DoubleDownParticipant[];
  impacts: DoubleDownMatchImpact[];
  sourceSignature?: string;
  now?: Date;
}) {
  if (!isSupabaseConfigured()) return null;
  const admin = createSupabaseAdminClient();
  const { data: current, error } = await admin
    .from("double_down_markets")
    .select("id,pool_id,match_id,match_snapshot,status,available_outcomes,opens_at,locks_at,impact_summary,representative_entries,settlement_outcome")
    .eq("pool_id", poolId)
    .in("status", ["scheduled", "open", "locked"])
    .order("locks_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (!current) {
    // Settled markets are revisited on every trusted refresh so an upstream
    // official correction reverses and reapplies credits instead of drifting.
    const { data: settledRows, error: settledError } = await admin
      .from("double_down_markets")
      .select("id,pool_id,match_id,match_snapshot,status,available_outcomes,opens_at,locks_at,impact_summary,representative_entries,settlement_outcome")
      .eq("pool_id", poolId).eq("status", "settled").order("settled_at", { ascending: false }).limit(16);
    if (settledError) throw new Error(settledError.message);
    for (const raw of settledRows ?? []) {
      const settledMarket = asMarket(raw as RawMarket);
      const settledMatch = matches.find((item) => item.id === settledMarket.matchId);
      const correctedOutcome = settledMatch && (settledMatch.completed || settledMatch.state === "post") ? marketOutcome(settledMatch) : null;
      if (correctedOutcome && correctedOutcome !== settledMarket.settledOutcome) {
        await settlePersistedMarket({ admin, poolId, market: settledMarket, outcome: correctedOutcome, sourceSignature, now });
        return settledMarket.id;
      }
    }
    const candidate = selectDoubleDownCandidate({ matches, participants, impacts, now });
    if (!candidate) return null;
    const eligible = participants.filter((participant) => participant.canReachPayout);
    const status = now < new Date(candidate.openAt) ? "scheduled" : "open";
    const { data: created, error: createError } = await admin.from("double_down_markets").insert({
      pool_id: poolId, match_id: candidate.match.id, match_snapshot: candidate.match,
      status, available_outcomes: candidate.availableOutcomes, opens_at: candidate.openAt, locks_at: candidate.locksAt,
      impact_summary: candidate.impactSummary, eligible_member_ids: eligible.map((participant) => participant.memberId),
      representative_entries: Object.fromEntries(eligible.map((participant) => [participant.memberId, participant.representativeEntryId])),
    }).select("id").single();
    if (createError) throw new Error(createError.message);
    const accountRows = eligible.map((participant) => ({ pool_id: poolId, pool_member_id: participant.memberId }));
    if (accountRows.length) {
      const { error: accountError } = await admin.from("double_down_accounts").upsert(accountRows, { onConflict: "pool_id,pool_member_id", ignoreDuplicates: true });
      if (accountError) throw new Error(accountError.message);
    }
    return created?.id ?? null;
  }

  const market = asMarket(current as RawMarket);
  const match = matches.find((item) => item.id === market.matchId);
  if (!match) {
    await cancelPersistedMarket(admin, poolId, market.id, now);
    return market.id;
  }
  const status = marketStatusAt(market, now);
  if (status === "scheduled" || status === "open") {
    if (status !== market.status) await admin.from("double_down_markets").update({ status, updated_at: now.toISOString() }).eq("id", market.id);
    return market.id;
  }
  const outcome = match.completed || match.state === "post" ? marketOutcome(match) : null;
  if (!outcome) {
    if (status !== market.status) await admin.from("double_down_markets").update({ status, updated_at: now.toISOString() }).eq("id", market.id);
    return market.id;
  }
  await settlePersistedMarket({ admin, poolId, market, outcome, sourceSignature, now });
  return market.id;
}

/**
 * Adapter for the World Cup scorer. Persisted entries opt in by storing their
 * immutable imported fixture entry id at `entries.metadata.worldCupEntryId`.
 * That avoids guessing identity from display names.
 */
export async function reconcileWorldCupDoubleDown({
  poolSlug, entriesConfig, picksByPath, results, sourceSignature,
}: {
  poolSlug: string;
  entriesConfig: EntriesConfig;
  picksByPath: Map<string, EntryPicks>;
  results: PoolResults;
  sourceSignature?: string;
}) {
  if (!isSupabaseConfigured()) return null;
  const admin = createSupabaseAdminClient();
  const { data: pool, error: poolError } = await admin
    .from("pools").select("id,settings").eq("slug", poolSlug).maybeSingle();
  if (poolError) throw new Error(poolError.message);
  if (!pool || !enabled(pool.settings)) return null;
  const [{ data: members, error: membersError }, { data: storedEntries, error: entriesError }] = await Promise.all([
    admin.from("pool_members").select("id,user_id").eq("pool_id", pool.id),
    admin.from("entries").select("user_id,display_name,metadata").eq("pool_id", pool.id),
  ]);
  if (membersError) throw new Error(membersError.message);
  if (entriesError) throw new Error(entriesError.message);
  const rows = buildLeaderboardRows(entriesConfig, picksByPath, results);
  const analytics = buildPoolAnalytics(entriesConfig, picksByPath, results, rows);
  const analyticsByEntry = new Map(analytics.rows.map((row) => [row.id, row]));
  const rowByEntry = new Map(rows.map((row) => [row.id, row]));
  const entriesByUser = new Map<string, { id: string; displayName: string }[]>();
  for (const entry of storedEntries ?? []) {
    const fixtureEntryId = entry.metadata && typeof entry.metadata === "object"
      ? (entry.metadata as { worldCupEntryId?: unknown }).worldCupEntryId
      : undefined;
    if (typeof fixtureEntryId !== "string" || !rowByEntry.has(fixtureEntryId) || !entry.user_id) continue;
    const list = entriesByUser.get(String(entry.user_id)) ?? [];
    list.push({ id: fixtureEntryId, displayName: String(entry.display_name) });
    entriesByUser.set(String(entry.user_id), list);
  }
  const participants: DoubleDownParticipant[] = [];
  for (const member of members ?? []) {
    const linked = entriesByUser.get(String(member.user_id)) ?? [];
    const best = linked
      .map((entry) => ({ entry, analytics: analyticsByEntry.get(entry.id), row: rowByEntry.get(entry.id) }))
      .filter((item): item is { entry: { id: string; displayName: string }; analytics: NonNullable<typeof item.analytics>; row: NonNullable<typeof item.row> } => Boolean(item.analytics && item.row && item.analytics.canReachPayout))
      .sort((left, right) => left.row.rank - right.row.rank || right.analytics.maxPossible - left.analytics.maxPossible)[0];
    if (!best) continue;
    participants.push({ memberId: String(member.id), name: best.entry.displayName, representativeEntryId: best.entry.id, representativeEntryName: best.row.name, rank: best.row.rank, canReachPayout: true });
  }
  const referencePicks = entriesConfig.entries.find((entry) => entry.picksPath)?.picksPath;
  const fixturePicks = referencePicks ? picksByPath.get(referencePicks) : undefined;
  if (!fixturePicks || participants.length < 2) return null;
  const impacts: DoubleDownMatchImpact[] = participants.flatMap((participant) => {
    const row = rowByEntry.get(participant.representativeEntryId);
    if (!row) return [];
    const report = buildFutureLeverageReport({ entriesConfig, picksByPath, results, referencePicks: fixturePicks, entryId: row.id });
    return (report?.matches ?? []).map((match) => ({
      memberId: participant.memberId,
      matchId: match.id,
      outcomes: match.outcomes.map((outcome) => ({ outcome: outcome.outcome, rankDelta: outcome.rankChange, pointDelta: outcome.pointChange })),
    }));
  });
  const seen = new Set<string>();
  const matches = [...(results.matches ?? []), ...(results.fixtures ?? [])].filter((match) => {
    if (seen.has(match.id)) return false;
    seen.add(match.id);
    return true;
  });
  return reconcileDoubleDownMarket({ poolId: String(pool.id), matches, participants, impacts, sourceSignature });
}

export async function placeDoubleDownCall({ poolSlug, marketId, outcome }: { poolSlug: string; marketId: string; outcome: string }) {
  if (!isSupabaseConfigured()) throw new Error("Double Down is not configured.");
  const user = await getSupabaseUser();
  if (!user) throw new Error("You must be signed in.");
  const admin = createSupabaseAdminClient();
  const { data: market, error: marketError } = await admin.from("double_down_markets").select("pool_id,pools(slug,settings)").eq("id", marketId).maybeSingle();
  const pool = Array.isArray(market?.pools) ? market?.pools[0] : market?.pools;
  if (marketError || !market || !pool || String(pool.slug) !== poolSlug || !enabled(pool.settings)) throw new Error("Double Down market not found.");
  const { data, error } = await admin.rpc("place_double_down_call", { p_market_id: marketId, p_user_id: user.id, p_outcome: outcome });
  if (error) throw new Error(error.message);
  await admin.from("double_down_engagement_events").insert({
    pool_id: market.pool_id,
    market_id: marketId,
    event_type: "call_committed",
  });
  revalidatePath(`/pools/${poolSlug}`);
  return Array.isArray(data) ? data[0] : data;
}

export async function getDoubleDownCommissionerSettings(poolId: string) {
  if (!isSupabaseConfigured()) return null;
  const user = await getSupabaseUser();
  if (!user) return null;
  const admin = createSupabaseAdminClient();
  const { data: pool, error } = await admin.from("pools").select("id,slug,owner_id,settings").eq("id", poolId).maybeSingle();
  if (error || !pool || String(pool.owner_id) !== user.id) return null;
  return { poolId: String(pool.id), poolSlug: String(pool.slug), enabled: enabled(pool.settings) };
}

export async function setDoubleDownEnabled({ poolId, enabled: shouldEnable }: { poolId: string; enabled: boolean }) {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");
  const user = await getSupabaseUser();
  if (!user) throw new Error("You must be signed in.");
  const admin = createSupabaseAdminClient();
  const { data: pool, error } = await admin.from("pools").select("id,slug,owner_id,settings").eq("id", poolId).maybeSingle();
  if (error || !pool) throw new Error("Pool not found.");
  if (String(pool.owner_id) !== user.id) throw new Error("Only the pool commissioner can change Double Down.");
  const settings = pool.settings && typeof pool.settings === "object" ? pool.settings as Record<string, unknown> : {};
  const current = settings.doubleDown && typeof settings.doubleDown === "object" ? settings.doubleDown as Record<string, unknown> : {};
  const { error: updateError } = await admin.from("pools").update({ settings: { ...settings, doubleDown: { ...current, enabled: shouldEnable } }, updated_at: new Date().toISOString() }).eq("id", pool.id);
  if (updateError) throw new Error(updateError.message);
  const { error: auditError } = await admin.from("audit_events").insert({ pool_id: pool.id, actor_id: user.id, event_type: "double_down.enabled_changed", summary: shouldEnable ? "Enabled Double Down." : "Disabled Double Down.", metadata: { enabled: shouldEnable } });
  if (auditError) throw new Error(auditError.message);
  revalidatePath(`/dashboard/pools/${pool.id}/edit`);
  revalidatePath(`/pools/${pool.slug}`);
  return { poolSlug: String(pool.slug), enabled: shouldEnable };
}

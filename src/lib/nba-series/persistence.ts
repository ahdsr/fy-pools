import "server-only";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { createNbaSimulation, NBA_SERIES_TEMPLATE_SLUG, nbaPickDeadlineHasPassed, validateNbaSeriesSettings } from "@/lib/nba-series/draft";
import { scoreNbaSeriesEntry } from "@/lib/nba-series/scoring";
import type { NbaSeriesInvite, NbaSeriesPickPayload, NbaSeriesSettings } from "@/lib/nba-series/types";
import { createSupabaseAdminClient, getSupabaseUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { normalizeEmailAddress } from "@/lib/email";
import { recordSeriesResult, resolveBracketSimulation } from "@/lib/templates/bracket-simulation";
import { getNbaSeriesSettings, rankStandings } from "@/lib/templates/lifecycle";

type Admin = ReturnType<typeof createSupabaseAdminClient>;
export type NbaStoredLeaderboardRow = { entryId: string; entryName: string; rank: number; total: number; maxPoints: number; submittedAt: string; lines: ReturnType<typeof scoreNbaSeriesEntry>["lines"] };
export type NbaJoinData = { invite: { id: string; code: string; email: string; displayName: string; status: string; acceptedBy: string; isShareLink: boolean }; pool: { id: string; slug: string; name: string; ownerId: string; templateVersionId: string; settings: NbaSeriesSettings }; existingSubmission?: { entryId: string; entryPickId: string; submittedAt: string; payload: NbaSeriesPickPayload }; deadlineHasPassed: boolean };
export type NbaPublicPool = { poolId: string; poolSlug: string; poolName: string; settings: NbaSeriesSettings; entries: { entryId: string; entryName: string; submittedAt: string }[]; latestStandings: NbaStoredLeaderboardRow[]; latestStandingsCalculatedAt: string };

function configured() { if (!isSupabaseConfigured()) throw new Error("Supabase is not configured."); }
function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "nba-playoff-pool"; }
function inviteCode() { return `pool-${randomUUID()}`; }
function normalizeInvites(invites: NbaSeriesInvite[]) { return (invites ?? []).map((invite) => ({ email: normalizeEmailAddress(invite.email), displayName: invite.displayName.trim() || invite.email.split("@")[0] || "Participant" })).filter((invite) => invite.email); }

async function ensureUser() {
  configured();
  const user = await getSupabaseUser();
  if (!user) throw new Error("You must be signed in.");
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("profiles").upsert({ id: user.id, display_name: user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? "Commissioner", updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  return user;
}

async function buildPoolSlug(admin: Admin, name: string) {
  const base = slugify(name);
  const { data, error } = await admin.from("pools").select("slug").ilike("slug", `${base}%`);
  if (error) throw new Error(error.message);
  const existing = new Set((data ?? []).map((pool) => String(pool.slug)));
  if (!existing.has(base)) return base;
  for (let suffix = 2; suffix < 1000; suffix += 1) if (!existing.has(`${base}-${suffix}`)) return `${base}-${suffix}`;
  return `${base}-${randomUUID().slice(0, 8)}`;
}

async function ensureTemplate(admin: Admin) {
  const { data: template, error } = await admin.from("template_versions").upsert({ slug: NBA_SERIES_TEMPLATE_SLUG, name: "NBA Series Bracket", version: 1, description: "NBA playoff series winner and exact-score picks.", config: { runtime: "series-bracket", sport: "basketball" } }, { onConflict: "slug,version" }).select("id").single();
  if (error) throw new Error(error.message);
  const simulation = createNbaSimulation({ teams: [
    ...Array.from({ length: 8 }, (_, index) => ({ id: `east-${index}`, name: `East ${index + 1}`, conference: "east" as const, seed: index + 1 })),
    ...Array.from({ length: 8 }, (_, index) => ({ id: `west-${index}`, name: `West ${index + 1}`, conference: "west" as const, seed: index + 1 })),
  ], results: {} });
  const fields = simulation.series.map((series, index) => ({ template_version_id: template.id, key: `${series.id}_score`, label: `${series.label} score`, pick_type: "series_score", required: true, sort_order: index, config: { fieldKind: "series_score", seriesId: series.id, bestOf: 7 } }));
  const { error: fieldError } = await admin.from("template_pick_fields").upsert(fields, { onConflict: "template_version_id,key", ignoreDuplicates: true });
  if (fieldError) throw new Error(fieldError.message);
  const { data: fieldRows, error: selectError } = await admin.from("template_pick_fields").select("id,key").eq("template_version_id", template.id);
  if (selectError) throw new Error(selectError.message);
  return { templateVersionId: String(template.id), fields: new Map((fieldRows ?? []).map((field) => [String(field.key), String(field.id)])) };
}

export async function publishNbaSeriesPool({ settings, participants }: { settings: NbaSeriesSettings; participants: NbaSeriesInvite[] }) {
  const validation = validateNbaSeriesSettings(settings);
  if (validation) throw new Error(validation);
  const user = await ensureUser();
  const admin = createSupabaseAdminClient();
  const [template, poolSlug] = await Promise.all([ensureTemplate(admin), buildPoolSlug(admin, settings.basics.poolName)]);
  const { data: pool, error } = await admin.from("pools").insert({ owner_id: user.id, template_version_id: template.templateVersionId, slug: poolSlug, name: settings.basics.poolName.trim(), status: "open", settings: { nbaSeries: settings } }).select("id,slug,name").single();
  if (error) throw new Error(error.message);
  const poolId = String(pool.id);
  const { error: memberError } = await admin.from("pool_members").upsert({ pool_id: poolId, user_id: user.id, role: "owner" }, { onConflict: "pool_id,user_id" });
  if (memberError) throw new Error(memberError.message);
  const expiresAt = new Date(settings.basics.picksLockAt).toISOString();
  const invites = normalizeInvites(participants);
  const rows = [{ pool_id: poolId, code: inviteCode(), email: null, display_name: "Signup link", expires_at: expiresAt }, ...invites.map((invite) => ({ pool_id: poolId, code: inviteCode(), email: invite.email, display_name: invite.displayName, expires_at: expiresAt }))];
  const { data: insertedInvites, error: inviteError } = await admin.from("pool_invites").insert(rows).select("code,email,display_name");
  if (inviteError) throw new Error(inviteError.message);
  const signup = (insertedInvites ?? []).find((invite) => !invite.email);
  revalidatePath("/dashboard"); revalidatePath("/dashboard/pools");
  return { poolId, poolSlug: String(pool.slug), poolName: String(pool.name), poolHref: `/pools/${pool.slug}`, signupInviteLink: { code: String(signup?.code), href: `/join/${signup?.code}` }, inviteLinks: (insertedInvites ?? []).filter((invite) => invite.email).map((invite) => ({ email: String(invite.email), displayName: String(invite.display_name), href: `/join/${invite.code}` })) };
}

function poolSettings(value: unknown) { return getNbaSeriesSettings(value); }
function itemPayload(items: unknown): NbaSeriesPickPayload {
  const series: NbaSeriesPickPayload["series"] = {};
  for (const item of Array.isArray(items) ? items : []) {
    const value = item && typeof item === "object" ? (item as { value?: unknown }).value : undefined;
    if (value && typeof value === "object") { const pick = value as { seriesId?: unknown; winner?: unknown; winnerWins?: unknown; loserWins?: unknown }; if (typeof pick.seriesId === "string" && typeof pick.winner === "string" && Number.isInteger(pick.winnerWins) && Number.isInteger(pick.loserWins)) series[pick.seriesId] = { winner: pick.winner, winnerWins: Number(pick.winnerWins), loserWins: Number(pick.loserWins) }; }
  }
  return { series };
}

export async function getNbaJoinPoolData(inviteCodeValue: string): Promise<NbaJoinData | null> {
  if (!isSupabaseConfigured()) return null;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("pool_invites").select("id,code,email,display_name,status,accepted_by,pools(id,slug,name,owner_id,template_version_id,settings)").eq("code", inviteCodeValue).maybeSingle();
  if (error || !data) return null;
  const pool = Array.isArray(data.pools) ? data.pools[0] : data.pools;
  const settings = poolSettings(pool?.settings); if (!pool || !settings) return null;
  const user = await getSupabaseUser();
  let existingSubmission: NbaJoinData["existingSubmission"];
  if (user) { const { data: entry } = await admin.from("entries").select("id,entry_picks(id,submitted_at,entry_pick_items(value))").eq("pool_id", pool.id).eq("user_id", user.id).eq("entry_number", 1).maybeSingle(); const pick = Array.isArray(entry?.entry_picks) ? entry?.entry_picks[0] : entry?.entry_picks; if (entry && pick) existingSubmission = { entryId: String(entry.id), entryPickId: String(pick.id), submittedAt: String(pick.submitted_at ?? ""), payload: itemPayload(pick.entry_pick_items) }; }
  return { invite: { id: String(data.id), code: String(data.code), email: String(data.email ?? ""), displayName: String(data.display_name ?? "Participant"), status: String(data.status), acceptedBy: String(data.accepted_by ?? ""), isShareLink: !data.email }, pool: { id: String(pool.id), slug: String(pool.slug), name: String(pool.name), ownerId: String(pool.owner_id), templateVersionId: String(pool.template_version_id), settings }, existingSubmission, deadlineHasPassed: nbaPickDeadlineHasPassed(settings) };
}

function sanitizePicks(settings: NbaSeriesSettings, payload: NbaSeriesPickPayload) {
  let simulation = createNbaSimulation({ teams: settings.teams, results: {} });
  const clean: NbaSeriesPickPayload = { series: {} };
  for (const series of simulation.series) {
    const pick = payload?.series?.[series.id];
    if (!pick) return { error: "Complete every series winner and score." as const };
    try { simulation = recordSeriesResult({ simulation, seriesId: series.id, result: pick }); clean.series[series.id] = pick; } catch (error) { return { error: error instanceof Error ? error.message : "Series pick is invalid." }; }
  }
  return { payload: clean };
}

export async function submitNbaSeriesPicks({ inviteCode, payload }: { inviteCode: string; payload: NbaSeriesPickPayload }) {
  const user = await ensureUser(); const join = await getNbaJoinPoolData(inviteCode); if (!join) throw new Error("Invite not found.");
  if (join.invite.status === "revoked" || join.invite.status === "expired") throw new Error("This invite is no longer available.");
  if (!join.invite.isShareLink && normalizeEmailAddress(join.invite.email) !== normalizeEmailAddress(user.email)) throw new Error("Sign in with the email address this invite was sent to.");
  const valid = sanitizePicks(join.pool.settings, payload); if ("error" in valid) throw new Error(valid.error);
  const admin = createSupabaseAdminClient(); const template = await ensureTemplate(admin);
  const items = Object.entries(valid.payload.series).map(([seriesId, pick]) => ({ template_pick_field_id: template.fields.get(`${seriesId}_score`), pick_type: "series_score", value: { seriesId, ...pick } }));
  if (items.some((item) => !item.template_pick_field_id)) throw new Error("Pool pick fields are not configured correctly.");
  const submittedAt = new Date().toISOString();
  const { data, error } = await admin.rpc("submit_nba_series_picks_transaction", { p_pool_id: join.pool.id, p_user_id: user.id, p_template_version_id: join.pool.templateVersionId, p_invite_id: join.invite.id, p_accept_invite: !join.invite.isShareLink, p_display_name: user.user_metadata?.display_name ?? join.invite.displayName ?? user.email?.split("@")[0] ?? "Participant", p_entry_number: 1, p_entry_metadata: { inviteCode }, p_submitted_at: submittedAt, p_pick_items: items, p_invite_code: inviteCode });
  if (error) throw new Error(error.message); const row = Array.isArray(data) ? data[0] : data; if (!row?.entry_id) throw new Error("Picks were not submitted.");
  revalidatePath(`/pools/${join.pool.slug}`); return { entryId: String(row.entry_id), entryPickId: String(row.entry_pick_id), submittedAt };
}

async function rebuildNbaSeriesStandings({
  admin,
  poolId,
  settings,
}: {
  admin: Admin;
  poolId: string;
  settings: NbaSeriesSettings;
}) {
  const { data: entries, error: entriesError } = await admin.from("entries").select("id,display_name,entry_picks(id,status,submitted_at,entry_pick_items(id,value))").eq("pool_id", poolId);
  if (entriesError) throw new Error(entriesError.message);
  const scored = (entries ?? []).flatMap((entry) => { const pick = Array.isArray(entry.entry_picks) ? entry.entry_picks[0] : entry.entry_picks; if (!pick || !["submitted","locked"].includes(String(pick.status))) return []; const items = Array.isArray(pick.entry_pick_items) ? pick.entry_pick_items : []; const payload = itemPayload(items); const score = scoreNbaSeriesEntry({ settings, picks: payload }); return [{ entryId: String(entry.id), entryName: String(entry.display_name), total: score.total, maxPoints: score.maxPoints, submittedAt: String(pick.submitted_at ?? ""), lines: score.lines, breakdownRows: score.lines.map((line) => ({ entry_id: entry.id, entry_pick_item_id: items.find((item) => (item.value as { seriesId?: string })?.seriesId && line.key.startsWith(String((item.value as { seriesId?: string }).seriesId)))?.id ?? null, points_awarded: line.pointsAwarded, max_points: line.maxPoints, reason: `${line.label}: ${line.reason}` })) }]; });
  const rows = rankStandings(scored.map((row) => ({ entryId: row.entryId, entryName: row.entryName, total: row.total, maxPoints: row.maxPoints, submittedAt: row.submittedAt, lines: row.lines })));
  const { error: snapshotError } = await admin.rpc("replace_template_score_snapshot", { p_pool_id: poolId, p_entry_ids: scored.map((row) => row.entryId), p_breakdowns: scored.flatMap((row) => row.breakdownRows), p_rows: rows });
  if (snapshotError) throw new Error(snapshotError.message);
  return rows as NbaStoredLeaderboardRow[];
}

async function recordNbaSimulationAudit({ admin, poolId, actorId, eventType, summary, metadata }: { admin: Admin; poolId: string; actorId: string; eventType: string; summary: string; metadata: Record<string, unknown> }) {
  const { error } = await admin.from("audit_events").insert({ pool_id: poolId, actor_id: actorId, event_type: eventType, summary, metadata });
  if (error) console.error("[fy-pools] Failed to record NBA simulation audit event", error);
}

export async function refreshNbaSeriesScoring({ poolId, result }: { poolId: string; result: { seriesId: string; winner: string; winnerWins: number; loserWins: number } }) {
  const user = await ensureUser(); const admin = createSupabaseAdminClient();
  const { data: pool, error } = await admin.from("pools").select("id,owner_id,slug,settings").eq("id", poolId).single(); if (error) throw new Error(error.message); if (String(pool.owner_id) !== user.id) throw new Error("Only the pool commissioner can simulate results.");
  const settings = poolSettings(pool.settings); if (!settings) throw new Error("NBA Series settings were not found.");
  const simulation = recordSeriesResult({ simulation: createNbaSimulation(settings), seriesId: result.seriesId, result });
  const nextSettings = { ...settings, results: simulation.results };
  const { error: updateError } = await admin.from("pools").update({ settings: { nbaSeries: nextSettings }, updated_at: new Date().toISOString() }).eq("id", poolId); if (updateError) throw new Error(updateError.message);
  const rows = await rebuildNbaSeriesStandings({ admin, poolId, settings: nextSettings });
  await recordNbaSimulationAudit({ admin, poolId, actorId: user.id, eventType: "nba.simulation.series_recorded", summary: `Recorded ${result.winner} winning ${result.seriesId}.`, metadata: { seriesId: result.seriesId, result } });
  revalidatePath(`/pools/${pool.slug}`); revalidatePath(`/pools/${pool.slug}/leaderboard`); revalidatePath(`/dashboard/pools/${poolId}/edit`); return { settings: nextSettings, rows };
}

export async function resetNbaSeriesSimulation(poolId: string) {
  const user = await ensureUser(); const admin = createSupabaseAdminClient();
  const { data: pool, error } = await admin.from("pools").select("id,owner_id,slug,settings").eq("id", poolId).single();
  if (error) throw new Error(error.message);
  if (String(pool.owner_id) !== user.id) throw new Error("Only the pool commissioner can reset simulation results.");
  const settings = poolSettings(pool.settings); if (!settings) throw new Error("NBA Series settings were not found.");
  const nextSettings = { ...settings, results: {} };
  const { error: updateError } = await admin.from("pools").update({ settings: { nbaSeries: nextSettings }, updated_at: new Date().toISOString() }).eq("id", poolId); if (updateError) throw new Error(updateError.message);
  const rows = await rebuildNbaSeriesStandings({ admin, poolId, settings: nextSettings });
  await recordNbaSimulationAudit({ admin, poolId, actorId: user.id, eventType: "nba.simulation.reset", summary: "Reset NBA series simulation results.", metadata: {} });
  revalidatePath(`/pools/${pool.slug}`); revalidatePath(`/pools/${pool.slug}/leaderboard`); revalidatePath(`/dashboard/pools/${poolId}/edit`);
  return { settings: nextSettings, rows };
}

export async function getPublicNbaSeriesPool(poolSlug: string): Promise<NbaPublicPool | null> {
  if (!isSupabaseConfigured()) return null; const admin = createSupabaseAdminClient(); const { data: pool, error } = await admin.from("pools").select("id,slug,name,settings").eq("slug", poolSlug).maybeSingle(); if (error || !pool) return null; const settings = poolSettings(pool.settings); if (!settings) return null;
  const [{ data: entries, error: entriesError }, { data: snapshot }] = await Promise.all([admin.from("entries").select("id,display_name,entry_picks(status,submitted_at)").eq("pool_id", pool.id), admin.from("standings_snapshots").select("rows,calculated_at").eq("pool_id", pool.id).order("calculated_at", { ascending: false }).limit(1).maybeSingle()]); if (entriesError) throw new Error(entriesError.message);
  return { poolId: String(pool.id), poolSlug: String(pool.slug), poolName: String(pool.name), settings, entries: (entries ?? []).flatMap((entry) => { const pick = Array.isArray(entry.entry_picks) ? entry.entry_picks[0] : entry.entry_picks; return pick && ["submitted","locked"].includes(String(pick.status)) ? [{ entryId: String(entry.id), entryName: String(entry.display_name), submittedAt: String(pick.submitted_at ?? "") }] : []; }), latestStandings: Array.isArray(snapshot?.rows) ? snapshot.rows as NbaStoredLeaderboardRow[] : [], latestStandingsCalculatedAt: String(snapshot?.calculated_at ?? "") };
}

export async function getCommissionerNbaSeriesPool(poolId: string) {
  const user = await ensureUser(); const admin = createSupabaseAdminClient(); const { data: pool, error } = await admin.from("pools").select("id,slug,name,owner_id,settings").eq("id", poolId).maybeSingle(); if (error || !pool) return null; if (String(pool.owner_id) !== user.id) throw new Error("Only the pool commissioner can view this pool."); const settings = poolSettings(pool.settings); return settings ? { poolId: String(pool.id), poolSlug: String(pool.slug), poolName: String(pool.name), settings } : null;
}

export function getNbaSimulationSeries(settings: NbaSeriesSettings) { return resolveBracketSimulation(createNbaSimulation(settings)); }

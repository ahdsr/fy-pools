import "server-only";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { withSnapshotFreshness, type CatalogEvent } from "@/lib/events/types";
import { normalizeEmailAddress } from "@/lib/email";
import {
  rankedFinishDeadlineHasPassed,
  recordRankedFinishResult,
  resetRankedFinishResults,
  scoreRankedFinishEntry,
  validateRankedFinishPicks,
  validateRankedFinishSettings,
} from "@/lib/ranked-finish/engine";
import { F1_GRAND_PRIX_TEMPLATE_SLUG } from "@/lib/ranked-finish/f1";
import { GOLF_PGA_TOP_FIVE_TEMPLATE_SLUG } from "@/lib/ranked-finish/golf";
import { getRankedFinishTemplate, type RankedFinishTemplate } from "@/lib/ranked-finish/templates";
import type { RankedFinishPickPayload, RankedFinishSettings } from "@/lib/ranked-finish/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseAdminClient, getSupabaseUser } from "@/lib/supabase/server";
import { getRankedFinishSettings, rankStandings } from "@/lib/templates/lifecycle";

type Admin = ReturnType<typeof createSupabaseAdminClient>;
export type RankedFinishInvite = { id: string; email: string; displayName: string };
export type RankedFinishStoredLeaderboardRow = { entryId: string; entryName: string; rank: number; total: number; maxPoints: number; submittedAt: string; lines: ReturnType<typeof scoreRankedFinishEntry>["lines"] };
export type RankedFinishJoinData = { invite: { id: string; code: string; email: string; displayName: string; status: string; acceptedBy: string; isShareLink: boolean }; pool: { id: string; slug: string; name: string; ownerId: string; templateVersionId: string; settings: RankedFinishSettings }; existingSubmission?: { entryId: string; entryPickId: string; submittedAt: string; payload: RankedFinishPickPayload }; deadlineHasPassed: boolean };
export type RankedFinishPublicPool = { poolId: string; poolSlug: string; poolName: string; settings: RankedFinishSettings; entries: { entryId: string; entryName: string; submittedAt: string }[]; latestStandings: RankedFinishStoredLeaderboardRow[]; latestStandingsCalculatedAt: string };
/** Compatibility aliases keep existing F1 routes focused on presentation, not persistence. */
export type F1JoinData = RankedFinishJoinData;
export type GolfJoinData = RankedFinishJoinData;
export type F1PublicPool = RankedFinishPublicPool;
export type GolfPublicPool = RankedFinishPublicPool;

function configured() { if (!isSupabaseConfigured()) throw new Error("Supabase is not configured."); }
function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "ranked-finish-predictor"; }
function inviteCode() { return `pool-${randomUUID()}`; }
function rankedSettings(value: unknown, templateSlug: string) { const settings = getRankedFinishSettings(value); return settings?.templateSlug === templateSlug ? settings : undefined; }
function normalizedInvites(invites: RankedFinishInvite[]) { return (invites ?? []).map((invite) => ({ email: normalizeEmailAddress(invite.email), displayName: invite.displayName.trim() || invite.email.split("@")[0] || "Participant" })).filter((invite) => invite.email); }
function templateFor(slug: string) { const template = getRankedFinishTemplate(slug); if (!template) throw new Error("Ranked-finish template is not supported."); return template; }

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
  const base = slugify(name); const { data, error } = await admin.from("pools").select("slug").ilike("slug", `${base}%`); if (error) throw new Error(error.message);
  const existing = new Set((data ?? []).map((pool) => String(pool.slug))); if (!existing.has(base)) return base;
  for (let suffix = 2; suffix < 1000; suffix += 1) if (!existing.has(`${base}-${suffix}`)) return `${base}-${suffix}`;
  return `${base}-${randomUUID().slice(0, 8)}`;
}

async function ensureTemplate(
  admin: Admin,
  settings: RankedFinishSettings,
) {
  const definition = templateFor(settings.templateSlug);
  const { data: template, error } = await admin.from("template_versions").upsert({ slug: definition.slug, name: definition.name, version: 1, description: definition.description, config: { runtime: "ranked-finish", sport: definition.sport } }, { onConflict: "slug,version" }).select("id").single();
  if (error) throw new Error(error.message);
  const fields = settings.markets.flatMap((market, marketIndex) => Array.from({ length: market.positions }, (_, index) => ({ template_version_id: template.id, key: `${market.id}_p${index + 1}`, label: `${market.label} P${index + 1}`, pick_type: "team_bonus", required: true, sort_order: marketIndex * 100 + index, config: { fieldKind: "ranked_finish", market: market.id, position: index + 1 } })));
  const { error: fieldError } = await admin.from("template_pick_fields").upsert(fields, { onConflict: "template_version_id,key", ignoreDuplicates: true }); if (fieldError) throw new Error(fieldError.message);
  const { data: fieldRows, error: selectError } = await admin.from("template_pick_fields").select("id,key").eq("template_version_id", template.id); if (selectError) throw new Error(selectError.message);
  return { templateVersionId: String(template.id), fields: new Map((fieldRows ?? []).map((field) => [String(field.key), String(field.id)])) };
}

async function canonicalizeRankedFinishSettings(
  admin: Admin,
  settings: RankedFinishSettings,
  definition: RankedFinishTemplate,
  reviewedAt = new Date().toISOString(),
) {
  const source = settings.sourceSnapshot;
  if (!source?.rosterReviewed) throw new Error(`Review the captured ${definition.competitorNoun} roster before publishing this pool.`);
  const { data, error } = await admin.from("event_catalog_snapshots").select("event_payload,source_signature,fetched_at,expires_at").eq("provider", source.provider).eq("event_external_id", source.eventExternalId).maybeSingle();
  if (error || !data) throw new Error(`The selected ${definition.eventNoun} snapshot is no longer available. Refresh and review it again.`);
  if (String(data.source_signature) !== source.sourceSignature) throw new Error(`The selected ${definition.eventNoun} changed after review. Refresh and confirm the current ${definition.competitorNoun} roster.`);
  const snapshot = withSnapshotFreshness(data.event_payload as CatalogEvent, { fetchedAt: String(data.fetched_at), sourceSignature: String(data.source_signature), expiresAt: String(data.expires_at) });
  if (snapshot.competitionSlug !== definition.competitionSlug || snapshot.freshness === "stale" || snapshot.readiness === "unavailable") throw new Error(`The selected ${definition.eventNoun} is not ready for pool setup.`);
  const mapped = definition.createSettingsFromCatalogEvent(snapshot, { commissionerName: settings.basics.commissionerName, poolName: settings.basics.poolName, timezone: settings.basics.timezone });
  const next = { ...settings, basics: { ...settings.basics, eventLabel: mapped.basics.eventLabel, picksLockAt: mapped.basics.picksLockAt }, competitors: mapped.competitors, sourceSnapshot: { ...mapped.sourceSnapshot!, rosterReviewed: true, reviewedAt } };
  if (rankedFinishDeadlineHasPassed(next)) throw new Error("The selected pick deadline has already passed.");
  return next;
}

export async function publishRankedFinishPool({ settings, participants, templateSlug }: { settings: RankedFinishSettings; participants: RankedFinishInvite[]; templateSlug: string }) {
  const definition = templateFor(templateSlug);
  if (settings.templateSlug !== definition.slug) throw new Error("Selected pool settings do not match the template.");
  const user = await ensureUser(); const admin = createSupabaseAdminClient(); const canonical = await canonicalizeRankedFinishSettings(admin, settings, definition);
  const validation = validateRankedFinishSettings(canonical); if (validation) throw new Error(validation);
  const [template, poolSlug] = await Promise.all([ensureTemplate(admin, canonical), buildPoolSlug(admin, canonical.basics.poolName)]);
  const { data: pool, error } = await admin.from("pools").insert({ owner_id: user.id, template_version_id: template.templateVersionId, slug: poolSlug, name: canonical.basics.poolName.trim(), status: "open", settings: { rankedFinish: canonical } }).select("id,slug,name").single(); if (error) throw new Error(error.message);
  const poolId = String(pool.id); const { error: memberError } = await admin.from("pool_members").upsert({ pool_id: poolId, user_id: user.id, role: "owner" }, { onConflict: "pool_id,user_id" }); if (memberError) throw new Error(memberError.message);
  const expiresAt = new Date(canonical.basics.picksLockAt).toISOString(); const invites = normalizedInvites(participants); const rows = [{ pool_id: poolId, code: inviteCode(), email: null, display_name: "Signup link", expires_at: expiresAt }, ...invites.map((invite) => ({ pool_id: poolId, code: inviteCode(), email: invite.email, display_name: invite.displayName, expires_at: expiresAt }))];
  const { data: insertedInvites, error: inviteError } = await admin.from("pool_invites").insert(rows).select("code,email,display_name"); if (inviteError) throw new Error(inviteError.message);
  const signup = (insertedInvites ?? []).find((invite) => !invite.email); revalidatePath("/dashboard"); revalidatePath("/dashboard/pools");
  return { poolId, poolSlug: String(pool.slug), poolName: String(pool.name), poolHref: `/pools/${pool.slug}`, signupInviteLink: { code: String(signup?.code), href: `/join/${signup?.code}` }, inviteLinks: (insertedInvites ?? []).filter((invite) => invite.email).map((invite) => ({ email: String(invite.email), displayName: String(invite.display_name), href: `/join/${invite.code}` })) };
}

export async function publishF1RankedFinishPool(input: { settings: RankedFinishSettings; participants: RankedFinishInvite[] }) {
  return publishRankedFinishPool({ ...input, templateSlug: F1_GRAND_PRIX_TEMPLATE_SLUG });
}

export async function publishGolfRankedFinishPool(input: { settings: RankedFinishSettings; participants: RankedFinishInvite[] }) {
  return publishRankedFinishPool({ ...input, templateSlug: GOLF_PGA_TOP_FIVE_TEMPLATE_SLUG });
}

function itemPayload(items: unknown): RankedFinishPickPayload {
  const markets: Record<string, string[]> = {};
  for (const item of Array.isArray(items) ? items : []) { const value = item && typeof item === "object" ? (item as { value?: unknown }).value : undefined; if (!value || typeof value !== "object") continue; const pick = value as { marketId?: unknown; position?: unknown; competitorId?: unknown }; if (typeof pick.marketId !== "string" || !Number.isInteger(pick.position) || typeof pick.competitorId !== "string") continue; const entries = markets[pick.marketId] ?? []; entries[Number(pick.position) - 1] = pick.competitorId; markets[pick.marketId] = entries; }
  return { markets };
}

export async function getRankedFinishJoinPoolData(inviteCodeValue: string, templateSlug: string): Promise<RankedFinishJoinData | null> {
  if (!isSupabaseConfigured()) return null; const admin = createSupabaseAdminClient(); const { data, error } = await admin.from("pool_invites").select("id,code,email,display_name,status,accepted_by,pools(id,slug,name,owner_id,template_version_id,settings)").eq("code", inviteCodeValue).maybeSingle(); if (error || !data) return null;
  const pool = Array.isArray(data.pools) ? data.pools[0] : data.pools; const settings = rankedSettings(pool?.settings, templateSlug); if (!pool || !settings) return null; const user = await getSupabaseUser(); let existingSubmission: RankedFinishJoinData["existingSubmission"];
  if (user) { const { data: entry } = await admin.from("entries").select("id,entry_picks(id,submitted_at,entry_pick_items(value))").eq("pool_id", pool.id).eq("user_id", user.id).eq("entry_number", 1).maybeSingle(); const pick = Array.isArray(entry?.entry_picks) ? entry?.entry_picks[0] : entry?.entry_picks; if (entry && pick) existingSubmission = { entryId: String(entry.id), entryPickId: String(pick.id), submittedAt: String(pick.submitted_at ?? ""), payload: itemPayload(pick.entry_pick_items) }; }
  return { invite: { id: String(data.id), code: String(data.code), email: String(data.email ?? ""), displayName: String(data.display_name ?? "Participant"), status: String(data.status), acceptedBy: String(data.accepted_by ?? ""), isShareLink: !data.email }, pool: { id: String(pool.id), slug: String(pool.slug), name: String(pool.name), ownerId: String(pool.owner_id), templateVersionId: String(pool.template_version_id), settings }, existingSubmission, deadlineHasPassed: rankedFinishDeadlineHasPassed(settings) };
}

export async function getF1JoinPoolData(inviteCodeValue: string) { return getRankedFinishJoinPoolData(inviteCodeValue, F1_GRAND_PRIX_TEMPLATE_SLUG); }
export async function getGolfJoinPoolData(inviteCodeValue: string) { return getRankedFinishJoinPoolData(inviteCodeValue, GOLF_PGA_TOP_FIVE_TEMPLATE_SLUG); }

export async function submitRankedFinishPicks({ inviteCode: inviteCodeValue, payload, templateSlug }: { inviteCode: string; payload: RankedFinishPickPayload; templateSlug: string }) {
  const user = await ensureUser(); const join = await getRankedFinishJoinPoolData(inviteCodeValue, templateSlug); if (!join) throw new Error("Invite not found.");
  if (join.invite.status === "revoked" || join.invite.status === "expired") throw new Error("This invite is no longer available.");
  if (!join.invite.isShareLink && normalizeEmailAddress(join.invite.email) !== normalizeEmailAddress(user.email)) throw new Error("Sign in with the email address this invite was sent to.");
  const validation = validateRankedFinishPicks(join.pool.settings, payload); if (validation) throw new Error(validation);
  const admin = createSupabaseAdminClient(); const template = await ensureTemplate(admin, join.pool.settings); const items = join.pool.settings.markets.flatMap((market) => payload.markets[market.id].map((competitorId, index) => ({ template_pick_field_id: template.fields.get(`${market.id}_p${index + 1}`), pick_type: "team_bonus", value: { marketId: market.id, position: index + 1, competitorId } })));
  if (items.some((item) => !item.template_pick_field_id)) throw new Error("Pool pick fields are not configured correctly.");
  const submittedAt = new Date().toISOString(); const { data, error } = await admin.rpc("submit_ranked_finish_picks_transaction", { p_pool_id: join.pool.id, p_user_id: user.id, p_template_version_id: join.pool.templateVersionId, p_invite_id: join.invite.id, p_accept_invite: !join.invite.isShareLink, p_display_name: user.user_metadata?.display_name ?? join.invite.displayName ?? user.email?.split("@")[0] ?? "Participant", p_entry_number: 1, p_entry_metadata: { inviteCode: inviteCodeValue }, p_submitted_at: submittedAt, p_pick_items: items, p_invite_code: inviteCodeValue });
  if (error) throw new Error(error.message); const row = Array.isArray(data) ? data[0] : data; if (!row?.entry_id) throw new Error("Picks were not submitted."); revalidatePath(`/pools/${join.pool.slug}`); return { entryId: String(row.entry_id), entryPickId: String(row.entry_pick_id), submittedAt };
}

export async function submitF1RankedFinishPicks(input: { inviteCode: string; payload: RankedFinishPickPayload }) { return submitRankedFinishPicks({ ...input, templateSlug: F1_GRAND_PRIX_TEMPLATE_SLUG }); }
export async function submitGolfRankedFinishPicks(input: { inviteCode: string; payload: RankedFinishPickPayload }) { return submitRankedFinishPicks({ ...input, templateSlug: GOLF_PGA_TOP_FIVE_TEMPLATE_SLUG }); }

async function rebuildStandings({ admin, poolId, settings }: { admin: Admin; poolId: string; settings: RankedFinishSettings }) {
  const { data: entries, error } = await admin.from("entries").select("id,display_name,entry_picks(id,status,submitted_at,entry_pick_items(id,value))").eq("pool_id", poolId); if (error) throw new Error(error.message);
  const scored = (entries ?? []).flatMap((entry) => { const pick = Array.isArray(entry.entry_picks) ? entry.entry_picks[0] : entry.entry_picks; if (!pick || !["submitted", "locked"].includes(String(pick.status))) return []; const items = Array.isArray(pick.entry_pick_items) ? pick.entry_pick_items : []; const score = scoreRankedFinishEntry({ settings, picks: itemPayload(items) }); return [{ entryId: String(entry.id), entryName: String(entry.display_name), total: score.total, maxPoints: score.maxPoints, submittedAt: String(pick.submitted_at ?? ""), lines: score.lines, breakdownRows: score.lines.map((line) => { const [marketId, position] = line.key.split(":"); return { entry_id: entry.id, entry_pick_item_id: items.find((item) => { const value = item.value as { marketId?: string; position?: number }; return value?.marketId === marketId && value?.position === Number(position); })?.id ?? null, points_awarded: line.pointsAwarded, max_points: line.maxPoints, reason: `${line.label}: ${line.reason}` }; }) }]; });
  const rows = rankStandings(scored.map((row) => ({ entryId: row.entryId, entryName: row.entryName, total: row.total, maxPoints: row.maxPoints, submittedAt: row.submittedAt, lines: row.lines })));
  const { error: snapshotError } = await admin.rpc("replace_template_score_snapshot", { p_pool_id: poolId, p_entry_ids: scored.map((row) => row.entryId), p_breakdowns: scored.flatMap((row) => row.breakdownRows), p_rows: rows }); if (snapshotError) throw new Error(snapshotError.message); return rows as RankedFinishStoredLeaderboardRow[];
}

async function audit(admin: Admin, poolId: string, actorId: string, eventType: string, summary: string, metadata: Record<string, unknown>) { const { error } = await admin.from("audit_events").insert({ pool_id: poolId, actor_id: actorId, event_type: eventType, summary, metadata }); if (error) console.error("[fy-pools] Failed to record ranked-finish audit event", error); }

export async function recordRankedFinishPoolResult({ poolId, marketId, competitorId, templateSlug }: { poolId: string; marketId: string; competitorId: string; templateSlug: string }) {
  const user = await ensureUser(); const admin = createSupabaseAdminClient(); const { data: pool, error } = await admin.from("pools").select("id,owner_id,slug,settings").eq("id", poolId).single(); if (error) throw new Error(error.message); if (String(pool.owner_id) !== user.id) throw new Error("Only the pool commissioner can enter results."); const settings = rankedSettings(pool.settings, templateSlug); if (!settings) throw new Error("Ranked-finish settings were not found.");
  const nextSettings = recordRankedFinishResult({ settings, marketId, competitorId }); const { error: updateError } = await admin.from("pools").update({ settings: { rankedFinish: nextSettings }, updated_at: new Date().toISOString() }).eq("id", poolId); if (updateError) throw new Error(updateError.message); const rows = await rebuildStandings({ admin, poolId, settings: nextSettings }); await audit(admin, poolId, user.id, "ranked_finish.result_recorded", `Recorded ${marketId} result.`, { marketId, competitorId }); revalidatePath(`/pools/${pool.slug}`); revalidatePath(`/pools/${pool.slug}/leaderboard`); revalidatePath(`/dashboard/pools/${poolId}/edit`); return { settings: nextSettings, rows };
}

export async function resetRankedFinishPoolResults(poolId: string, templateSlug: string) {
  const user = await ensureUser(); const admin = createSupabaseAdminClient(); const { data: pool, error } = await admin.from("pools").select("id,owner_id,slug,settings").eq("id", poolId).single(); if (error) throw new Error(error.message); if (String(pool.owner_id) !== user.id) throw new Error("Only the pool commissioner can reset results."); const settings = rankedSettings(pool.settings, templateSlug); if (!settings) throw new Error("Ranked-finish settings were not found.");
  const nextSettings = resetRankedFinishResults(settings); const { error: updateError } = await admin.from("pools").update({ settings: { rankedFinish: nextSettings }, updated_at: new Date().toISOString() }).eq("id", poolId); if (updateError) throw new Error(updateError.message); const rows = await rebuildStandings({ admin, poolId, settings: nextSettings }); await audit(admin, poolId, user.id, "ranked_finish.results_reset", "Reset ranked-finish results.", {}); revalidatePath(`/pools/${pool.slug}`); revalidatePath(`/pools/${pool.slug}/leaderboard`); revalidatePath(`/dashboard/pools/${poolId}/edit`); return { settings: nextSettings, rows };
}

export async function recordF1Result(input: { poolId: string; marketId: string; competitorId: string }) { return recordRankedFinishPoolResult({ ...input, templateSlug: F1_GRAND_PRIX_TEMPLATE_SLUG }); }
export async function recordGolfResult(input: { poolId: string; marketId: string; competitorId: string }) { return recordRankedFinishPoolResult({ ...input, templateSlug: GOLF_PGA_TOP_FIVE_TEMPLATE_SLUG }); }
export async function resetF1Results(poolId: string) { return resetRankedFinishPoolResults(poolId, F1_GRAND_PRIX_TEMPLATE_SLUG); }
export async function resetGolfResults(poolId: string) { return resetRankedFinishPoolResults(poolId, GOLF_PGA_TOP_FIVE_TEMPLATE_SLUG); }

export async function getPublicRankedFinishPool(poolSlug: string, templateSlug: string): Promise<RankedFinishPublicPool | null> {
  if (!isSupabaseConfigured()) return null; const admin = createSupabaseAdminClient(); const { data: pool, error } = await admin.from("pools").select("id,slug,name,settings").eq("slug", poolSlug).maybeSingle(); if (error || !pool) return null; const settings = rankedSettings(pool.settings, templateSlug); if (!settings) return null;
  const [{ data: entries, error: entriesError }, { data: snapshot }] = await Promise.all([admin.from("entries").select("id,display_name,entry_picks(status,submitted_at)").eq("pool_id", pool.id), admin.from("standings_snapshots").select("rows,calculated_at").eq("pool_id", pool.id).order("calculated_at", { ascending: false }).limit(1).maybeSingle()]); if (entriesError) throw new Error(entriesError.message);
  return { poolId: String(pool.id), poolSlug: String(pool.slug), poolName: String(pool.name), settings, entries: (entries ?? []).flatMap((entry) => { const pick = Array.isArray(entry.entry_picks) ? entry.entry_picks[0] : entry.entry_picks; return pick && ["submitted", "locked"].includes(String(pick.status)) ? [{ entryId: String(entry.id), entryName: String(entry.display_name), submittedAt: String(pick.submitted_at ?? "") }] : []; }), latestStandings: Array.isArray(snapshot?.rows) ? snapshot.rows as RankedFinishStoredLeaderboardRow[] : [], latestStandingsCalculatedAt: String(snapshot?.calculated_at ?? "") };
}

export async function getPublicF1Pool(poolSlug: string) { return getPublicRankedFinishPool(poolSlug, F1_GRAND_PRIX_TEMPLATE_SLUG); }
export async function getPublicGolfPool(poolSlug: string) { return getPublicRankedFinishPool(poolSlug, GOLF_PGA_TOP_FIVE_TEMPLATE_SLUG); }

export async function getCommissionerRankedFinishPool(poolId: string, templateSlug: string) {
  const user = await ensureUser(); const admin = createSupabaseAdminClient(); const { data: pool, error } = await admin.from("pools").select("id,slug,name,owner_id,settings").eq("id", poolId).maybeSingle(); if (error || !pool) return null; if (String(pool.owner_id) !== user.id) throw new Error("Only the pool commissioner can view this pool."); const settings = rankedSettings(pool.settings, templateSlug); return settings ? { poolId: String(pool.id), poolSlug: String(pool.slug), poolName: String(pool.name), settings } : null;
}

export async function getCommissionerF1Pool(poolId: string) { return getCommissionerRankedFinishPool(poolId, F1_GRAND_PRIX_TEMPLATE_SLUG); }
export async function getCommissionerGolfPool(poolId: string) { return getCommissionerRankedFinishPool(poolId, GOLF_PGA_TOP_FIVE_TEMPLATE_SLUG); }

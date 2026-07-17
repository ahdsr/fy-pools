import "server-only";

import { createHash } from "node:crypto";

import { fetchF1JolpicaCatalog } from "@/lib/events/f1-jolpica";
import { fetchEspnNbaPlayoffCatalog } from "@/lib/events/nba-espn";
import { fetchEspnPgaCatalog } from "@/lib/events/pga-espn";
import { fetchEspnAtpCatalog } from "@/lib/events/tennis-espn";
import {
  type CatalogEvent,
  type CatalogEventSnapshot,
  withSnapshotFreshness,
} from "@/lib/events/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseAdminClient, getSupabaseUser } from "@/lib/supabase/server";

const SNAPSHOT_TTL_MS = 36 * 60 * 60 * 1000;

type SnapshotRow = {
  provider: string;
  event_external_id: string;
  event_payload: CatalogEvent;
  source_signature: string;
  fetched_at: string;
  expires_at: string;
};

function expiryFrom(fetchedAt: string) {
  return new Date(Date.parse(fetchedAt) + SNAPSHOT_TTL_MS).toISOString();
}

/** A review token must describe one event, not the whole provider response. */
export function catalogEventSignature(event: CatalogEvent) {
  return createHash("sha256").update(JSON.stringify(event)).digest("hex");
}

function asSnapshot(row: SnapshotRow, now = new Date()): CatalogEventSnapshot {
  return withSnapshotFreshness(row.event_payload, {
    fetchedAt: row.fetched_at,
    sourceSignature: row.source_signature,
    expiresAt: row.expires_at,
    now,
  });
}

export async function syncF1EventCatalogToDatabase({
  season,
  now = new Date(),
}: {
  season?: string;
  now?: Date;
} = {}) {
  const catalog = await fetchF1JolpicaCatalog({ season });
  return storeCatalogEvents(catalog, now);
}

async function storeCatalogEvents(
  catalog: { season: string; events: CatalogEvent[]; sourceSignature: string },
  now: Date,
) {
  const fetchedAt = now.toISOString();
  const expiresAt = expiryFrom(fetchedAt);
  const admin = createSupabaseAdminClient();
  const rows = catalog.events.map((event) => ({
    provider: event.provider,
    sport_slug: event.sportSlug,
    competition_slug: event.competitionSlug,
    season_slug: event.seasonSlug,
    event_external_id: event.externalId,
    event_payload: event,
    readiness: event.readiness,
    source_signature: catalogEventSignature(event),
    fetched_at: fetchedAt,
    expires_at: expiresAt,
    last_error: null,
    updated_at: fetchedAt,
  }));
  const { error } = await admin
    .from("event_catalog_snapshots")
    .upsert(rows, { onConflict: "provider,event_external_id" });
  if (error) throw new Error(`Could not store event catalog: ${error.message}`);
  return {
    ...catalog,
    fetchedAt,
    expiresAt,
    snapshots: catalog.events.map((event) =>
      withSnapshotFreshness(event, {
        fetchedAt,
        sourceSignature: catalogEventSignature(event),
        expiresAt,
        now,
      }),
    ),
  };
}

export async function syncNbaPlayoffCatalogToDatabase({
  season,
  now = new Date(),
}: {
  season?: string;
  now?: Date;
} = {}) {
  return storeCatalogEvents(await fetchEspnNbaPlayoffCatalog({ season }), now);
}

export async function syncPgaEventCatalogToDatabase({
  season,
  now = new Date(),
}: {
  season?: string;
  now?: Date;
} = {}) {
  return storeCatalogEvents(await fetchEspnPgaCatalog({ season }), now);
}

export async function syncAtpEventCatalogToDatabase({
  season,
  now = new Date(),
}: {
  season?: string;
  now?: Date;
} = {}) {
  return storeCatalogEvents(await fetchEspnAtpCatalog({ season }), now);
}

export async function refreshF1EventCatalogForCommissioner(season?: string) {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");
  const user = await getSupabaseUser();
  if (!user) throw new Error("You must be signed in.");
  return syncF1EventCatalogToDatabase({ season });
}

export async function refreshNbaPlayoffCatalogForCommissioner(season?: string) {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");
  const user = await getSupabaseUser();
  if (!user) throw new Error("You must be signed in.");
  return syncNbaPlayoffCatalogToDatabase({ season });
}

export async function refreshPgaEventCatalogForCommissioner(season?: string) {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");
  const user = await getSupabaseUser();
  if (!user) throw new Error("You must be signed in.");
  return syncPgaEventCatalogToDatabase({ season });
}

export async function refreshAtpEventCatalogForCommissioner(season?: string) {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");
  const user = await getSupabaseUser();
  if (!user) throw new Error("You must be signed in.");
  return syncAtpEventCatalogToDatabase({ season });
}

async function getCatalogSnapshots({
  provider,
  competitionSlug,
  now = new Date(),
}: {
  provider: string;
  competitionSlug: string;
  now?: Date;
}) {
  if (!isSupabaseConfigured()) return [] as CatalogEventSnapshot[];
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("event_catalog_snapshots")
    .select("provider,event_external_id,event_payload,source_signature,fetched_at,expires_at")
    .eq("provider", provider)
    .eq("competition_slug", competitionSlug)
    .order("event_external_id");
  if (error) throw new Error(`Could not load event catalog: ${error.message}`);
  return (data ?? [])
    .map((row) => asSnapshot(row as SnapshotRow, now))
    .sort((left, right) => (left.startsAt ?? "").localeCompare(right.startsAt ?? ""));
}

export async function getF1EventCatalogSnapshots(now = new Date()) {
  return getCatalogSnapshots({ provider: "jolpica", competitionSlug: "formula-1", now });
}

export async function getNbaPlayoffCatalogSnapshots(now = new Date()) {
  return getCatalogSnapshots({ provider: "espn", competitionSlug: "nba-playoffs", now });
}

export async function getPgaEventCatalogSnapshots(now = new Date()) {
  return getCatalogSnapshots({ provider: "espn", competitionSlug: "pga-tour", now });
}

export async function getAtpEventCatalogSnapshots(now = new Date()) {
  return getCatalogSnapshots({ provider: "espn", competitionSlug: "atp-tour", now });
}

export function selectUpcomingCatalogEvents(
  events: CatalogEventSnapshot[],
  now = new Date(),
) {
  const active = events.filter((event) => !event.startsAt || Date.parse(event.startsAt) >= now.getTime() - 24 * 60 * 60 * 1000);
  return active.length ? active : events.slice(-3);
}

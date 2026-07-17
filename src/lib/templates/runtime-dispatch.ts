import "server-only";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  getPoolTemplateRuntime,
  getRankedFinishSettings,
} from "@/lib/templates/lifecycle";

export type PoolRuntimeTarget =
  | { runtime: "round-of-16" }
  | { runtime: "nba-series" }
  | {
      runtime: "ranked-finish";
      templateSlug: string;
      templateName: string;
      templateDescription: string;
      eventNoun: string;
      competitorNoun: string;
      lockLabel: string;
    };

type PersistedTemplateVersion = {
  slug: unknown;
  name: unknown;
  description: unknown;
  config: unknown;
};

type RankedFinishRuntimeMetadata = {
  eventNoun: string;
  competitorNoun: string;
  lockLabel: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asTemplateVersion(value: unknown): PersistedTemplateVersion | null {
  const version = Array.isArray(value) ? value[0] : value;
  const record = asRecord(version);
  if (!record) return null;

  return {
    slug: record.slug,
    name: record.name,
    description: record.description,
    config: record.config,
  };
}

function getRankedFinishRuntimeMetadata(
  config: unknown,
): RankedFinishRuntimeMetadata | null {
  const templateConfig = asRecord(config);
  const rankedFinish = asRecord(templateConfig?.rankedFinish);
  if (
    templateConfig?.runtime !== "ranked-finish" ||
    !rankedFinish ||
    typeof rankedFinish.eventNoun !== "string" ||
    typeof rankedFinish.competitorNoun !== "string" ||
    typeof rankedFinish.lockLabel !== "string"
  ) {
    return null;
  }

  return {
    eventNoun: rankedFinish.eventNoun,
    competitorNoun: rankedFinish.competitorNoun,
    lockLabel: rankedFinish.lockLabel,
  };
}

/**
 * Determines a pool's runtime from its persisted settings envelope and
 * immutable template version. Routes use this once, then load exactly the
 * matching runtime rather than probing every installed template implementation.
 */
export function resolvePoolRuntimeTarget(
  settings: unknown,
  persistedTemplateVersion?: unknown,
): PoolRuntimeTarget | null {
  const runtime = getPoolTemplateRuntime(settings);
  if (runtime === "round-of-16" || runtime === "nba-series") return { runtime };
  if (runtime !== "ranked-finish") return null;

  const rankedFinish = getRankedFinishSettings(settings);
  const template = asTemplateVersion(persistedTemplateVersion);
  const metadata = template && getRankedFinishRuntimeMetadata(template.config);
  if (
    !rankedFinish ||
    !template ||
    !metadata ||
    typeof template.slug !== "string" ||
    template.slug !== rankedFinish.templateSlug ||
    typeof template.name !== "string" ||
    typeof template.description !== "string"
  ) {
    return null;
  }

  return {
    runtime,
    templateSlug: template.slug,
    templateName: template.name,
    templateDescription: template.description,
    ...metadata,
  };
}

async function getPoolRuntimeTarget(
  column: "id" | "slug",
  value: string,
): Promise<PoolRuntimeTarget | null> {
  if (!isSupabaseConfigured()) return null;
  if (column === "id" && !UUID_PATTERN.test(value)) return null;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("pools")
    .select("settings,template_versions(slug,name,description,config)")
    .eq(column, value)
    .maybeSingle();
  if (error) {
    console.error("[fy-pools] Failed to resolve pool runtime", {
      column,
      error,
    });
    throw new Error("Pool runtime lookup failed.");
  }
  if (!data) return null;
  return resolvePoolRuntimeTarget(data.settings, data.template_versions);
}

export function getPoolRuntimeTargetById(poolId: string) {
  return getPoolRuntimeTarget("id", poolId);
}

export function getPoolRuntimeTargetBySlug(poolSlug: string) {
  return getPoolRuntimeTarget("slug", poolSlug);
}

export async function getInviteRuntimeTarget(inviteCode: string) {
  if (!isSupabaseConfigured()) return null;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("pool_invites")
    .select("pools(settings,template_versions(slug,name,description,config))")
    .eq("code", inviteCode)
    .maybeSingle();
  if (error) {
    console.error("[fy-pools] Failed to resolve invite runtime", { error });
    throw new Error("Invite runtime lookup failed.");
  }
  if (!data) return null;
  const pool = Array.isArray(data.pools) ? data.pools[0] : data.pools;
  return resolvePoolRuntimeTarget(pool?.settings, pool?.template_versions);
}

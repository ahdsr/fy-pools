import "server-only";

import { getRankedFinishTemplate } from "@/lib/ranked-finish/templates";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  getPoolTemplateRuntime,
  getRankedFinishSettings,
  type PoolTemplateRuntime,
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

/**
 * Determines a pool's runtime from its persisted settings envelope. Routes use
 * this once, then load exactly the matching runtime's data rather than probing
 * every installed template implementation.
 */
export function resolvePoolRuntimeTarget(settings: unknown): PoolRuntimeTarget | null {
  const runtime = getPoolTemplateRuntime(settings);
  if (runtime === "round-of-16" || runtime === "nba-series") return { runtime };
  if (runtime !== "ranked-finish") return null;

  const rankedFinish = getRankedFinishSettings(settings);
  const template = rankedFinish && getRankedFinishTemplate(rankedFinish.templateSlug);
  if (!template) return null;

  return {
    runtime,
    templateSlug: template.slug,
    templateName: template.name,
    templateDescription: template.description,
    eventNoun: template.eventNoun,
    competitorNoun: template.competitorNoun,
    lockLabel: template.lockLabel,
  };
}

async function getPoolRuntimeTarget(
  column: "id" | "slug",
  value: string,
): Promise<PoolRuntimeTarget | null> {
  if (!isSupabaseConfigured()) return null;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("pools")
    .select("settings")
    .eq(column, value)
    .maybeSingle();
  if (error || !data) return null;
  return resolvePoolRuntimeTarget(data.settings);
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
    .select("pools(settings)")
    .eq("code", inviteCode)
    .maybeSingle();
  if (error || !data) return null;
  const pool = Array.isArray(data.pools) ? data.pools[0] : data.pools;
  return resolvePoolRuntimeTarget(pool?.settings);
}

export function isRuntimeTarget(
  target: PoolRuntimeTarget | null,
  runtime: PoolTemplateRuntime,
) {
  return target?.runtime === runtime;
}

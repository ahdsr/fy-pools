import "server-only";

import type { User } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

function metadataText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function displayNameForAuthUser(user: User, fallbackEmail?: string) {
  const metadataName =
    metadataText(user.user_metadata?.display_name) ??
    metadataText(user.user_metadata?.full_name) ??
    metadataText(user.user_metadata?.name);

  if (metadataName) return metadataName;

  const email = fallbackEmail ?? user.email ?? "";
  return email.split("@")[0] || "PoolWaffle user";
}

export async function upsertProfile(userId: string, displayName: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("profiles").upsert({
    id: userId,
    display_name: displayName,
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);
}

export async function ensureProfileForAuthUser(
  user: User,
  fallbackEmail?: string,
) {
  const admin = createSupabaseAdminClient();
  const displayName = displayNameForAuthUser(user, fallbackEmail);

  const { data: existing, error: readError } = await admin
    .from("profiles")
    .select("id, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) throw new Error(readError.message);

  if (existing) {
    if (!existing.display_name) {
      const { error } = await admin
        .from("profiles")
        .update({
          display_name: displayName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw new Error(error.message);
    }

    return;
  }

  const { error } = await admin.from("profiles").insert({
    id: user.id,
    display_name: displayName,
  });

  if (error && error.code !== "23505") throw new Error(error.message);
}

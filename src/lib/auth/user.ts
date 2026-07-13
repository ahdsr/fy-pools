export type AuthUser = {
  name: string;
  email: string;
  role: string;
};

type SupabaseAuthUser = {
  email?: string;
  user_metadata?: {
    display_name?: unknown;
    full_name?: unknown;
    name?: unknown;
  };
};

function metadataText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function authUserFromSupabase(
  user: SupabaseAuthUser | null | undefined,
): AuthUser | null {
  if (!user?.email) return null;

  return {
    name:
      metadataText(user.user_metadata?.display_name) ??
      metadataText(user.user_metadata?.full_name) ??
      metadataText(user.user_metadata?.name) ??
      user.email.split("@")[0] ??
      "Pool user",
    email: user.email,
    role: "Pool user",
  };
}

import { safeNextPath } from "@/lib/auth/paths";

export function authCallbackUrlFor(origin: string, nextPath: string) {
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", safeNextPath(nextPath));

  return callbackUrl.toString();
}

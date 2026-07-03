export const DEFAULT_AUTH_REDIRECT = "/dashboard";

export function safeNextPath(
  value: FormDataEntryValue | string | null | undefined,
) {
  const nextPath = typeof value === "string" ? value : "";

  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return DEFAULT_AUTH_REDIRECT;
  }

  try {
    const url = new URL(nextPath, "https://poolwaffle.local");

    if (
      url.origin !== "https://poolwaffle.local" ||
      url.pathname === "/sign-in" ||
      url.pathname === "/sign-up" ||
      url.pathname === "/auth/callback"
    ) {
      return DEFAULT_AUTH_REDIRECT;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_AUTH_REDIRECT;
  }
}

export function signInPathFor(nextPath: string) {
  const safePath = safeNextPath(nextPath);

  return safePath === DEFAULT_AUTH_REDIRECT
    ? "/sign-in"
    : `/sign-in?next=${encodeURIComponent(safePath)}`;
}

export function signUpPathFor(nextPath: string) {
  const safePath = safeNextPath(nextPath);

  return safePath === DEFAULT_AUTH_REDIRECT
    ? "/sign-up"
    : `/sign-up?next=${encodeURIComponent(safePath)}`;
}

export function forgotPasswordPathFor(nextPath: string) {
  const safePath = safeNextPath(nextPath);

  return safePath === DEFAULT_AUTH_REDIRECT
    ? "/forgot-password"
    : `/forgot-password?next=${encodeURIComponent(safePath)}`;
}

export function resetPasswordPathFor(nextPath: string) {
  const safePath = safeNextPath(nextPath);

  return safePath === DEFAULT_AUTH_REDIRECT
    ? "/reset-password"
    : `/reset-password?next=${encodeURIComponent(safePath)}`;
}

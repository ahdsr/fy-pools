import { postAuthRedirectPath } from "@/lib/auth/paths";

function appBasePath() {
  const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
  const pathWithoutSlashes = configuredBasePath.replace(/^\/+|\/+$/g, "");

  return pathWithoutSlashes ? `/${pathWithoutSlashes}` : "";
}

export function authAppPathFor(path: string) {
  const appPath = path.startsWith("/") ? path : `/${path}`;

  return `${appBasePath()}${appPath}`;
}

export function authCallbackPath() {
  return authAppPathFor("/auth/callback");
}

export function authCallbackUrlFor(origin: string, nextPath: string) {
  const callbackUrl = new URL(authCallbackPath(), origin);
  callbackUrl.searchParams.set("next", postAuthRedirectPath(nextPath));

  return callbackUrl.toString();
}

export function authAppUrlFor(origin: string, path: string) {
  return new URL(authAppPathFor(path), origin).toString();
}

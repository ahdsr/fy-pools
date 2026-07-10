import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath, signInPathFor } from "@/lib/auth/paths";
import { getSupabaseConfig } from "@/lib/supabase/config";

export function isProtectedDashboardPath(pathname: string) {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

export function isGuestOnlyAuthPath(pathname: string) {
  return pathname === "/sign-in" || pathname === "/sign-up";
}

function copySessionCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  return to;
}

function redirectWithSessionCookies(
  request: NextRequest,
  pathname: string,
  response: NextResponse,
) {
  return copySessionCookies(
    response,
    NextResponse.redirect(new URL(pathname, request.url)),
  );
}

export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });
  const protectedDashboardPath = isProtectedDashboardPath(
    request.nextUrl.pathname,
  );
  const guestOnlyAuthPath = isGuestOnlyAuthPath(request.nextUrl.pathname);

  if (!protectedDashboardPath && !guestOnlyAuthPath) {
    return response;
  }

  try {
    const { url, anonKey } = getSupabaseConfig();
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (protectedDashboardPath && !user) {
      return redirectWithSessionCookies(
        request,
        signInPathFor(`${request.nextUrl.pathname}${request.nextUrl.search}`),
        response,
      );
    }

    if (guestOnlyAuthPath && user) {
      return redirectWithSessionCookies(
        request,
        safeNextPath(request.nextUrl.searchParams.get("next")),
        response,
      );
    }
  } catch {
    if (protectedDashboardPath) {
      return redirectWithSessionCookies(
        request,
        signInPathFor(`${request.nextUrl.pathname}${request.nextUrl.search}`),
        response,
      );
    }
  }

  return response;
}

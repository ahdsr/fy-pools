import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { signInPathFor } from "@/lib/auth/paths";
import { getSupabaseConfig } from "@/lib/supabase/config";

function isProtectedDashboardPath(pathname: string) {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

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

    if (!user && isProtectedDashboardPath(request.nextUrl.pathname)) {
      return NextResponse.redirect(
        new URL(
          signInPathFor(`${request.nextUrl.pathname}${request.nextUrl.search}`),
          request.url,
        ),
      );
    }
  } catch {
    if (isProtectedDashboardPath(request.nextUrl.pathname)) {
      return NextResponse.redirect(
        new URL(
          signInPathFor(`${request.nextUrl.pathname}${request.nextUrl.search}`),
          request.url,
        ),
      );
    }

    return response;
  }

  return response;
}

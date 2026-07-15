import { NextResponse, type NextRequest } from "next/server";

import { authAppUrlFor } from "@/lib/auth/callback";
import { postAuthRedirectPath, signInErrorPathFor } from "@/lib/auth/paths";
import {
  PENDING_CONFIRMATION_EMAIL_COOKIE,
  PENDING_CONFIRMATION_NEXT_COOKIE,
} from "@/lib/auth/confirmation";
import { ensureProfileForAuthUser } from "@/lib/auth/profiles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = postAuthRedirectPath(requestUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(
      authAppUrlFor(requestUrl.origin, signInErrorPathFor(next)),
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      return NextResponse.redirect(
        authAppUrlFor(requestUrl.origin, signInErrorPathFor(next)),
      );
    }

    await ensureProfileForAuthUser(data.user);
  } catch {
    return NextResponse.redirect(
      authAppUrlFor(requestUrl.origin, signInErrorPathFor(next)),
    );
  }

  const response = NextResponse.redirect(authAppUrlFor(requestUrl.origin, next));
  response.cookies.delete(PENDING_CONFIRMATION_EMAIL_COOKIE);
  response.cookies.delete(PENDING_CONFIRMATION_NEXT_COOKIE);

  return response;
}

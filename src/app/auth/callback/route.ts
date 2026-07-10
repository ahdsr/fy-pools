import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath, signInErrorPathFor } from "@/lib/auth/paths";
import { ensureProfileForAuthUser } from "@/lib/auth/profiles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(
      new URL(signInErrorPathFor(next), requestUrl.origin),
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      return NextResponse.redirect(
        new URL(signInErrorPathFor(next), requestUrl.origin),
      );
    }

    await ensureProfileForAuthUser(data.user);
  } catch {
    return NextResponse.redirect(
      new URL(signInErrorPathFor(next), requestUrl.origin),
    );
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}

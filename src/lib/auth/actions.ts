"use server";

import { redirect } from "next/navigation";

import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/paths";

export type AuthActionState = {
  message?: string;
};

async function upsertProfile(userId: string, displayName: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("profiles").upsert({
    id: userId,
    display_name: displayName,
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);
}

export async function signInWithPasswordAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextPath = safeNextPath(formData.get("next"));

  if (!email || !password) {
    return { message: "Email and password are required." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { message: error.message };
    }
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "Sign in is not available right now.",
    };
  }

  redirect(nextPath);
}

export async function signUpWithPasswordAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextPath = safeNextPath(formData.get("next"));
  let shouldRedirect = false;

  if (!name || !email || !password) {
    return { message: "Name, email, and password are required." };
  }

  if (password.length < 6) {
    return { message: "Password must be at least 6 characters." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name,
        },
      },
    });

    if (error) {
      return { message: error.message };
    }

    if (data.user) {
      await upsertProfile(data.user.id, name);
    }

    shouldRedirect = Boolean(data.session);
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "Account creation is not available right now.",
    };
  }

  if (shouldRedirect) {
    redirect(nextPath);
  }

  return {
    message:
      "Account created. Check your email to confirm it, then sign in to continue.",
  };
}

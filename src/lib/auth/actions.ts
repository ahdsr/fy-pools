"use server";

import { redirect } from "next/navigation";

import { authCallbackUrlFor } from "@/lib/auth/callback";
import { resetPasswordPathFor, safeNextPath } from "@/lib/auth/paths";
import {
  ensureProfileForAuthUser,
  upsertProfile,
} from "@/lib/auth/profiles";
import { getAppSiteUrl } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthActionState = {
  message?: string;
};

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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { message: error.message };
    }

    if (data.user) {
      await ensureProfileForAuthUser(data.user, email);
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

  if (password.length < 8) {
    return { message: "Password must be at least 8 characters." };
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
        emailRedirectTo: authCallbackUrlFor(getAppSiteUrl(), nextPath),
      },
    });

    if (error) {
      return { message: error.message };
    }

    if (data.session && data.user) {
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

  redirect("/sign-up/check-email");
}

export async function requestPasswordResetAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const nextPath = safeNextPath(formData.get("next"));

  if (!email) {
    return { message: "Email is required." };
  }

  try {
    const origin = getAppSiteUrl();
    const callbackUrl = new URL("/auth/callback", origin);
    callbackUrl.searchParams.set("next", resetPasswordPathFor(nextPath));

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: callbackUrl.toString(),
    });

    if (error) {
      return { message: error.message };
    }
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "Password recovery is not available right now.",
    };
  }

  return {
    message:
      "If an account exists for that email, a password reset link has been sent.",
  };
}

export async function updatePasswordAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const nextPath = safeNextPath(formData.get("next"));

  if (!password || !confirmPassword) {
    return { message: "Password and confirmation are required." };
  }

  if (password.length < 8) {
    return { message: "Password must be at least 8 characters." };
  }

  if (password !== confirmPassword) {
    return { message: "Passwords do not match." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.updateUser({ password });

    if (error) {
      return { message: error.message };
    }

    if (data.user) {
      await ensureProfileForAuthUser(data.user);
    }
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "Password could not be updated right now.",
    };
  }

  redirect(nextPath);
}

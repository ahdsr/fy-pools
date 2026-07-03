"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { resetPasswordPathFor, safeNextPath } from "@/lib/auth/paths";
import {
  ensureProfileForAuthUser,
  upsertProfile,
} from "@/lib/auth/profiles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthActionState = {
  message?: string;
};

function isLocalHost(host: string) {
  return host.startsWith("localhost") || host.startsWith("127.0.0.1");
}

async function requestOrigin() {
  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";
  const forwardedProtocol = headerStore.get("x-forwarded-proto");
  const protocol = forwardedProtocol ?? (isLocalHost(host) ? "http" : "https");

  return host ? `${protocol}://${host}` : "https://fy-pools.vercel.app";
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

  return {
    message:
      "Account created. Check your email to confirm it, then sign in to continue.",
  };
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
    const origin = await requestOrigin();
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

  if (password.length < 6) {
    return { message: "Password must be at least 6 characters." };
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

"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { authCallbackUrlFor } from "@/lib/auth/callback";
import {
  AUTH_MESSAGES,
  logAuthActionFailure,
  messageForAuthActionFailure,
} from "@/lib/auth/action-feedback";
import {
  PENDING_CONFIRMATION_EMAIL_COOKIE,
  PENDING_CONFIRMATION_NEXT_COOKIE,
  pendingConfirmationCookieOptions,
} from "@/lib/auth/confirmation";
import {
  postAuthRedirectPath,
  resetPasswordPathFor,
  safeNextPath,
} from "@/lib/auth/paths";
import {
  ensureProfileForAuthUser,
  upsertProfile,
} from "@/lib/auth/profiles";
import { getAppSiteUrl } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthActionState = {
  message?: string;
};

async function rememberPendingConfirmation(email: string, nextPath: string) {
  const cookieStore = await cookies();
  cookieStore.set(
    PENDING_CONFIRMATION_EMAIL_COOKIE,
    email,
    pendingConfirmationCookieOptions,
  );
  cookieStore.set(
    PENDING_CONFIRMATION_NEXT_COOKIE,
    nextPath,
    pendingConfirmationCookieOptions,
  );
}

async function clearPendingConfirmation() {
  const cookieStore = await cookies();
  cookieStore.delete(PENDING_CONFIRMATION_EMAIL_COOKIE);
  cookieStore.delete(PENDING_CONFIRMATION_NEXT_COOKIE);
}

export async function signInWithPasswordAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextPath = postAuthRedirectPath(formData.get("next"));

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
      logAuthActionFailure("sign-in", error);
      return { message: messageForAuthActionFailure("sign-in", error) };
    }

    if (data.user) {
      await ensureProfileForAuthUser(data.user, email);
    }
  } catch (error) {
    logAuthActionFailure("sign-in", error);
    return {
      message: messageForAuthActionFailure("sign-in", error),
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
  const nextPath = postAuthRedirectPath(formData.get("next"));
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
      logAuthActionFailure("sign-up", error);
      return { message: messageForAuthActionFailure("sign-up", error) };
    }

    if (data.session && data.user) {
      await upsertProfile(data.user.id, name);
    }

    shouldRedirect = Boolean(data.session);
  } catch (error) {
    logAuthActionFailure("sign-up", error);
    return {
      message: messageForAuthActionFailure("sign-up", error),
    };
  }

  if (shouldRedirect) {
    await clearPendingConfirmation();
    return redirect(nextPath);
  }

  await rememberPendingConfirmation(email, nextPath);
  redirect("/sign-up/check-email");
}

export async function resendConfirmationEmailAction(
  _state: AuthActionState,
  _formData: FormData,
): Promise<AuthActionState> {
  void _state;
  void _formData;

  const cookieStore = await cookies();
  const email = cookieStore.get(PENDING_CONFIRMATION_EMAIL_COOKIE)?.value ?? "";
  const nextPath = postAuthRedirectPath(
    cookieStore.get(PENDING_CONFIRMATION_NEXT_COOKIE)?.value,
  );

  if (!email) {
    return {
      message:
        "Start account creation again with your email address to send a new confirmation link.",
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: authCallbackUrlFor(getAppSiteUrl(), nextPath),
      },
    });

    if (error) {
      logAuthActionFailure("confirmation-resend", error);
    }
  } catch (error) {
    logAuthActionFailure("confirmation-resend", error);
  }

  return {
    message: AUTH_MESSAGES.confirmationResent,
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
    const origin = getAppSiteUrl();
    const callbackUrl = authCallbackUrlFor(
      origin,
      resetPasswordPathFor(nextPath),
    );

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: callbackUrl,
    });

    if (error) {
      logAuthActionFailure("password-reset", error);
      return { message: AUTH_MESSAGES.passwordResetSent };
    }
  } catch (error) {
    logAuthActionFailure("password-reset", error);
    return {
      message: AUTH_MESSAGES.passwordResetSent,
    };
  }

  return {
    message: AUTH_MESSAGES.passwordResetSent,
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
      logAuthActionFailure("password-update", error);
      return {
        message: messageForAuthActionFailure("password-update", error),
      };
    }

    if (data.user) {
      await ensureProfileForAuthUser(data.user);
    }
  } catch (error) {
    logAuthActionFailure("password-update", error);
    return {
      message: messageForAuthActionFailure("password-update", error),
    };
  }

  redirect(nextPath);
}

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookieDelete: vi.fn(),
  cookieGet: vi.fn(),
  cookieSet: vi.fn(),
  cookies: vi.fn(),
  redirect: vi.fn(),
  resend: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  updateUser: vi.fn(),
  upsertProfile: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}));

vi.mock("@/lib/auth/profiles", () => ({
  ensureProfileForAuthUser: vi.fn(),
  upsertProfile: mocks.upsertProfile,
}));

vi.mock("@/lib/supabase/config", () => ({
  getAppSiteUrl: () => "https://fy-pools.vercel.app",
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      resend: mocks.resend,
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
      updateUser: mocks.updateUser,
    },
  }),
}));

import {
  requestPasswordResetAction,
  resendConfirmationEmailAction,
  signInWithPasswordAction,
  signUpWithPasswordAction,
  updatePasswordAction,
} from "@/lib/auth/actions";
import { AUTH_MESSAGES } from "@/lib/auth/action-feedback";
import {
  PENDING_CONFIRMATION_EMAIL_COOKIE,
  PENDING_CONFIRMATION_NEXT_COOKIE,
} from "@/lib/auth/confirmation";

function signUpForm() {
  const formData = new FormData();
  formData.set("name", "Alex Pooler");
  formData.set("email", "alex@example.com");
  formData.set("password", "password123");
  formData.set("next", "/join/demo");
  return formData;
}

describe("password sign-up", () => {
  beforeEach(() => {
    mocks.redirect.mockReset();
    mocks.resend.mockReset();
    mocks.resetPasswordForEmail.mockReset();
    mocks.signInWithPassword.mockReset();
    mocks.signUp.mockReset();
    mocks.updateUser.mockReset();
    mocks.upsertProfile.mockReset();
    mocks.cookieDelete.mockReset();
    mocks.cookieGet.mockReset();
    mocks.cookieSet.mockReset();
    mocks.cookies.mockResolvedValue({
      delete: mocks.cookieDelete,
      get: mocks.cookieGet,
      set: mocks.cookieSet,
    });
  });

  it("sends confirmation-required users to the check-email page with a callback destination", async () => {
    mocks.signUp.mockResolvedValue({
      data: { session: null, user: { id: "user-1" } },
      error: null,
    });

    await signUpWithPasswordAction({}, signUpForm());

    expect(mocks.signUp).toHaveBeenCalledWith({
      email: "alex@example.com",
      password: "password123",
      options: {
        data: { display_name: "Alex Pooler" },
        emailRedirectTo:
          "https://fy-pools.vercel.app/auth/callback?next=%2Fjoin%2Fdemo",
      },
    });
    expect(mocks.upsertProfile).not.toHaveBeenCalled();
    expect(mocks.cookieSet).toHaveBeenCalledWith(
      PENDING_CONFIRMATION_EMAIL_COOKIE,
      "alex@example.com",
      expect.objectContaining({ httpOnly: true, sameSite: "lax" }),
    );
    expect(mocks.cookieSet).toHaveBeenCalledWith(
      PENDING_CONFIRMATION_NEXT_COOKIE,
      "/join/demo",
      expect.objectContaining({ httpOnly: true, sameSite: "lax" }),
    );
    expect(mocks.redirect).toHaveBeenCalledWith("/sign-up/check-email");
  });

  it("creates the profile and redirects immediately when Supabase returns a session", async () => {
    mocks.signUp.mockResolvedValue({
      data: { session: { access_token: "token" }, user: { id: "user-1" } },
      error: null,
    });

    await signUpWithPasswordAction({}, signUpForm());

    expect(mocks.upsertProfile).toHaveBeenCalledWith("user-1", "Alex Pooler");
    expect(mocks.cookieDelete).toHaveBeenCalledWith(
      PENDING_CONFIRMATION_EMAIL_COOKIE,
    );
    expect(mocks.cookieDelete).toHaveBeenCalledWith(
      PENDING_CONFIRMATION_NEXT_COOKIE,
    );
    expect(mocks.redirect).toHaveBeenCalledWith("/join/demo");
  });

  it("resends confirmation using the private pending-signup context", async () => {
    mocks.cookieGet.mockImplementation((name: string) => {
      if (name === PENDING_CONFIRMATION_EMAIL_COOKIE) {
        return { value: "alex@example.com" };
      }

      if (name === PENDING_CONFIRMATION_NEXT_COOKIE) {
        return { value: "/join/demo" };
      }

      return undefined;
    });
    mocks.resend.mockResolvedValue({ error: null });

    await expect(
      resendConfirmationEmailAction({}, new FormData()),
    ).resolves.toEqual({
      message:
        "If this account is waiting for confirmation, we sent a new link. Check your inbox and spam folder in a few minutes.",
    });

    expect(mocks.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "alex@example.com",
      options: {
        emailRedirectTo:
          "https://fy-pools.vercel.app/auth/callback?next=%2Fjoin%2Fdemo",
      },
    });
  });
});

describe("auth action feedback", () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    mocks.cookieDelete.mockReset();
    mocks.cookieGet.mockReset();
    mocks.cookieSet.mockReset();
    mocks.cookies.mockResolvedValue({
      delete: mocks.cookieDelete,
      get: mocks.cookieGet,
      set: mocks.cookieSet,
    });
    mocks.redirect.mockReset();
    mocks.resend.mockReset();
    mocks.resetPasswordForEmail.mockReset();
    mocks.signInWithPassword.mockReset();
    mocks.signUp.mockReset();
    mocks.updateUser.mockReset();
    consoleError.mockClear();
  });

  it("does not expose Supabase sign-in errors", async () => {
    const providerError = {
      message: "Invalid login credentials",
      code: "invalid_credentials",
    };
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: providerError,
    });
    const formData = new FormData();
    formData.set("email", "alex@example.com");
    formData.set("password", "password123");

    await expect(signInWithPasswordAction({}, formData)).resolves.toEqual({
      message: AUTH_MESSAGES.signInInvalid,
    });
    expect(consoleError).toHaveBeenCalledWith("[auth] sign-in failed", {
      code: "invalid_credentials",
      error: providerError,
    });
  });

  it("keeps transport failures out of the sign-in response", async () => {
    const transportError = new TypeError("fetch failed");
    mocks.signInWithPassword.mockRejectedValue(transportError);
    const formData = new FormData();
    formData.set("email", "alex@example.com");
    formData.set("password", "password123");

    await expect(signInWithPasswordAction({}, formData)).resolves.toEqual({
      message: AUTH_MESSAGES.signInUnavailable,
    });
    expect(consoleError).toHaveBeenCalledWith("[auth] sign-in failed", {
      code: undefined,
      error: transportError,
    });
  });

  it("does not expose Supabase sign-up errors", async () => {
    const providerError = {
      message: "User already registered",
      code: "user_already_exists",
    };
    mocks.signUp.mockResolvedValue({
      data: { session: null, user: null },
      error: providerError,
    });

    await expect(signUpWithPasswordAction({}, signUpForm())).resolves.toEqual({
      message: AUTH_MESSAGES.signUpUnavailable,
    });
    expect(consoleError).toHaveBeenCalledWith("[auth] sign-up failed", {
      code: "user_already_exists",
      error: providerError,
    });
  });

  it("keeps password-reset responses non-enumerating when Supabase fails", async () => {
    const providerError = {
      message: "Email rate limit exceeded",
      code: "over_email_send_rate_limit",
    };
    mocks.resetPasswordForEmail.mockResolvedValue({ error: providerError });
    const formData = new FormData();
    formData.set("email", "alex@example.com");

    await expect(requestPasswordResetAction({}, formData)).resolves.toEqual({
      message: AUTH_MESSAGES.passwordResetSent,
    });
    expect(consoleError).toHaveBeenCalledWith("[auth] password-reset failed", {
      code: "over_email_send_rate_limit",
      error: providerError,
    });
  });

  it("returns safe, actionable password-update feedback", async () => {
    const providerError = {
      message: "New password should be different from the old password.",
      code: "same_password",
    };
    mocks.updateUser.mockResolvedValue({
      data: { user: null },
      error: providerError,
    });
    const formData = new FormData();
    formData.set("password", "password123");
    formData.set("confirmPassword", "password123");

    await expect(updatePasswordAction({}, formData)).resolves.toEqual({
      message: AUTH_MESSAGES.chooseDifferentPassword,
    });
    expect(consoleError).toHaveBeenCalledWith("[auth] password-update failed", {
      code: "same_password",
      error: providerError,
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  signUp: vi.fn(),
  upsertProfile: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
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
      signUp: mocks.signUp,
    },
  }),
}));

import { signUpWithPasswordAction } from "@/lib/auth/actions";

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
    mocks.signUp.mockReset();
    mocks.upsertProfile.mockReset();
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
    expect(mocks.redirect).toHaveBeenCalledWith("/sign-up/check-email");
  });

  it("creates the profile and redirects immediately when Supabase returns a session", async () => {
    mocks.signUp.mockResolvedValue({
      data: { session: { access_token: "token" }, user: { id: "user-1" } },
      error: null,
    });

    await signUpWithPasswordAction({}, signUpForm());

    expect(mocks.upsertProfile).toHaveBeenCalledWith("user-1", "Alex Pooler");
    expect(mocks.redirect).toHaveBeenCalledWith("/join/demo");
  });
});

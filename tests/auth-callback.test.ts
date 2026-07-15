import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureProfile: vi.fn(),
  exchangeCodeForSession: vi.fn(),
}));

vi.mock("@/lib/auth/profiles", () => ({
  ensureProfileForAuthUser: mocks.ensureProfile,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      exchangeCodeForSession: mocks.exchangeCodeForSession,
    },
  }),
}));

import { GET } from "@/app/auth/callback/route";
import {
  PENDING_CONFIRMATION_EMAIL_COOKIE,
  PENDING_CONFIRMATION_NEXT_COOKIE,
} from "@/lib/auth/confirmation";

describe("auth callback", () => {
  beforeEach(() => {
    mocks.ensureProfile.mockReset();
    mocks.exchangeCodeForSession.mockReset();
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
  });

  it("creates the profile and sends a successful authentication to the destination", async () => {
    const response = await GET(
      new NextRequest(
        "https://poolwaffle.test/auth/callback?code=valid&next=%2Fjoin%2Fdemo",
      ),
    );

    expect(mocks.ensureProfile).toHaveBeenCalledWith({ id: "user-1" });
    expect(response.headers.get("location")).toBe(
      "https://poolwaffle.test/join/demo",
    );
    expect(response.cookies.get(PENDING_CONFIRMATION_EMAIL_COOKIE)?.value).toBe("");
    expect(response.cookies.get(PENDING_CONFIRMATION_NEXT_COOKIE)?.value).toBe("");
  });

  it("uses a generic sign-in failure path when the exchange fails", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: { user: null },
      error: new Error("invalid code"),
    });

    const response = await GET(
      new NextRequest("https://poolwaffle.test/auth/callback?code=invalid"),
    );

    expect(response.headers.get("location")).toBe(
      "https://poolwaffle.test/sign-in?auth_error=callback",
    );
  });
});

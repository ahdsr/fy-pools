import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  refreshCookie: false,
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _anonKey: string,
    options: {
      cookies: {
        setAll: (cookies: Array<{ name: string; value: string }>) => void;
      };
    },
  ) => {
    if (mocks.refreshCookie) {
      options.cookies.setAll([
        { name: "sb-test-auth-token", value: "refreshed-session" },
      ]);
    }

    return { auth: { getUser: mocks.getUser } };
  },
}));

vi.mock("@/lib/supabase/config", () => ({
  getSupabaseConfig: () => ({
    url: "https://example.supabase.co",
    anonKey: "anon-key",
  }),
}));

import {
  isGuestOnlyAuthPath,
  isProtectedDashboardPath,
  updateSupabaseSession,
} from "@/lib/supabase/proxy";

function request(pathname: string) {
  return new NextRequest(`https://poolwaffle.test${pathname}`);
}

describe("Supabase route proxy", () => {
  beforeEach(() => {
    mocks.getUser.mockReset();
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    mocks.refreshCookie = false;
  });

  it("identifies only dashboard routes as protected and sign-in/sign-up as guest-only", () => {
    expect(isProtectedDashboardPath("/dashboard")).toBe(true);
    expect(isProtectedDashboardPath("/dashboard/pools")).toBe(true);
    expect(isProtectedDashboardPath("/pools/demo")).toBe(false);
    expect(isGuestOnlyAuthPath("/sign-in")).toBe(true);
    expect(isGuestOnlyAuthPath("/sign-up")).toBe(true);
    expect(isGuestOnlyAuthPath("/forgot-password")).toBe(false);
  });

  it("redirects an authenticated visitor away from sign-in without rendering it", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const response = await updateSupabaseSession(
      request("/sign-in?next=%2Fdashboard%2Fpools%3Ffilter%3Dlive"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://poolwaffle.test/dashboard/pools?filter=live",
    );
  });

  it("redirects a signed-out dashboard request while preserving its destination", async () => {
    const response = await updateSupabaseSession(
      request("/dashboard/pools?filter=live"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://poolwaffle.test/sign-in?next=%2Fdashboard%2Fpools%3Ffilter%3Dlive",
    );
  });

  it("keeps password recovery available and carries refreshed session cookies through redirects", async () => {
    mocks.refreshCookie = true;
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const authResponse = await updateSupabaseSession(request("/forgot-password"));
    expect(authResponse.status).toBe(200);

    const redirectResponse = await updateSupabaseSession(request("/sign-up"));
    expect(redirectResponse.status).toBe(307);
    expect(redirectResponse.cookies.get("sb-test-auth-token")?.value).toBe(
      "refreshed-session",
    );
  });

  it("refreshes the session on public routes so shared navigation sees it", async () => {
    mocks.refreshCookie = true;
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const response = await updateSupabaseSession(request("/"));

    expect(response.status).toBe(200);
    expect(mocks.getUser).toHaveBeenCalledOnce();
    expect(response.cookies.get("sb-test-auth-token")?.value).toBe(
      "refreshed-session",
    );
  });
});

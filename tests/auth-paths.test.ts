import { afterEach, describe, expect, it } from "vitest";

import {
  authAppUrlFor,
  authCallbackUrlFor,
} from "@/lib/auth/callback";
import {
  DEFAULT_AUTH_REDIRECT,
  postAuthRedirectPath,
  safeNextPath,
  signInPathFor,
  signInErrorPathFor,
} from "@/lib/auth/paths";

describe("auth redirect paths", () => {
  const originalBasePath = process.env.NEXT_PUBLIC_BASE_PATH;

  afterEach(() => {
    if (originalBasePath === undefined) {
      delete process.env.NEXT_PUBLIC_BASE_PATH;
    } else {
      process.env.NEXT_PUBLIC_BASE_PATH = originalBasePath;
    }
  });

  it("defaults to the workspace dashboard and rejects unsafe destinations", () => {
    expect(DEFAULT_AUTH_REDIRECT).toBe("/dashboard");
    expect(safeNextPath(null)).toBe("/dashboard");
    expect(safeNextPath("https://attacker.example")).toBe("/dashboard");
    expect(safeNextPath("//attacker.example")).toBe("/dashboard");
    expect(safeNextPath("/dashboard/pools?filter=live")).toBe(
      "/dashboard/pools?filter=live",
    );
    expect(postAuthRedirectPath("/dashboard/pools")).toBe("/dashboard");
    expect(signInPathFor("/dashboard/pools")).toBe("/sign-in");
  });

  it("builds a callback URL with only a safe internal destination", () => {
    expect(
      authCallbackUrlFor(
        "https://fy-pools.vercel.app",
        "/join/demo?from=signup",
      ),
    ).toBe(
      "https://fy-pools.vercel.app/auth/callback?next=%2Fjoin%2Fdemo%3Ffrom%3Dsignup",
    );
    expect(
      authCallbackUrlFor("https://fy-pools.vercel.app", "https://attacker.example"),
    ).toBe(
      "https://fy-pools.vercel.app/auth/callback?next=%2Fdashboard",
    );
  });

  it("returns a non-sensitive sign-in error URL", () => {
    expect(signInErrorPathFor("/join/demo")).toBe(
      "/sign-in?next=%2Fjoin%2Fdemo&auth_error=callback",
    );
  });

  it("uses the configured base path for callback and raw auth redirects", () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "/poolwaffle/";

    expect(
      authCallbackUrlFor("https://fy-pools.vercel.app", "/join/demo"),
    ).toBe(
      "https://fy-pools.vercel.app/poolwaffle/auth/callback?next=%2Fjoin%2Fdemo",
    );
    expect(
      authAppUrlFor(
        "https://fy-pools.vercel.app",
        "/sign-in?auth_error=callback",
      ),
    ).toBe(
      "https://fy-pools.vercel.app/poolwaffle/sign-in?auth_error=callback",
    );
  });
});

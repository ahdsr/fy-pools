import { describe, expect, it } from "vitest";

import { authCallbackUrlFor } from "@/lib/auth/callback";
import {
  DEFAULT_AUTH_REDIRECT,
  safeNextPath,
  signInErrorPathFor,
} from "@/lib/auth/paths";

describe("auth redirect paths", () => {
  it("defaults to the pools dashboard and rejects unsafe destinations", () => {
    expect(DEFAULT_AUTH_REDIRECT).toBe("/dashboard/pools");
    expect(safeNextPath(null)).toBe("/dashboard/pools");
    expect(safeNextPath("https://attacker.example")).toBe("/dashboard/pools");
    expect(safeNextPath("//attacker.example")).toBe("/dashboard/pools");
    expect(safeNextPath("/dashboard/pools?filter=live")).toBe(
      "/dashboard/pools?filter=live",
    );
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
      "https://fy-pools.vercel.app/auth/callback?next=%2Fdashboard%2Fpools",
    );
  });

  it("returns a non-sensitive sign-in error URL", () => {
    expect(signInErrorPathFor("/join/demo")).toBe(
      "/sign-in?next=%2Fjoin%2Fdemo&auth_error=callback",
    );
  });
});

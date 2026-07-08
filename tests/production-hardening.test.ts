import { describe, expect, it } from "vitest";

import nextConfig from "../next.config";
import { formatDateTime } from "@/lib/date-time";
import { normalizeEmailAddress } from "@/lib/email";
import {
  getInviteExpiresAt,
  pickDeadlineHasPassed,
} from "@/lib/round-of-16/deadlines";
import type { RoundOf16PoolSettings } from "@/lib/templates/round-of-16-draft";

function settingsWithDeadline(deadline: string): RoundOf16PoolSettings {
  return {
    basics: {
      poolName: "Test",
      commissionerName: "Commissioner",
      eventLabel: "Event",
      picksLockAt: deadline,
      timezone: "America/Toronto",
      description: "",
    },
    matchups: [],
    bonusProps: [],
    scoring: { winnerPoints: 1, prizePoolLabel: "$0" },
    payouts: [],
    expectedEntries: 0,
    inviteNote: "",
  };
}

describe("production hardening", () => {
  it("applies global security headers", async () => {
    const headers = await nextConfig.headers?.();
    const values = new Map(
      headers?.[0]?.headers.map((header) => [header.key, header.value]),
    );

    const csp = values.get("Content-Security-Policy");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(values.get("X-Frame-Options")).toBe("DENY");
    expect(values.get("X-Content-Type-Options")).toBe("nosniff");
    expect(values.get("Permissions-Policy")).toContain("camera=()");
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it("normalizes shared formatting and deadline helpers", () => {
    expect(normalizeEmailAddress(" USER@Example.COM ")).toBe("user@example.com");
    expect(formatDateTime(undefined)).toBe("Not set");

    const futureSettings = settingsWithDeadline("2099-07-04T12:00:00.000Z");
    expect(pickDeadlineHasPassed(futureSettings)).toBe(false);
    expect(getInviteExpiresAt(futureSettings)).toBe("2099-07-04T12:00:00.000Z");
  });
});

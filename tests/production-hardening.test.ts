import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import nextConfig from "../next.config";
import { formatDateTime } from "@/lib/date-time";
import { normalizeEmailAddress } from "@/lib/email";
import {
  getRoundOf16EffectiveLockAt,
  getInviteExpiresAt,
  parsePoolDateTime,
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
      lockBeforeEventMinutes: 15,
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
    expect(csp).toContain("https://flagcdn.com");
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

  it("uses the earliest scheduled event as an additional pick-lock safeguard", () => {
    const settings = settingsWithDeadline("2099-07-04T16:00:00.000Z");
    settings.basics.lockBeforeEventMinutes = 15;
    settings.matchups = [
      {
        id: "match-1",
        label: "Match 1",
        teamOne: "Canada",
        teamTwo: "Mexico",
        startsAt: "2099-07-04T15:00:00.000Z",
      },
    ];

    expect(getRoundOf16EffectiveLockAt(settings)?.toISOString()).toBe(
      "2099-07-04T14:45:00.000Z",
    );
    expect(pickDeadlineHasPassed(settings, Date.parse("2099-07-04T14:45:00.000Z"))).toBe(
      true,
    );
  });

  it("interprets timezone-less commissioner inputs in the pool timezone", () => {
    expect(
      parsePoolDateTime("2026-07-04T12:00", "America/Toronto")?.toISOString(),
    ).toBe("2026-07-04T16:00:00.000Z");
  });

  it("ships a database-authoritative backup lock for submissions", () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20260716000000_enforce_round_of_16_pick_lock.sql",
      ),
      "utf8",
    );

    expect(migration).toContain("round_of_16_effective_pick_lock_at");
    expect(migration).toContain("now() >= v_pick_lock_at");
    expect(migration).toContain("startsAt");
    expect(migration).toContain("enforce_round_of_16_pick_item_lock");
  });
});

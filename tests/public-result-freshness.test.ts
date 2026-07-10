import { afterEach, describe, expect, it, vi } from "vitest";

import type { PoolResults } from "@/lib/world-cup-pool/types";

const mocks = vi.hoisted(() => ({
  supabaseConfigured: true,
  snapshotData: null as Record<string, unknown> | null,
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: () => mocks.supabaseConfigured,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdminClient: () => ({
    from: mocks.from,
    rpc: mocks.rpc,
  }),
}));

function mockSnapshotRead() {
  mocks.from.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: mocks.snapshotData,
          error: null,
        }),
      }),
    }),
  });
}

describe("public result freshness", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mocks.from.mockReset();
    mocks.rpc.mockReset();
    mocks.snapshotData = null;
    mocks.supabaseConfigured = true;
    delete process.env.FY_POOLS_RESULTS_STALE_MS;
  });

  it("prefers a durable Supabase result snapshot over fixture fallback", async () => {
    const fetchedAt = new Date().toISOString();
    const results = {
      meta: {
        lastUpdated: fetchedAt,
        source: "fifa",
        status: "Auto-updated from FIFA.",
      },
      matches: [],
    } satisfies PoolResults;
    mocks.snapshotData = {
      results_payload: results,
      source: "fifa",
      source_signature: "snapshot-signature",
      fetched_at: fetchedAt,
      status: "Auto-updated from FIFA.",
      last_error: null,
    };
    mockSnapshotRead();

    const { readWorldCupResultSnapshot } = await import(
      "@/lib/world-cup-pool/data"
    );
    const snapshot = await readWorldCupResultSnapshot(
      "marcins-2026-world-cup-pool",
    );

    expect(snapshot?.results).toBe(results);
    expect(snapshot?.freshness).toMatchObject({
      source: "fifa",
      sourceSignature: "snapshot-signature",
      stale: false,
      status: "Auto-updated from FIFA.",
    });
  });

  it("marks snapshots stale after the freshness target", async () => {
    process.env.FY_POOLS_RESULTS_STALE_MS = "300000";
    const { resultsAreStale } = await import("@/lib/world-cup-pool/data");
    const oldTimestamp = new Date(Date.now() - 301_000).toISOString();
    const freshTimestamp = new Date(Date.now() - 60_000).toISOString();

    expect(resultsAreStale(oldTimestamp)).toBe(true);
    expect(resultsAreStale(freshTimestamp)).toBe(false);
  });

  it("uses the durable lease to coalesce viewer-driven refreshes", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ claimed: true }],
      error: null,
    });
    const { claimWorldCupResultRefresh } = await import(
      "@/lib/world-cup-pool/data"
    );

    await expect(
      claimWorldCupResultRefresh({
        poolSlug: "marcins-2026-world-cup-pool",
        minimumIntervalSeconds: 30,
      }),
    ).resolves.toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith("claim_public_result_refresh", {
      p_pool_slug: "marcins-2026-world-cup-pool",
      p_min_interval_seconds: 30,
    });
  });

  it("opens the rapid refresh window for live and imminent matches", async () => {
    const { isWorldCupScoreRefreshActive } = await import(
      "@/lib/world-cup-pool/data"
    );
    const now = Date.now();

    expect(
      isWorldCupScoreRefreshActive(
        {
          matches: [
            {
              id: "match-1",
              date: new Date(now + 60_000).toISOString(),
              state: "scheduled",
              completed: false,
              detail: "Scheduled",
              homeTeam: "Canada",
              awayTeam: "Mexico",
              homeScore: null,
              awayScore: null,
              winner: "",
              loser: "",
            },
          ],
        },
        now,
      ),
    ).toBe(true);
    expect(
      isWorldCupScoreRefreshActive(
        {
          matches: [
            {
              id: "match-2",
              date: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
              state: "scheduled",
              completed: false,
              detail: "Scheduled",
              homeTeam: "Canada",
              awayTeam: "Mexico",
              homeScore: null,
              awayScore: null,
              winner: "",
              loser: "",
            },
          ],
        },
        now,
      ),
    ).toBe(false);
  });

  it("quietly ignores durable snapshots that are not sourced from FIFA", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchedAt = new Date().toISOString();
    mocks.snapshotData = {
      results_payload: {
        meta: {
          lastUpdated: fetchedAt,
          source: "legacy-feed",
          status: "Legacy result snapshot.",
        },
        matches: [],
      } satisfies PoolResults,
      source: "legacy-feed",
      source_signature: "legacy-signature",
      fetched_at: fetchedAt,
      status: "Legacy result snapshot.",
      last_error: null,
    };
    mockSnapshotRead();

    const { readWorldCupResultSnapshot } = await import(
      "@/lib/world-cup-pool/data"
    );

    await expect(
      readWorldCupResultSnapshot("marcins-2026-world-cup-pool"),
    ).resolves.toBeNull();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("does not call provider APIs while building public standings", async () => {
    mocks.supabaseConfigured = false;
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const { MARCINS_POOL_SLUG } = await import("@/lib/world-cup-pool/data");
    const { getPublicPoolStandingsSnapshot } = await import(
      "@/lib/world-cup-pool/public-pool"
    );

    const standings = await getPublicPoolStandingsSnapshot(MARCINS_POOL_SLUG);

    expect(standings?.rows.length).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(standings?.pool.resultsFreshness.source).toBe("fixture");
    expect(standings?.pool.resultsFreshness.stale).toBe(true);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

import type { PoolResults } from "@/lib/world-cup-pool/types";

const mocks = vi.hoisted(() => ({
  supabaseConfigured: true,
  snapshotData: null as Record<string, unknown> | null,
  from: vi.fn(),
}));

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: () => mocks.supabaseConfigured,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdminClient: () => ({
    from: mocks.from,
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

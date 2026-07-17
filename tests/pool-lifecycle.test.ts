import { afterEach, describe, expect, it, vi } from "vitest";

import {
  archivePoolSettings,
  isArchivedPool,
  restorePoolSettings,
} from "@/lib/pool-lifecycle";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: () => true,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdminClient: () => ({ from: mocks.from }),
  getSupabaseUser: mocks.getUser,
}));

const owner = { id: "owner-1" };

type PoolRow = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  status: string;
  settings: Record<string, unknown>;
};

function mockPoolClient({
  pool,
  deleteError = null,
}: {
  pool: PoolRow;
  deleteError?: { code: string; details: string; hint: string; message: string } | null;
}) {
  const updates: Record<string, unknown>[] = [];
  const deletePool = vi.fn();
  mocks.from.mockImplementation((table: string) => {
    if (table === "pools") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: pool, error: null })),
          })),
        })),
        update: vi.fn((payload: Record<string, unknown>) => {
          updates.push(payload);
          return { eq: vi.fn(async () => ({ error: null })) };
        }),
        delete: deletePool.mockReturnValue({
          eq: vi.fn(async () => ({ error: deleteError })),
        }),
      };
    }

    if (table === "audit_events") {
      return { insert: vi.fn(async () => ({ error: null })) };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  return { updates, deletePool };
}

describe("pool archive settings", () => {
  it("preserves the exact prior status and removes it after restore", () => {
    const archived = archivePoolSettings({ roundOf16: {}, lifecycle: { note: "keep" } }, "locked");

    expect(archived).toMatchObject({
      lifecycle: { archivedStatus: "locked", note: "keep" },
    });
    expect(isArchivedPool("archived")).toBe(true);
    expect(isArchivedPool("open")).toBe(false);
    expect(restorePoolSettings(archived)).toEqual({
      status: "locked",
      settings: { roundOf16: {}, lifecycle: { note: "keep" } },
    });
  });

  it("safely restores older archived pools to open", () => {
    expect(restorePoolSettings({ nbaSeries: {}, lifecycle: {} }).status).toBe("open");
  });
});

describe("commissioner pool lifecycle persistence", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mocks.from.mockReset();
    mocks.getUser.mockReset();
  });

  it("archives and restores an owned pool without touching entries or invites", async () => {
    const pool: PoolRow = {
      id: "pool-1",
      name: "Friday Picks",
      slug: "friday-picks",
      owner_id: owner.id,
      status: "completed",
      settings: { rankedFinish: {} },
    };
    const { updates } = mockPoolClient({ pool });
    mocks.getUser.mockResolvedValue(owner);
    const { archiveCommissionerPool, restoreCommissionerPool } = await import("@/lib/round-of-16/persistence");

    await expect(archiveCommissionerPool(pool.id)).resolves.toEqual({ poolSlug: pool.slug });
    expect(updates[0]).toMatchObject({
      status: "archived",
      settings: { lifecycle: { archivedStatus: "completed" } },
    });

    pool.status = "archived";
    pool.settings = updates[0]!.settings as Record<string, unknown>;
    await expect(restoreCommissionerPool(pool.id)).resolves.toEqual({ poolSlug: pool.slug });
    expect(updates[1]).toMatchObject({ status: "completed" });
  });

  it("deletes an owned pool with no pick precondition once its name is confirmed", async () => {
    const pool: PoolRow = {
      id: "pool-1",
      name: "Empty Pool",
      slug: "empty-pool",
      owner_id: owner.id,
      status: "open",
      settings: {},
    };
    const { deletePool } = mockPoolClient({ pool });
    mocks.getUser.mockResolvedValue(owner);
    const { deleteCommissionerPool } = await import("@/lib/round-of-16/persistence");

    await expect(deleteCommissionerPool(pool.id, pool.name)).resolves.toEqual({
      poolId: pool.id,
      poolSlug: pool.slug,
    });
    expect(deletePool).toHaveBeenCalledOnce();
  });

  it("rejects a mismatched delete confirmation before issuing a delete", async () => {
    const pool: PoolRow = { id: "pool-1", name: "Friday Picks", slug: "friday-picks", owner_id: owner.id, status: "open", settings: {} };
    const { deletePool } = mockPoolClient({ pool });
    mocks.getUser.mockResolvedValue(owner);
    const { deleteCommissionerPool } = await import("@/lib/round-of-16/persistence");

    await expect(deleteCommissionerPool(pool.id, "Friday")).rejects.toThrow("Type the pool name exactly");
    expect(deletePool).not.toHaveBeenCalled();
  });

  it("logs database details but returns a safe deletion error", async () => {
    const pool: PoolRow = { id: "pool-1", name: "Friday Picks", slug: "friday-picks", owner_id: owner.id, status: "open", settings: {} };
    mockPoolClient({ pool, deleteError: { code: "23503", details: "dependent row", hint: "check foreign key", message: "violates foreign key" } });
    mocks.getUser.mockResolvedValue(owner);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { deleteCommissionerPool } = await import("@/lib/round-of-16/persistence");

    await expect(deleteCommissionerPool(pool.id, pool.name)).rejects.toThrow("Pool could not be permanently deleted");
    expect(errorSpy).toHaveBeenCalledWith("[fy-pools] Pool deletion failed", expect.objectContaining({ poolId: pool.id, code: "23503" }));
  });

  it("keeps archived pools unavailable in every public and invite runtime", async () => {
    const archivedPool = {
      id: "pool-1",
      slug: "hidden-pool",
      name: "Hidden Pool",
      status: "archived",
      owner_id: owner.id,
      template_version_id: "template-1",
      settings: { roundOf16: {}, nbaSeries: {}, rankedFinish: {} },
    };
    mocks.from.mockImplementation((table: string) => {
      const record = table === "pools" ? archivedPool : { id: "invite-1", code: "invite-1", pools: archivedPool };
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: record, error: null })) })),
        })),
      };
    });
    const {
      getJoinPoolData,
    } = await import("@/lib/round-of-16/persistence");
    const { getPublicRoundOf16Pool } = await import("@/lib/round-of-16/public");
    const { getNbaJoinPoolData, getPublicNbaSeriesPool } = await import("@/lib/nba-series/persistence");
    const { getRankedFinishJoinPoolData, getPublicRankedFinishPool } = await import("@/lib/ranked-finish/persistence");

    await expect(getPublicRoundOf16Pool(archivedPool.slug)).resolves.toBeNull();
    await expect(getPublicNbaSeriesPool(archivedPool.slug)).resolves.toBeNull();
    await expect(getPublicRankedFinishPool(archivedPool.slug, "f1-grand-prix-predictor")).resolves.toBeNull();
    await expect(getJoinPoolData("invite-1")).resolves.toBeNull();
    await expect(getNbaJoinPoolData("invite-1")).resolves.toBeNull();
    await expect(getRankedFinishJoinPoolData("invite-1", "f1-grand-prix-predictor")).resolves.toBeNull();
  });
});

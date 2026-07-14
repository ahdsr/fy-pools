import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/supabase/config", () => ({
  getAppSiteUrl: () => "https://fy-pools.example",
  isSupabaseConfigured: () => true,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdminClient: () => ({
    from: mocks.from,
    rpc: mocks.rpc,
  }),
}));

const previousRows = [
  { id: "alex", name: "Alex", rank: 1, score: { total: 12 } },
  { id: "lucas", name: "Lucas", rank: 2, score: { total: 10 } },
];

const currentRows = [
  { id: "lucas", name: "Lucas", rank: 1, score: { total: 14 } },
  { id: "alex", name: "Alex", rank: 2, score: { total: 12 } },
];

function mockDeliveryUpdate() {
  mocks.from.mockReturnValue({
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }),
  });
}

describe("public pool leader notifications", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mocks.rpc.mockReset();
    mocks.from.mockReset();
    delete process.env.RESEND_API_KEY;
    delete process.env.FY_POOLS_EMAIL_FROM;
    delete process.env.FY_POOLS_LEADER_NOTIFICATION_TEST_EMAIL;
  });

  it("emails a player only when they newly reach rank one", async () => {
    process.env.RESEND_API_KEY = "resend-test-key";
    process.env.FY_POOLS_EMAIL_FROM = "Pool Waffle <test@example.com>";
    process.env.FY_POOLS_LEADER_NOTIFICATION_TEST_EMAIL = "lucas.czuchraj@gmail.com";
    mocks.rpc.mockResolvedValue({ data: [{ claimed: true }], error: null });
    mockDeliveryUpdate();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "email-123" }), { status: 200 }),
    );

    const { notifyNewPublicPoolLeaders } = await import(
      "@/lib/world-cup-pool/leader-notifications"
    );
    await expect(
      notifyNewPublicPoolLeaders({
        poolSlug: "marcins-2026-world-cup-pool",
        poolName: "Marcin's World Cup Pool",
        sourceSignature: "spain-wins",
        previousRows,
        currentRows,
      }),
    ).resolves.toMatchObject({ attempted: 1, sent: 1 });

    expect(mocks.rpc).toHaveBeenCalledWith("claim_public_pool_leader_notification", {
      p_pool_slug: "marcins-2026-world-cup-pool",
      p_entry_id: "lucas",
      p_source_signature: "spain-wins",
      p_leader_name: "Lucas",
      p_leader_score: 14,
      p_recipient: "lucas.czuchraj@gmail.com",
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("You're leading Marcin's World Cup Pool"),
      }),
    );
  });

  it("does not send when the current leader was already rank one", async () => {
    const { notifyNewPublicPoolLeaders } = await import(
      "@/lib/world-cup-pool/leader-notifications"
    );
    await expect(
      notifyNewPublicPoolLeaders({
        poolSlug: "marcins-2026-world-cup-pool",
        poolName: "Marcin's World Cup Pool",
        sourceSignature: "same-leader",
        previousRows: currentRows,
        currentRows,
      }),
    ).resolves.toMatchObject({ attempted: 0, sent: 0, skipped: "no-new-leader" });

    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});

import {
  claimWorldCupResultRefresh,
  getMarcinsWorldCupPool,
  isWorldCupScoreRefreshActive,
  MARCINS_POOL_SLUG,
  recordWorldCupResultSnapshotError,
  warmMarcinsWorldCupResults,
} from "@/lib/world-cup-pool/data";

const LIVE_REFRESH_INTERVAL_SECONDS = 30;
const IDLE_REFRESH_INTERVAL_SECONDS = 15 * 60;

export async function GET() {
  const pool = await getMarcinsWorldCupPool();
  const live = isWorldCupScoreRefreshActive(pool.results);
  const claimed = await claimWorldCupResultRefresh({
    poolSlug: MARCINS_POOL_SLUG,
    minimumIntervalSeconds: live
      ? LIVE_REFRESH_INTERVAL_SECONDS
      : IDLE_REFRESH_INTERVAL_SECONDS,
  });

  if (!claimed) {
    return Response.json({ ok: true, refreshed: false, live });
  }

  try {
    const refreshedPool = await warmMarcinsWorldCupResults();
    return Response.json({
      ok: true,
      refreshed: true,
      live: isWorldCupScoreRefreshActive(refreshedPool.results),
    });
  } catch (error) {
    await recordWorldCupResultSnapshotError({
      poolSlug: MARCINS_POOL_SLUG,
      error,
    });
    console.error("[fy-pools] Viewer-driven World Cup result refresh failed", error);

    return Response.json(
      { ok: false, refreshed: false, live },
      { status: 503 },
    );
  }
}

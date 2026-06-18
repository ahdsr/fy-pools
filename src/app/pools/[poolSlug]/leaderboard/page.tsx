import { notFound } from "next/navigation";

import { LedgerPanel } from "@/components/app/ledger";
import {
  LeaderboardTable,
  PayoutPanel,
  StatGrid,
} from "@/components/app/pool-public-widgets";
import { PublicPoolShell } from "@/components/app/public-pool-shell";
import { buildLeaderboardRows, buildPoolAnalytics } from "@/lib/world-cup-pool/leaderboard";
import {
  formatDateTime,
  getPublicPool,
  MARCINS_POOL_SLUG,
} from "@/lib/world-cup-pool/data";

type LeaderboardPageProps = {
  params: Promise<{ poolSlug: string }>;
};

export default async function LeaderboardPage({ params }: LeaderboardPageProps) {
  const { poolSlug } = await params;
  const pool = await getPublicPool(poolSlug);
  if (!pool) notFound();

  const rows = buildLeaderboardRows(
    pool.entriesConfig,
    pool.picksByPath,
    pool.results,
  );
  const analytics = buildPoolAnalytics(
    pool.entriesConfig,
    pool.picksByPath,
    pool.results,
    rows,
  );

  return (
    <PublicPoolShell
      poolName={pool.entriesConfig.poolName}
      poolSlug={MARCINS_POOL_SLUG}
      active="leaderboard"
      eyebrow="Public standings"
      title="Leaderboard"
      description="Every entry is ranked by live scoring, with group, knockout, finals, and bonus subtotals kept visible for quick auditing."
      meta={
        <div className="rounded-lg border border-white/18 bg-black/30 p-4 backdrop-blur-md">
          <p className="text-sm font-medium uppercase tracking-normal text-white/62">
            Score refresh
          </p>
          <p className="mt-2 text-xl font-semibold leading-tight text-white">
            {formatDateTime(pool.results.meta?.lastUpdated)}
          </p>
        </div>
      }
    >
      <LedgerPanel>
        <StatGrid
          stats={[
            { label: "Entries", value: rows.length },
            { label: "First place", value: rows[0]?.name ?? "TBD" },
            { label: "Leader total", value: analytics.leaderTotal },
            { label: "Payout cutoff", value: `${analytics.payoutCutoff} pts` },
          ]}
        />
      </LedgerPanel>

      <section className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <LedgerPanel
          title="Current standings"
          description="Names link to read-only entry pages with pick and scoring detail."
        >
          <LeaderboardTable rows={rows} poolSlug={MARCINS_POOL_SLUG} />
        </LedgerPanel>
        <PayoutPanel entriesConfig={pool.entriesConfig} />
      </section>
    </PublicPoolShell>
  );
}

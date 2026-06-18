import Link from "next/link";
import { ArrowRight, BarChart3, Calculator, Trophy } from "lucide-react";
import { notFound } from "next/navigation";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import {
  LeaderboardTable,
  LatestUpdatesPanel,
  PayoutPanel,
  StatGrid,
} from "@/components/app/pool-public-widgets";
import { PublicPoolShell } from "@/components/app/public-pool-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildLeaderboardRows, buildPoolAnalytics } from "@/lib/world-cup-pool/leaderboard";
import {
  formatDateTime,
  getPublicPool,
  MARCINS_POOL_SLUG,
} from "@/lib/world-cup-pool/data";

type PoolPageProps = {
  params: Promise<{ poolSlug: string }>;
};

export default async function PoolPage({ params }: PoolPageProps) {
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
  const publicSlug = MARCINS_POOL_SLUG;

  return (
    <PublicPoolShell
      poolName={pool.entriesConfig.poolName}
      poolSlug={publicSlug}
      active="overview"
      title={pool.entriesConfig.poolName}
      description="A public, read-only pool page Marcin can share with friends. Standings, prize places, updates, and entry details are visible without signing in."
      meta={
        <div className="rounded-lg border border-white/18 bg-black/30 p-4 backdrop-blur-md">
          <p className="text-sm font-medium uppercase tracking-normal text-white/62">
            Updated
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
            {
              label: "Entries",
              value: rows.length,
              note: "Imported from submitted picks",
            },
            {
              label: "Leader",
              value: rows[0]?.name ?? "TBD",
              note: `${rows[0]?.score.total ?? 0} points`,
            },
            {
              label: "Still alive",
              value: `${analytics.aliveCount}/${rows.length}`,
              note: "Can still reach first",
            },
            {
              label: "Prize pool",
              value: pool.entriesConfig.prizePoolLabel ?? "TBD",
              note: `${analytics.payoutPlaces} payout places`,
            },
          ]}
        />
      </LedgerPanel>

      <section className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <LedgerPanel
          title="Current standings"
          description="Top entries are shown here. Open the full leaderboard for every score."
          action={
            <Button asChild variant="secondaryGreen">
              <Link href={`/pools/${publicSlug}/leaderboard`}>
                Full leaderboard <ArrowRight />
              </Link>
            </Button>
          }
        >
          <LeaderboardTable rows={rows} poolSlug={publicSlug} limit={8} />
        </LedgerPanel>

        <LedgerPanel title="Pool tools">
          <LedgerRows>
            {[
              {
                title: "Leaderboard",
                body: "Current standings with score subtotals.",
                href: `/pools/${publicSlug}/leaderboard`,
                icon: BarChart3,
              },
              {
                title: "Projections",
                body: "Best possible scores and payout reach.",
                href: `/pools/${publicSlug}/projections`,
                icon: Calculator,
              },
              {
                title: "Leader detail",
                body: "Open the current leader's score breakdown.",
                href: `/pools/${publicSlug}/entry/${rows[0]?.id}`,
                icon: Trophy,
              },
            ].map((item) => (
              <LedgerRow key={item.title} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <item.icon className="size-5 text-brand-mark" />
                  <Badge variant="outline">Public</Badge>
                </div>
                <div>
                  <p className="font-semibold text-brand-ink">{item.title}</p>
                  <p className="mt-1 text-sm font-normal leading-5 text-muted-foreground">
                    {item.body}
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link href={item.href}>Open</Link>
                </Button>
              </LedgerRow>
            ))}
          </LedgerRows>
        </LedgerPanel>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_0.95fr]">
        <LatestUpdatesPanel rows={rows} results={pool.results} />
        <PayoutPanel entriesConfig={pool.entriesConfig} />
      </section>
    </PublicPoolShell>
  );
}

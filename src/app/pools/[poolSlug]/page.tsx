import { Info, Trophy, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { LedgerPanel } from "@/components/app/ledger";
import { LeaderboardTable } from "@/components/app/leaderboard-table";
import {
  LatestUpdatesPanel,
  PayoutPanel,
  PublicToolsPanel,
  StatGrid,
} from "@/components/app/pool-public-widgets";
import { PublicPoolShell } from "@/components/app/public-pool-shell";
import {
  describeCurrentPoolMatch,
  getReferencePicks,
} from "@/lib/world-cup-pool/current-match";
import { formatDateTime } from "@/lib/world-cup-pool/data";
import { getPublicPoolStandings } from "@/lib/world-cup-pool/public-pool";

type PoolPageProps = {
  params: Promise<{ poolSlug: string }>;
};

const currentStandingsInfo =
  "These standings are not final. Current scores are based on results entered so far: group picks use the current group order and projected third-place qualifiers, knockout/finals/bonus points use completed or entered outcomes. That means the table can be skewed by today's partial results and our current scoring logic until every result is final.";

export default async function PoolPage({ params }: PoolPageProps) {
  const { poolSlug } = await params;
  const standings = await getPublicPoolStandings(poolSlug);
  if (!standings) notFound();

  const { pool, rows, analytics, publicSlug } = standings;
  const scoreRefreshLabel = formatDateTime(pool.results.meta?.lastUpdated);
  const referencePicks = getReferencePicks(pool.picksByPath);
  const currentMatchLabel = describeCurrentPoolMatch(
    pool.results,
    referencePicks,
  );
  const poolTools = [
    {
      title: "Locker Room",
      body: `Enter the ${currentMatchLabel} game day room.`,
      href: `/pools/${publicSlug}/locker-room`,
      icon: Users,
    },
    ...(rows[0]
      ? [
          {
            title: "Leader detail",
            body: "Open the current leader's score breakdown.",
            href: `/pools/${publicSlug}/entry/${rows[0].id}`,
            icon: Trophy,
          },
        ]
      : []),
  ];

  return (
    <PublicPoolShell
      poolName={pool.entriesConfig.poolName}
      title={pool.entriesConfig.poolName}
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
              label: "First place",
              value: rows[0]?.name ?? "TBD",
              note: `${analytics.leaderTotal} points`,
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

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <LedgerPanel
          id="leaderboard"
          className="min-w-0 scroll-mt-24"
          title={
            <span className="inline-flex items-center gap-2">
              Current standings
              <button
                type="button"
                aria-label="About current standings"
                aria-describedby="current-standings-info"
                className="group relative inline-flex size-6 items-center justify-center rounded-full border border-border bg-surface-paper text-muted-foreground transition hover:border-primary/35 hover:text-brand-ink focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
              >
                <Info className="size-3.5" aria-hidden="true" />
                <span
                  id="current-standings-info"
                  role="tooltip"
                  className="pointer-events-none absolute left-1/2 top-[calc(100%+0.5rem)] z-30 w-72 max-w-[calc(100vw-3rem)] -translate-x-1/2 rounded-md border bg-popover px-3 py-2 text-left font-sans text-xs font-normal leading-5 tracking-normal text-popover-foreground opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  {currentStandingsInfo}
                </span>
              </button>
            </span>
          }
          description="Every entry is ranked by live scoring, with group, knockout, finals, and bonus subtotals kept visible for quick auditing."
          action={
            <div className="text-left text-xs leading-5 text-muted-foreground sm:text-right">
              <p className="font-medium uppercase tracking-normal">
                Score refresh
              </p>
              <p>{scoreRefreshLabel}</p>
            </div>
          }
        >
          <Suspense>
            <LeaderboardTable
              rows={rows}
              analyticsRows={analytics.rows}
              poolSlug={publicSlug}
              payoutPlaces={analytics.payoutPlaces}
            />
          </Suspense>
        </LedgerPanel>

        <aside className="grid gap-5">
          <LatestUpdatesPanel
            rows={rows}
            results={pool.results}
            referencePicks={referencePicks}
          />
          <PayoutPanel entriesConfig={pool.entriesConfig} compact />
          <PublicToolsPanel tools={poolTools} />
        </aside>
      </section>
    </PublicPoolShell>
  );
}

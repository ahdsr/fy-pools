import Link from "next/link";
import { notFound } from "next/navigation";

import { LedgerPanel } from "@/components/app/ledger";
import { StatGrid } from "@/components/app/pool-public-widgets";
import { PublicPoolShell } from "@/components/app/public-pool-shell";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buildLeaderboardRows, buildPoolAnalytics } from "@/lib/world-cup-pool/leaderboard";
import {
  formatDateTime,
  formatList,
  getPublicPool,
  MARCINS_POOL_SLUG,
} from "@/lib/world-cup-pool/data";

type ProjectionsPageProps = {
  params: Promise<{ poolSlug: string }>;
};

export default async function ProjectionsPage({ params }: ProjectionsPageProps) {
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
      active="projections"
      eyebrow="Public projections"
      title="Who can still win?"
      description="This is a ceiling model: it shows each entry's best possible score from picks that have not been fully decided yet."
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
              label: "Leader",
              value: formatList(analytics.leaderNames) || "TBD",
              note: `${analytics.leaderTotal} current points`,
            },
            {
              label: "Top ceiling",
              value: analytics.topCeiling?.name ?? "TBD",
              note: `${analytics.topCeiling?.maxPossible ?? 0} max points`,
            },
            {
              label: "Still alive",
              value: `${analytics.aliveCount}/${analytics.rows.length}`,
              note: "Can still catch first",
            },
            {
              label: "Payout reach",
              value: `${analytics.payoutAliveCount}/${analytics.rows.length}`,
              note: `Can reach top ${analytics.payoutPlaces}`,
            },
          ]}
        />
      </LedgerPanel>

      <LedgerPanel
        title="Projection ledger"
        description="This is not a probability model. It only measures remaining possible points."
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-ledger hover:bg-surface-ledger">
              <TableHead>Entry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Current</TableHead>
              <TableHead>Max possible</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead>Best rank</TableHead>
              <TableHead>Top {analytics.payoutPlaces}</TableHead>
              <TableHead>Leader gap</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analytics.rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Link
                    href={`/pools/${MARCINS_POOL_SLUG}/entry/${row.id}`}
                    className="font-medium text-brand-ink hover:text-brand-hot"
                  >
                    {row.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={row.canWin ? "secondary" : "outline"}>
                    {row.canWin ? "Alive" : "Eliminated"}
                  </Badge>
                </TableCell>
                <TableCell>{row.currentTotal}</TableCell>
                <TableCell className="font-semibold">{row.maxPossible}</TableCell>
                <TableCell>
                  <span className="font-semibold">{row.remaining.total}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    G {row.remaining.group} / K {row.remaining.knockout} / F{" "}
                    {row.remaining.finals} / B {row.remaining.bonus}
                  </span>
                </TableCell>
                <TableCell>{row.ceilingRank}</TableCell>
                <TableCell>
                  <Badge variant={row.canReachPayout ? "secondary" : "outline"}>
                    {row.canReachPayout ? "In reach" : "Out"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {row.currentGapToLeader === 0
                    ? "Leader"
                    : `${row.currentGapToLeader} pts`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </LedgerPanel>
    </PublicPoolShell>
  );
}

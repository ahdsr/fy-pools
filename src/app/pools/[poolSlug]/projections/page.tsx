import Link from "next/link";
import { notFound } from "next/navigation";

import { LedgerPanel } from "@/components/app/ledger";
import { StatGrid } from "@/components/app/pool-public-widgets";
import {
  PublicPoolMetaCard,
  PublicPoolShell,
} from "@/components/app/public-pool-shell";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatList } from "@/lib/world-cup-pool/data";
import type { PoolAnalyticsRow } from "@/lib/world-cup-pool/leaderboard";
import { buildOpponentPathsReport } from "@/lib/world-cup-pool/opponent-paths";
import { getPublicPoolStandings } from "@/lib/world-cup-pool/public-pool";
import type { LeaderboardRow } from "@/lib/world-cup-pool/types";

const projectionNote =
  "This is not a probability model. Leader path shows whether an entry has enough unique remaining picks to pass the current leader.";

type ProjectionsPageProps = {
  params: Promise<{ poolSlug: string }>;
};

function projectionRows(rows: PoolAnalyticsRow[]) {
  return rows.slice().sort((a, b) => {
    if (a.ceilingRank !== b.ceilingRank) return a.ceilingRank - b.ceilingRank;
    if (b.maxPossible !== a.maxPossible) return b.maxPossible - a.maxPossible;
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.name.localeCompare(b.name);
  });
}

type LeaderPassRoute = {
  canPassLeader: boolean;
  neededSwing: number;
  routeCovered: number;
  routeLabel: string;
};

function buildLeaderPassRoutes({
  analyticsRows,
  currentRows,
  pool,
}: {
  analyticsRows: PoolAnalyticsRow[];
  currentRows: LeaderboardRow[];
  pool: NonNullable<Awaited<ReturnType<typeof getPublicPoolStandings>>>["pool"];
}) {
  const leader = currentRows[0];
  const routes = new Map<string, LeaderPassRoute>();

  for (const row of analyticsRows) {
    if (!leader || row.id === leader.id) {
      routes.set(row.id, {
        canPassLeader: Boolean(leader),
        neededSwing: 0,
        routeCovered: 0,
        routeLabel: "Current leader",
      });
      continue;
    }

    const report = buildOpponentPathsReport({
      entriesConfig: pool.entriesConfig,
      picksByPath: pool.picksByPath,
      results: pool.results,
      entryId: row.id,
    });
    const leaderPath = report?.opponents.find(
      (opponent) => opponent.id === leader.id,
    );

    routes.set(row.id, {
      canPassLeader: Boolean(leaderPath?.routeComplete),
      neededSwing: leaderPath?.neededSwing ?? Math.max(0, leader.score.total - row.currentTotal + 1),
      routeCovered: leaderPath?.routeCovered ?? 0,
      routeLabel: leaderPath?.routeComplete
        ? `${leaderPath.routeCovered} route pts`
        : `${leaderPath?.routeCovered ?? 0}/${leaderPath?.neededSwing ?? Math.max(0, leader.score.total - row.currentTotal + 1)} route pts`,
    });
  }

  return routes;
}

function statusBadge(label: string, active: boolean) {
  return (
    <Badge
      variant={active ? "secondary" : "outline"}
      className={
        active ? "border-cta-green/25 bg-cta-green-soft text-brand-ink" : undefined
      }
    >
      {label}
    </Badge>
  );
}

function ProjectionRow({
  row,
  publicSlug,
  leaderRoute,
}: {
  row: PoolAnalyticsRow;
  publicSlug: string;
  leaderRoute?: LeaderPassRoute;
}) {
  const canPassLeader = Boolean(leaderRoute?.canPassLeader);

  return (
    <TableRow>
      <TableCell className="w-14 font-semibold text-brand-ink">
        #{row.rank}
      </TableCell>
      <TableCell>
        <Link
          href={`/pools/${publicSlug}/entry/${row.id}`}
          className="font-medium text-brand-ink hover:text-brand-hot"
        >
          {row.name}
        </Link>
      </TableCell>
      <TableCell className="font-semibold">
        {row.currentTotal}
      </TableCell>
      <TableCell>
        <div className="min-w-28">
          {statusBadge(
            canPassLeader ? "Can pass" : "No route",
            canPassLeader,
          )}
          {leaderRoute ? (
            <p className="mt-1 text-xs leading-4 text-muted-foreground">
              {leaderRoute.routeLabel}
            </p>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        {statusBadge(
          row.canReachPayout ? "In reach" : "Out",
          row.canReachPayout,
        )}
      </TableCell>
    </TableRow>
  );
}

function leaderName({
  leaderClinched,
  leaderNames,
}: {
  leaderClinched: boolean;
  leaderNames: string[];
}) {
  const label = formatList(leaderNames) || "The leader";
  return leaderClinched ? `${label} clinched` : label;
}

function leaderNote({
  leaderClinched,
  leaderTotal,
}: {
  leaderClinched: boolean;
  leaderTotal: number;
}) {
  return leaderClinched ? "Cannot be caught" : `${leaderTotal} pts live pace`;
}

export default async function ProjectionsPage({ params }: ProjectionsPageProps) {
  const { poolSlug } = await params;
  const standings = await getPublicPoolStandings(poolSlug);
  if (!standings) notFound();

  const { pool, rows: currentRows, analytics, publicSlug } = standings;
  const rows = projectionRows(analytics.rows);
  const leaderPassRoutes = buildLeaderPassRoutes({
    analyticsRows: analytics.rows,
    currentRows,
    pool,
  });
  const leaderPassCount = analytics.rows.filter(
    (row) => leaderPassRoutes.get(row.id)?.canPassLeader,
  ).length;
  const scoreRefreshLabel = formatDateTime(pool.results.meta?.lastUpdated);

  return (
    <PublicPoolShell
      poolName={pool.entriesConfig.poolName}
      eyebrow="Projections"
      title="Who can still pass #1?"
      description="Leader paths and max-score ceilings based on each entry's remaining picks."
      meta={
        <>
          <PublicPoolMetaCard
            label="Updated"
            value={scoreRefreshLabel}
          />
          <PublicPoolMetaCard
            label="Prize range"
            value={`Top ${analytics.payoutPlaces}`}
          />
        </>
      }
    >
      <LedgerPanel>
        <StatGrid
          stats={[
            {
              label: "Current advantage",
              value: leaderName(analytics),
              note: leaderNote(analytics),
            },
            {
              label: "Highest ceiling",
              value: analytics.topCeiling?.name ?? "TBD",
              note: `${analytics.topCeiling?.maxPossible ?? 0} max pts`,
            },
            {
              label: "Can pass leader",
              value: `${leaderPassCount}/${analytics.rows.length}`,
              note: "Has remaining route over #1",
            },
            {
              label: `Top ${analytics.payoutPlaces} race`,
              value: `${analytics.payoutAliveCount}/${analytics.rows.length}`,
              note: "Can still reach payout range",
            },
          ]}
        />
      </LedgerPanel>

      <LedgerPanel
        title="Pool projections"
        description="Leader path answers whether an entry has enough unique remaining picks to pass the current leader."
        action={
          <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
            {statusBadge("Live projection", true)}
            <Badge variant="outline">{rows.length} entries</Badge>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-surface-ledger hover:bg-surface-ledger">
                <TableHead className="w-14">
                  <span className="sr-only">Current rank</span>
                </TableHead>
                <TableHead>Entry</TableHead>
                <TableHead>Current pts</TableHead>
                <TableHead>Leader path</TableHead>
                <TableHead>Top {analytics.payoutPlaces}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <ProjectionRow
                  key={row.id}
                  row={row}
                  publicSlug={publicSlug}
                  leaderRoute={leaderPassRoutes.get(row.id)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="border-t px-5 py-4 text-sm leading-6 text-muted-foreground">
          {projectionNote}
        </div>
      </LedgerPanel>
    </PublicPoolShell>
  );
}

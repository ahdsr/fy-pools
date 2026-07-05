import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Trophy } from "lucide-react";

import { LedgerPanel } from "@/components/app/ledger";
import { StatGrid } from "@/components/app/pool-public-widgets";
import {
  PublicPoolMetaCard,
  PublicPoolShell,
} from "@/components/app/public-pool-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { findEntryScenarioProjection } from "@/lib/world-cup-pool/opponent-paths";
import type {
  EntryScenarioProjection,
  ScenarioEventScore,
} from "@/lib/world-cup-pool/opponent-paths";
import { getPublicPoolStandings } from "@/lib/world-cup-pool/public-pool";
import type { LeaderboardRow } from "@/lib/world-cup-pool/types";

const projectionNote =
  "This is not a probability model. Each path scores the same result across every entry, so shared picks can still leave an entry behind.";

type ProjectionsPageProps = {
  params: Promise<{ poolSlug: string }>;
  searchParams: Promise<{ entry?: string | string[] }>;
};

function projectionRows(rows: PoolAnalyticsRow[]) {
  return rows.slice().sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (b.currentTotal !== a.currentTotal) return b.currentTotal - a.currentTotal;
    return a.name.localeCompare(b.name);
  });
}

function buildScenarioRoutes({
  analyticsRows,
  pool,
  selectedId,
}: {
  analyticsRows: PoolAnalyticsRow[];
  pool: NonNullable<Awaited<ReturnType<typeof getPublicPoolStandings>>>["pool"];
  selectedId: string;
}) {
  const routes = new Map<string, EntryScenarioProjection>();

  for (const row of analyticsRows) {
    const focused = row.id === selectedId;
    const projection = findEntryScenarioProjection({
      entriesConfig: pool.entriesConfig,
      picksByPath: pool.picksByPath,
      results: pool.results,
      entryId: row.id,
      maxEvents: focused ? 5 : 3,
      candidateLimit: focused ? 18 : 10,
    });
    if (projection) routes.set(row.id, projection);
  }

  return routes;
}

function routeLabel(projection?: EntryScenarioProjection) {
  if (!projection) return "No projection";
  if (projection.eventCount === 0 && projection.projectedRank === 1) {
    return "Current #1";
  }

  const tieLabel = projection.tiedForFirst ? " tied" : "";
  return `Projects #${projection.projectedRank}${tieLabel} · +${projection.routeCovered}`;
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
  projection,
}: {
  row: PoolAnalyticsRow;
  publicSlug: string;
  projection?: EntryScenarioProjection;
}) {
  const canFinishFirst = Boolean(projection?.canFinishFirst);

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
            canFinishFirst ? "Can finish #1" : "Capped",
            canFinishFirst,
          )}
          {projection ? (
            <p className="mt-1 text-xs leading-4 text-muted-foreground">
              {routeLabel(projection)}
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

function leaderName({ leaderNames }: { leaderNames: string[] }) {
  const label = formatList(leaderNames) || "The leader";
  return label;
}

function leaderNote({ leaderTotal }: { leaderTotal: number }) {
  return `${leaderTotal} pts now`;
}

function preferredSelectedEntryId({
  requestedEntry,
  rows,
  leaderId,
  defaultEntryId,
}: {
  requestedEntry?: string | string[];
  rows: PoolAnalyticsRow[];
  leaderId?: string;
  defaultEntryId?: string;
}) {
  const requested = Array.isArray(requestedEntry)
    ? requestedEntry[0]
    : requestedEntry;
  if (requested && rows.some((row) => row.id === requested)) return requested;

  if (defaultEntryId && defaultEntryId !== leaderId) return defaultEntryId;

  return rows.find((row) => row.id !== leaderId)?.id ?? rows[0]?.id ?? "";
}

function alsoHelpsLabel(event: ScenarioEventScore, selectedId: string) {
  const names = event.scorerNames.filter(
    (_, scorerIndex) => event.scorerIds[scorerIndex] !== selectedId,
  );
  if (!names.length) return "";

  const visibleNames = names.slice(0, 4);
  const remainingCount = names.length - visibleNames.length;
  return ` · Also helps ${visibleNames.join(", ")}${
    remainingCount > 0 ? `, and ${remainingCount} more` : ""
  }`;
}

function PathEventList({
  events,
  selectedId,
}: {
  events: ScenarioEventScore[];
  selectedId: string;
}) {
  if (!events.length) {
    return (
      <p className="rounded-lg border bg-background px-3 py-3 text-sm leading-6 text-muted-foreground">
        Stay ahead of every remaining challenger. No extra route event is needed
        while this entry is already first.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {events.map((event, index) => (
        <div
          key={event.id}
          className="grid gap-3 rounded-lg border bg-background px-3 py-3 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-start"
        >
          <span className="grid size-8 place-items-center rounded-full border bg-surface-paper text-sm font-bold text-brand-ink">
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="text-base font-semibold leading-6 text-brand-ink">
              {event.title}
            </p>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {event.category} result
              {alsoHelpsLabel(event, selectedId)}
            </p>
          </div>
          <Badge variant="outline">+{event.selectedPoints} pts</Badge>
        </div>
      ))}
    </div>
  );
}

function FocusedWinPath({
  rows,
  publicSlug,
  selectedId,
  leader,
  routes,
}: {
  rows: PoolAnalyticsRow[];
  publicSlug: string;
  selectedId: string;
  leader?: LeaderboardRow;
  routes: Map<string, EntryScenarioProjection>;
}) {
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0];
  if (!selected) return null;

  const route = routes.get(selected.id);
  const isLeader = selected.id === leader?.id;
  const canWin = Boolean(route?.canFinishFirst);
  const gap = Math.max(0, (leader?.score.total ?? 0) - selected.currentTotal);
  const events = route?.events ?? [];
  const routeCovered = route?.routeCovered ?? 0;
  const projectedRank = route?.projectedRank ?? selected.rank;
  const projectedTotal = route?.projectedTotal ?? selected.currentTotal;
  const blockers = route?.blockers ?? [];

  return (
    <LedgerPanel
      title={`Path for ${selected.name}`}
      description={
        isLeader
          ? "This entry is currently first. The path is about holding off everyone behind it."
          : "The best current route found after scoring the same results across every entry."
      }
      action={
        <Badge
          variant={canWin ? "secondary" : "outline"}
          className={
            canWin
              ? "border-cta-green/25 bg-cta-green-soft text-brand-ink"
              : undefined
          }
        >
          {isLeader
            ? "Currently #1"
            : canWin
              ? route?.tiedForFirst
                ? "Can tie #1"
                : "Can finish #1"
              : `Projects #${projectedRank}`}
        </Badge>
      }
    >
      <div className="space-y-5 p-5">
        <form
          action={`/pools/${publicSlug}/projections`}
          className="flex flex-col gap-3 rounded-lg border bg-background px-3 py-3 sm:flex-row sm:items-end"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <label
              htmlFor="entry-path-select"
              className="text-xs font-semibold uppercase tracking-normal text-muted-foreground"
            >
              Entry
            </label>
            <select
              id="entry-path-select"
              name="entry"
              defaultValue={selected.id}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-medium text-brand-ink outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
            >
              {rows.map((row) => (
                <option key={row.id} value={row.id}>
                  #{row.rank} - {row.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="secondaryGreen">
            Show path <ArrowRight />
          </Button>
        </form>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-background px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Current place
            </p>
            <p className="mt-2 text-2xl font-semibold leading-none text-brand-ink">
              #{selected.rank}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {selected.currentTotal} pts
            </p>
          </div>
          <div className="rounded-lg border bg-background px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Gap to #1
            </p>
            <p className="mt-2 text-2xl font-semibold leading-none text-brand-ink">
              {gap} pts
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {leader?.name ?? "Leader"} has {leader?.score.total ?? 0}
            </p>
          </div>
          <div className="rounded-lg border bg-background px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Route found
            </p>
            <p className="mt-2 text-2xl font-semibold leading-none text-brand-ink">
              +{routeCovered}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              projected route pts
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-background px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                Projected finish if this path hits
              </p>
              <p className="mt-2 text-2xl font-semibold leading-none text-brand-ink">
                #{projectedRank}
                {route?.tiedForFirst ? " tied" : ""}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-sm font-semibold text-brand-ink">
                {projectedTotal} pts
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                after scoring every matching entry
              </p>
            </div>
          </div>
          {!canWin && blockers.length ? (
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Still blocked by {formatList(blockers.slice(0, 4).map((row) => row.name))}
              {blockers.length > 4 ? ` and ${blockers.length - 4} more` : ""}.
            </p>
          ) : null}
        </div>

        {canWin ? (
          <div className="rounded-lg border border-cta-green/25 bg-cta-green-soft px-4 py-3">
            <div className="flex gap-3">
              <Trophy className="mt-0.5 size-5 shrink-0 text-brand-mark" />
              <div>
                <p className="font-semibold text-brand-ink">
                  What needs to happen
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  These are the smallest unique scoring events currently found.
                  If they hit, the full-pool projection puts this entry at
                  #{projectedRank}
                  {route?.tiedForFirst ? " tied" : ""}.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-background px-4 py-3">
            <p className="font-semibold text-brand-ink">No complete path found</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Current remaining unique picks do not cover the gap to #1. This
              can change after new results, but the best path currently found
              projects this entry to #{projectedRank}.
            </p>
          </div>
        )}

        <PathEventList events={events.slice(0, 5)} selectedId={selected.id} />

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/pools/${publicSlug}/entry/${selected.id}`}>
              Open entry details
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/pools/${publicSlug}#leaderboard`}>
              Back to standings
            </Link>
          </Button>
        </div>
      </div>
    </LedgerPanel>
  );
}

function WinPathCards({
  rows,
  publicSlug,
  routes,
}: {
  rows: PoolAnalyticsRow[];
  publicSlug: string;
  routes: Map<string, EntryScenarioProjection>;
}) {
  const contenders = rows
    .filter((row) => routes.get(row.id)?.canFinishFirst)
    .sort((a, b) => {
      const left = routes.get(a.id);
      const right = routes.get(b.id);
      if ((left?.eventCount ?? 0) !== (right?.eventCount ?? 0)) {
        return (left?.eventCount ?? 0) - (right?.eventCount ?? 0);
      }
      return a.rank - b.rank;
    })
    .slice(0, 8);

  if (!contenders.length) return null;

  return (
    <LedgerPanel
      title="Other live paths"
      description="A scan of other entries whose best current scenario reaches #1 after all matching picks are scored."
    >
      <div className="grid gap-4 p-4 lg:grid-cols-2">
        {contenders.map((row) => {
          const route = routes.get(row.id);
          const events = route?.events ?? [];

          return (
            <div key={row.id} className="rounded-lg border bg-background/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/pools/${publicSlug}/entry/${row.id}`}
                    className="font-semibold text-brand-ink hover:text-brand-hot"
                  >
                    {row.name}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.currentTotal} pts now · {routeLabel(route)}
                  </p>
                </div>
                {statusBadge(route?.tiedForFirst ? "Can tie" : "Can win", true)}
              </div>
              {events.length ? (
                <div className="mt-4 grid gap-3 border-l pl-4">
                  {events.slice(0, 4).map((event, index) => (
                    <div key={event.id} className="relative">
                      <span
                        aria-hidden="true"
                        className="absolute -left-[1.48rem] top-0 grid size-5 place-items-center rounded-full border bg-surface-paper text-[0.65rem] font-bold text-brand-ink"
                      >
                        {index + 1}
                      </span>
                      <p className="text-sm font-semibold leading-5 text-brand-ink">
                        {event.title}
                      </p>
                      <p className="text-xs leading-4 text-muted-foreground">
                        {event.category} · +{event.selectedPoints} route pts
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                  Current leader path.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </LedgerPanel>
  );
}

export default async function ProjectionsPage({
  params,
  searchParams,
}: ProjectionsPageProps) {
  const { poolSlug } = await params;
  const { entry } = await searchParams;
  const standings = await getPublicPoolStandings(poolSlug);
  if (!standings) notFound();

  const { pool, rows: currentRows, analytics, publicSlug } = standings;
  const rows = projectionRows(analytics.rows);
  const leader = currentRows[0];
  const selectedId = preferredSelectedEntryId({
    requestedEntry: entry,
    rows,
    leaderId: leader?.id,
    defaultEntryId: pool.entriesConfig.defaultEntryId,
  });
  const scenarioRoutes = buildScenarioRoutes({
    analyticsRows: analytics.rows,
    pool,
    selectedId,
  });
  const leaderPassCount = analytics.rows.filter(
    (row) => scenarioRoutes.get(row.id)?.canFinishFirst,
  ).length;
  const scoreRefreshLabel = formatDateTime(pool.results.meta?.lastUpdated);

  return (
    <PublicPoolShell
      poolName={pool.entriesConfig.poolName}
      eyebrow="Projections"
      title="Who can still pass #1?"
      description="Best current finish scenarios based on everyone's remaining picks."
      scoreRefreshLabel={scoreRefreshLabel}
      meta={
        <PublicPoolMetaCard
          label="Prize range"
          value={`Top ${analytics.payoutPlaces}`}
        />
      }
    >
      <LedgerPanel>
        <StatGrid
          stats={[
            {
              label: "Current leader",
              value: leaderName(analytics),
              note: leaderNote(analytics),
            },
            {
              label: "Can pass leader",
              value: `${leaderPassCount}/${analytics.rows.length}`,
              note: "Full-pool path reaches #1",
            },
            {
              label: "Best selected finish",
              value: `#${scenarioRoutes.get(selectedId)?.projectedRank ?? "-"}`,
              note: scenarioRoutes.get(selectedId)?.canFinishFirst
                ? "Selected entry can reach #1"
                : "Selected entry is currently capped",
            },
            {
              label: `Top ${analytics.payoutPlaces} race`,
              value: `${analytics.payoutAliveCount}/${analytics.rows.length}`,
              note: "Can still reach payout range",
            },
          ]}
        />
      </LedgerPanel>

      <FocusedWinPath
        rows={rows}
        publicSlug={publicSlug}
        selectedId={selectedId}
        leader={leader}
        routes={scenarioRoutes}
      />

      <WinPathCards
        rows={rows}
        publicSlug={publicSlug}
        routes={scenarioRoutes}
      />

      <LedgerPanel
        title="Pool projections"
        description="Projection rank is calculated after applying the same route events to every matching entry."
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
                <TableHead>Best path</TableHead>
                <TableHead>Top {analytics.payoutPlaces}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <ProjectionRow
                  key={row.id}
                  row={row}
                  publicSlug={publicSlug}
                  projection={scenarioRoutes.get(row.id)}
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

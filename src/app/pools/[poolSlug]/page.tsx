import { Info } from "lucide-react";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { LeaderboardTable } from "@/components/app/leaderboard-table";
import { TournamentRace } from "@/components/app/tournament-race";
import { DoubleDownPanel } from "@/components/app/double-down-panel";
import { placeDoubleDownCallAction } from "@/app/pools/[poolSlug]/double-down-actions";
import {
  LatestUpdatesPanel,
  PayoutPanel,
} from "@/components/app/pool-public-widgets";
import {
  PublicPoolScoreRefresh,
  PublicPoolShell,
} from "@/components/app/public-pool-shell";
import {
  RoundOf16BracketPanel,
  RoundOf16EntrantsPanel,
  RoundOf16PublicStats,
  RoundOf16ViewerEntryPanel,
} from "@/components/app/round-of-16-public-panels";
import { getPublicRoundOf16Pool } from "@/lib/round-of-16/public";
import { getPublicNbaSeriesPool } from "@/lib/nba-series/persistence";
import { NbaSeriesPublicPanels } from "@/components/app/nba-series-public-panels";
import { rankedFinishDeadlineHasPassed } from "@/lib/ranked-finish/engine";
import { getPublicRankedFinishPool } from "@/lib/ranked-finish/persistence";
import { RankedFinishPublicPanels } from "@/components/app/ranked-finish-public-panels";
import { getPoolRuntimeTargetBySlug } from "@/lib/templates/runtime-dispatch";
import { getKnockoutPoolStageDetails } from "@/lib/templates/round-of-16-draft";
import { getReferencePicks } from "@/lib/world-cup-pool/current-match";
import {
  formatDateTime,
  getPublicPoolRouteInfo,
  liveScoreMatchDates,
  scoreRefreshLabel,
  scoreRefreshSourceLabel,
} from "@/lib/world-cup-pool/data";
import { getPublicPoolStandings } from "@/lib/world-cup-pool/public-pool";
import { getDoubleDownPublicSnapshot } from "@/lib/double-down/persistence";

type PoolPageProps = {
  params: Promise<{ poolSlug: string }>;
  searchParams: Promise<{ picks?: string; invite?: string }>;
};

export const unstable_instant = {
  prefetch: "runtime",
  samples: [{ params: { poolSlug: "marcins-2026-world-cup-pool" }, searchParams: { picks: null, invite: null } }],
};

const currentStandingsInfo =
  "These standings are not final. Current scores are based on results entered so far: group picks use the current group order, third-place qualifiers count only once entered or final, and knockout/finals/bonus points use completed or entered outcomes. That means the table can be skewed by today's partial results until every result is final.";

export default function PoolPage({ params, searchParams }: PoolPageProps) {
  return (
    <Suspense fallback={<PoolRouteFallback />}>
      {Promise.all([params, searchParams]).then(([{ poolSlug }, { picks, invite }]) => (
        <PoolPageContent poolSlug={poolSlug} picksSubmitted={picks === "submitted"} inviteCode={invite} />
      ))}
    </Suspense>
  );
}

async function PoolPageContent({ poolSlug, picksSubmitted, inviteCode }: { poolSlug: string; picksSubmitted: boolean; inviteCode?: string }) {
  const routeInfo = await getPublicPoolRouteInfo(poolSlug);

  if (routeInfo) {
    return (
      <PublicPoolShell
        poolName={routeInfo.poolName}
        eyebrow="Leaderboard"
        title={routeInfo.poolName}
      >
        <Suspense fallback={<PoolDetailsFallback />}>
          <WorldCupPoolDetails poolSlug={poolSlug} />
        </Suspense>
      </PublicPoolShell>
    );
  }

  return <RoundOf16PoolPage poolSlug={poolSlug} picksSubmitted={picksSubmitted} inviteCode={inviteCode} />;
}

async function RoundOf16PoolPage({ poolSlug, picksSubmitted, inviteCode }: { poolSlug: string; picksSubmitted: boolean; inviteCode?: string }) {
  const target = await getPoolRuntimeTargetBySlug(poolSlug);
  if (target?.runtime === "nba-series") {
    const pool = await getPublicNbaSeriesPool(poolSlug);
    if (pool) return <PublicPoolShell poolName={pool.poolName} title={pool.poolName} description={pool.settings.basics.description || "NBA playoff series picks, simulation results, and standings."}><NbaSeriesPublicPanels pool={pool} /></PublicPoolShell>;
  }
  if (target?.runtime === "ranked-finish") {
    const pool = await getPublicRankedFinishPool(poolSlug, target.templateSlug);
    if (pool) {
      const editPicksHref = picksSubmitted && inviteCode && !rankedFinishDeadlineHasPassed(pool.settings)
        ? `/join/${encodeURIComponent(inviteCode)}`
        : undefined;
      return <PublicPoolShell poolName={pool.poolName} title={pool.poolName} description={pool.settings.basics.description || target.templateDescription} picksSubmitted={picksSubmitted} editPicksHref={editPicksHref}><RankedFinishPublicPanels pool={pool} participantNoun={target.competitorNoun} /></PublicPoolShell>;
    }
  }
  const roundOf16Pool = await getPublicRoundOf16Pool(poolSlug, {
    includeViewer: false,
  });

  if (roundOf16Pool) {
    const stage = getKnockoutPoolStageDetails(roundOf16Pool.settings);
    return (
      <PublicPoolShell
        poolName={roundOf16Pool.poolName}
        eyebrow="Leaderboard"
        title={roundOf16Pool.poolName}
        description={
          roundOf16Pool.settings.basics.description ||
          `${stage.pluralLabel} picks, scoring, and public standings.`
        }
        scoreRefreshLabel={
          roundOf16Pool.latestStandingsCalculatedAt
            ? formatDateTime(roundOf16Pool.latestStandingsCalculatedAt)
            : undefined
        }
      >
        <RoundOf16PublicStats pool={roundOf16Pool} />

        <Suspense fallback={null}>
          <RoundOf16ViewerEntryStream poolSlug={poolSlug} />
        </Suspense>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
          <RoundOf16BracketPanel
            settings={roundOf16Pool.settings}
            standings={roundOf16Pool.latestStandings}
          />
          <RoundOf16EntrantsPanel
            entries={roundOf16Pool.entries}
            poolSlug={roundOf16Pool.poolSlug}
            picksArePublic={roundOf16Pool.picksArePublic}
          />
        </section>
      </PublicPoolShell>
    );
  }

  notFound();
}

async function WorldCupPoolDetails({ poolSlug }: { poolSlug: string }) {
  const standings = await getPublicPoolStandings(poolSlug);
  if (!standings) notFound();

  const { pool, rows, analytics, publicSlug } = standings;
  const referencePicks = getReferencePicks(pool.picksByPath);
  const doubleDown = await getDoubleDownPublicSnapshot(publicSlug);

  return (
    <>
      {doubleDown ? (
        <DoubleDownPanel
          snapshot={doubleDown}
          placeCallAction={placeDoubleDownCallAction.bind(null, publicSlug)}
        />
      ) : null}

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
        >
          <LeaderboardTable rows={rows} poolSlug={publicSlug} />
        </LedgerPanel>

        <aside className="grid gap-5">
          <LedgerPanel>
            <LedgerRows>
              <LedgerRow>
                <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground sm:text-sm">
                  Entries
                </p>
                <p className="mt-2 text-2xl font-semibold leading-none text-brand-ink sm:text-3xl">
                  {rows.length}
                </p>
                <p className="mt-2 text-[0.9375rem] font-normal leading-6 text-muted-foreground sm:text-sm sm:leading-5">
                  Imported from submitted picks
                </p>
              </LedgerRow>
              <LedgerRow>
                <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground sm:text-sm">
                  First place
                </p>
                <p className="mt-2 text-2xl font-semibold leading-none text-brand-ink sm:text-3xl">
                  {rows[0]?.name ?? "TBD"}
                </p>
                <p className="mt-2 text-[0.9375rem] font-normal leading-6 text-muted-foreground sm:text-sm sm:leading-5">
                  {analytics.leaderTotal} points
                </p>
              </LedgerRow>
              <LedgerRow>
                <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground sm:text-sm">
                  Prize pool
                </p>
                <p className="mt-2 text-2xl font-semibold leading-none text-brand-ink sm:text-3xl">
                  {pool.entriesConfig.prizePoolLabel ?? "TBD"}
                </p>
                <p className="mt-2 text-[0.9375rem] font-normal leading-6 text-muted-foreground sm:text-sm sm:leading-5">
                  {analytics.payoutPlaces} payout places
                </p>
              </LedgerRow>
            </LedgerRows>
          </LedgerPanel>
          <LatestUpdatesPanel
            results={pool.results}
            referencePicks={referencePicks}
          />
          <PayoutPanel entriesConfig={pool.entriesConfig} compact />
        </aside>
      </section>
      <PublicPoolScoreRefresh
        liveScoreMatchDates={liveScoreMatchDates(pool)}
        scoreRefreshLabel={scoreRefreshLabel(pool)}
        scoreRefreshSource={scoreRefreshSourceLabel(pool)}
      />
      {referencePicks ? (
        <TournamentRace
          entriesConfig={pool.entriesConfig}
          picksByPath={Array.from(pool.picksByPath.entries())}
          results={pool.results}
          referencePicks={referencePicks}
        />
      ) : null}
    </>
  );
}

function PoolRouteFallback() {
  return (
    <LedgerPanel title="Loading pool" description="Preparing public pool details.">
      <div className="grid gap-3 p-5">
        <div className="h-24 animate-pulse rounded-md bg-muted/80" />
        <div className="h-56 animate-pulse rounded-md bg-muted/80" />
      </div>
    </LedgerPanel>
  );
}

function PoolDetailsFallback() {
  return (
    <>
      <LedgerPanel title="Loading standings" description="Calculating the latest pool scores.">
        <div className="grid gap-3 p-5 md:grid-cols-3">
          <div className="h-24 animate-pulse rounded-md bg-muted/80" />
          <div className="h-24 animate-pulse rounded-md bg-muted/80" />
          <div className="h-24 animate-pulse rounded-md bg-muted/80" />
        </div>
      </LedgerPanel>
      <LedgerPanel title="Loading entries" description="Preparing the current leaderboard.">
        <div className="grid gap-3 p-5">
          <div className="h-12 animate-pulse rounded-md bg-muted/80" />
          <div className="h-12 animate-pulse rounded-md bg-muted/80" />
          <div className="h-12 animate-pulse rounded-md bg-muted/80" />
        </div>
      </LedgerPanel>
    </>
  );
}

async function RoundOf16ViewerEntryStream({
  poolSlug,
}: {
  poolSlug: string;
}) {
  const pool = await getPublicRoundOf16Pool(poolSlug);
  if (!pool?.viewerEntry) return null;

  return (
    <RoundOf16ViewerEntryPanel
      entry={pool.viewerEntry}
      settings={pool.settings}
    />
  );
}

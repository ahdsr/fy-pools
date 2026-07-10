import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CirclePlus } from "lucide-react";

import { FullEntryAuditPanel } from "@/components/app/entry-detail-panels";
import { EntryMovementPanel } from "@/components/app/entry-movement-panel";
import { LedgerPanel } from "@/components/app/ledger";
import { LiveScoreRefresh } from "@/components/app/live-score-refresh";
import { ScoreCards } from "@/components/app/pool-public-widgets";
import { PublicPoolShell } from "@/components/app/public-pool-shell";
import { RoundOf16EntryDetail } from "@/components/app/round-of-16-public-panels";
import { WorldCupBracket } from "@/components/app/world-cup-bracket";
import { Button } from "@/components/ui/button";
import { getPublicRoundOf16Pool } from "@/lib/round-of-16/public";
import {
  formatDateTime,
  getPublicEntryRouteInfo,
  getPublicPool,
  liveScoreMatchDates,
} from "@/lib/world-cup-pool/data";
import { buildEntryMovementDigest } from "@/lib/world-cup-pool/entry-movement-digest";
import { buildFutureLeverageReport } from "@/lib/world-cup-pool/future-leverage";
import {
  buildOpponentPathsReport,
  findEntryScenarioProjection,
} from "@/lib/world-cup-pool/opponent-paths";
import { getEntryAnalysisSnapshot } from "@/lib/world-cup-pool/public-pool";
import { buildTodaysResultsReport } from "@/lib/world-cup-pool/todays-results";

type EntryPageProps = {
  params: Promise<{ poolSlug: string; entryId: string }>;
};

export const unstable_instant = {
  prefetch: "runtime",
  samples: [
    {
      params: {
        poolSlug: "marcins-2026-world-cup-pool",
        entryId: "lucas-czuchraj",
      },
    },
  ],
};

function getEntryInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export async function generateStaticParams({
  params,
}: {
  params: { poolSlug: string };
}) {
  const pool = await getPublicPool(params.poolSlug);

  return (
    pool?.entriesConfig.entries
      .filter((entry) => Boolean(entry.picksPath))
      .map((entry) => ({ entryId: entry.id })) ?? []
  );
}

export default function EntryPage({ params }: EntryPageProps) {
  return (
    <Suspense fallback={<EntryRouteFallback />}>
      {params.then(({ poolSlug, entryId }) => (
        <EntryPageContent poolSlug={poolSlug} entryId={entryId} />
      ))}
    </Suspense>
  );
}

async function EntryPageContent({
  poolSlug,
  entryId,
}: {
  poolSlug: string;
  entryId: string;
}) {
  const routeInfo = await getPublicEntryRouteInfo(poolSlug, entryId);

  if (routeInfo) {
    return (
      <PublicPoolShell
        poolName={routeInfo.poolName}
        eyebrow={null}
        title={<EntryTitle name={routeInfo.entry.name} />}
        description={
          routeInfo.entry.quote ??
          routeInfo.entry.celebrationQuote ??
          "Winning it all!"
        }
        descriptionClassName="ml-[5rem] sm:ml-[6.25rem]"
        meta={<CreatePoolCta />}
      >
        <EntryNavigation poolSlug={routeInfo.poolSlug} />
        <Suspense fallback={<EntryDetailsFallback />}>
          <StaticEntryDetailStream poolSlug={poolSlug} entryId={entryId} />
        </Suspense>
      </PublicPoolShell>
    );
  }

  const roundOf16Pool = await getPublicRoundOf16Pool(poolSlug);

  if (roundOf16Pool) {
    const entry = roundOf16Pool.entries.find((item) => item.entryId === entryId);
    if (!entry) notFound();
    if (!entry.picks) notFound();

    const standing = roundOf16Pool.latestStandings.find(
      (row) => row.entryId === entry.entryId,
    );
    const detailEntry = {
      ...entry,
      picks: entry.picks,
      editHref: "",
      canEdit: false,
    };

    return (
      <PublicPoolShell
        poolName={roundOf16Pool.poolName}
        eyebrow="Entry detail"
        title={entry.entryName}
        description={`Submitted ${formatDateTime(entry.submittedAt)}.`}
      >
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="secondaryGreen">
            <Link href={`/pools/${roundOf16Pool.poolSlug}#leaderboard`}>
              Back to standings
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/pools/${roundOf16Pool.poolSlug}/bracket`}>
              View bracket
            </Link>
          </Button>
        </div>

        <RoundOf16EntryDetail
          entry={detailEntry}
          settings={roundOf16Pool.settings}
          standing={standing}
        />
      </PublicPoolShell>
    );
  }

  const snapshot = await getEntryAnalysisSnapshot(poolSlug, entryId);
  if (!snapshot) notFound();

  return (
    <PublicPoolShell
      poolName={snapshot.pool.entriesConfig.poolName}
      eyebrow={null}
      title={<EntryTitle name={snapshot.entry.name} />}
      description={
        snapshot.entry.quote ??
        snapshot.entry.celebrationQuote ??
        "Winning it all!"
      }
      descriptionClassName="ml-[5rem] sm:ml-[6.25rem]"
      meta={<CreatePoolCta />}
    >
      <EntryNavigation poolSlug={snapshot.publicSlug} />
      <EntryDetails snapshot={snapshot} />
    </PublicPoolShell>
  );
}

async function StaticEntryDetailStream({
  poolSlug,
  entryId,
}: {
  poolSlug: string;
  entryId: string;
}) {
  const snapshot = await getEntryAnalysisSnapshot(poolSlug, entryId);
  if (!snapshot) notFound();

  return <EntryDetails snapshot={snapshot} />;
}

function EntryDetails({
  snapshot,
}: {
  snapshot: NonNullable<Awaited<ReturnType<typeof getEntryAnalysisSnapshot>>>;
}) {
  const {
    pool,
    entry,
    picks,
    leaderboardRows,
    entryRow,
    score,
    submittedBracket,
  } = snapshot;

  return (
    <>
      <LiveScoreRefresh matchDates={liveScoreMatchDates(pool)} />

      <ScoreCards
        score={score}
        position={
          entryRow
            ? {
                rank: entryRow.rank,
                totalEntries: leaderboardRows.length,
              }
            : undefined
        }
      />

      <Suspense fallback={<EntryMovementFallback />}>
        <EntryMovementStream
          poolSlug={pool.slug}
          entryId={entry.id}
        />
      </Suspense>

      <FullEntryAuditPanel
        picks={picks}
        results={pool.results}
        score={score}
        bracket={
          submittedBracket ? (
            <WorldCupBracket
              rounds={submittedBracket.rounds}
              thirdPlace={submittedBracket.thirdPlace}
              picks={picks}
            />
          ) : undefined
        }
      />
    </>
  );
}

function EntryTitle({ name }: { name: string }) {
  return (
    <span className="flex min-w-0 items-center gap-4 sm:gap-5">
      <span
        aria-hidden="true"
        className="flex size-16 shrink-0 items-center justify-center rounded-full border border-brand-rule/70 bg-surface-paper text-lg font-semibold leading-none text-brand-mark shadow-[0_12px_28px_color-mix(in_oklch,black,transparent_86%)] sm:size-20 sm:text-2xl"
      >
        {getEntryInitials(name)}
      </span>
      <span className="min-w-0 break-words">{name}</span>
    </span>
  );
}

function EntryNavigation({ poolSlug }: { poolSlug: string }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button asChild variant="secondaryGreen">
        <Link href={`/pools/${poolSlug}#leaderboard`}>Back to standings</Link>
      </Button>
      <Button asChild variant="outline">
        <Link href={`/pools/${poolSlug}/projections`}>View projections</Link>
      </Button>
    </div>
  );
}

function EntryRouteFallback() {
  return (
    <LedgerPanel
      title="Loading entry"
      description="Preparing the entry details."
    >
      <div className="grid gap-3 p-5">
        <div className="h-16 animate-pulse rounded-md bg-muted/80" />
        <div className="h-16 animate-pulse rounded-md bg-muted/80" />
      </div>
    </LedgerPanel>
  );
}

function EntryDetailsFallback() {
  return (
    <>
      <LedgerPanel
        title="Loading score details"
        description="Updating this entry's score and standing."
      >
        <div className="grid gap-3 p-5 md:grid-cols-3">
          <div className="h-24 animate-pulse rounded-md bg-muted/80" />
          <div className="h-24 animate-pulse rounded-md bg-muted/80" />
          <div className="h-24 animate-pulse rounded-md bg-muted/80" />
        </div>
      </LedgerPanel>
      <LedgerPanel
        title="Loading picks"
        description="Preparing the score breakdown and bracket."
      >
        <div className="grid gap-3 p-5">
          <div className="h-12 animate-pulse rounded-md bg-muted/80" />
          <div className="h-12 animate-pulse rounded-md bg-muted/80" />
          <div className="h-12 animate-pulse rounded-md bg-muted/80" />
        </div>
      </LedgerPanel>
    </>
  );
}

async function EntryMovementStream({
  poolSlug,
  entryId,
}: {
  poolSlug: string;
  entryId: string;
}) {
  await new Promise((resolve) => setTimeout(resolve, 0));

  const snapshot = await getEntryAnalysisSnapshot(poolSlug, entryId);
  if (!snapshot) return null;

  const {
    pool,
    entry,
    picks,
    leaderboardRows,
    analytics,
  } = snapshot;
  const todaysResults = buildTodaysResultsReport({
    entriesConfig: pool.entriesConfig,
    picksByPath: pool.picksByPath,
    results: pool.results,
    entryId: entry.id,
    referencePicks: picks,
  });
  const opponentPaths = buildOpponentPathsReport({
    entriesConfig: pool.entriesConfig,
    picksByPath: pool.picksByPath,
    results: pool.results,
    entryId: entry.id,
  });
  const futureLeverage = buildFutureLeverageReport({
    entriesConfig: pool.entriesConfig,
    picksByPath: pool.picksByPath,
    results: pool.results,
    entryId: entry.id,
    referencePicks: picks,
  });
  const scenarioProjection = findEntryScenarioProjection({
    entriesConfig: pool.entriesConfig,
    picksByPath: pool.picksByPath,
    results: pool.results,
    entryId: entry.id,
    maxEvents: 5,
    candidateLimit: 10,
  });
  const movementDigest = buildEntryMovementDigest({
    entryId: entry.id,
    leaderboardRows,
    todaysResults,
    futureLeverage,
    opponentPaths,
    scenarioProjection,
    analytics,
  });

  return <EntryMovementPanel digest={movementDigest} />;
}

function EntryMovementFallback() {
  return (
    <LedgerPanel
      title="Finding movement paths"
      description="Checking upcoming matches, close rivals, and win scenarios."
    >
      <div className="grid gap-3 p-5">
        <div className="h-16 animate-pulse rounded-md bg-muted/80" />
        <div className="h-16 animate-pulse rounded-md bg-muted/80" />
        <div className="h-16 animate-pulse rounded-md bg-muted/80" />
      </div>
    </LedgerPanel>
  );
}

function getSignupHref() {
  const nextPath = "/dashboard/pools/new";
  return `/sign-up?next=${encodeURIComponent(nextPath)}`;
}

function CreatePoolCta() {
  return (
    <aside className="relative isolate overflow-hidden rounded-2xl border border-brand-ink bg-brand-ink p-5 text-surface-paper shadow-[0_18px_44px_color-mix(in_oklch,var(--brand-ink),transparent_70%)]">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1 bg-cta-green"
      />
      <CirclePlus
        className="size-9 text-cta-green"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <p className="mt-5 text-2xl font-semibold leading-[1.04] tracking-[-0.03em] text-surface-paper">
        Start your own pool
      </p>
      <p className="mt-2 text-sm leading-5 text-surface-paper/70">
        Make the next round yours.
      </p>
      <Button asChild variant="primaryGreen" className="mt-5 w-full">
        <Link href={getSignupHref()}>
          Create a pool <CirclePlus />
        </Link>
      </Button>
    </aside>
  );
}

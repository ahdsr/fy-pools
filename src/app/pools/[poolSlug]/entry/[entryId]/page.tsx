import Link from "next/link";
import { notFound } from "next/navigation";
import { CirclePlus } from "lucide-react";

import { FullEntryAuditPanel } from "@/components/app/entry-detail-panels";
import { EntryMovementPanel } from "@/components/app/entry-movement-panel";
import { LedgerPanel } from "@/components/app/ledger";
import { ScoreCards } from "@/components/app/pool-public-widgets";
import {
  PublicPoolShell,
} from "@/components/app/public-pool-shell";
import { RoundOf16EntryDetail } from "@/components/app/round-of-16-public-panels";
import { WorldCupBracket } from "@/components/app/world-cup-bracket";
import { Button } from "@/components/ui/button";
import { getPublicRoundOf16Pool } from "@/lib/round-of-16/public";
import { buildPickedBracketView } from "@/lib/world-cup-pool/bracket";
import { formatDateTime, getPublicPool } from "@/lib/world-cup-pool/data";
import { buildEntryMovementDigest } from "@/lib/world-cup-pool/entry-movement-digest";
import { buildFutureLeverageReport } from "@/lib/world-cup-pool/future-leverage";
import {
  buildLeaderboardRows,
  buildPoolAnalytics,
} from "@/lib/world-cup-pool/leaderboard";
import { buildOpponentPathsReport } from "@/lib/world-cup-pool/opponent-paths";
import { scorePool } from "@/lib/world-cup-pool/scoring";
import { buildTodaysResultsReport } from "@/lib/world-cup-pool/todays-results";

type EntryPageProps = {
  params: Promise<{ poolSlug: string; entryId: string }>;
};

export const dynamicParams = true;

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

export default async function EntryPage({ params }: EntryPageProps) {
  const { poolSlug, entryId } = await params;
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

  const pool = await getPublicPool(poolSlug);
  if (!pool) notFound();

  const entry = pool.entriesConfig.entries.find((item) => item.id === entryId);
  if (!entry?.picksPath) notFound();

  const picks = pool.picksByPath.get(entry.picksPath);
  if (!picks) notFound();

  const leaderboardRows = buildLeaderboardRows(
    pool.entriesConfig,
    pool.picksByPath,
    pool.results,
  );
  const entryRow = leaderboardRows.find((row) => row.id === entry.id);
  const score = entryRow?.score ?? scorePool(picks, pool.results);
  const submittedBracket = buildPickedBracketView(picks);
  const publicSlug = pool.slug;
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
  const movementDigest = buildEntryMovementDigest({
    entryId: entry.id,
    leaderboardRows,
    todaysResults,
    futureLeverage,
    opponentPaths,
    analytics: buildPoolAnalytics(
      pool.entriesConfig,
      pool.picksByPath,
      pool.results,
      leaderboardRows,
    ),
  });
  const scoreRefreshLabel = formatDateTime(pool.results.meta?.lastUpdated);
  return (
    <PublicPoolShell
      poolName={pool.entriesConfig.poolName}
      eyebrow={null}
      title={
        <span className="flex min-w-0 items-center gap-4 sm:gap-5">
          <span
            aria-hidden="true"
            className="flex size-16 shrink-0 items-center justify-center rounded-full border border-brand-rule/70 bg-surface-paper text-lg font-semibold leading-none text-brand-mark shadow-[0_12px_28px_color-mix(in_oklch,black,transparent_86%)] sm:size-20 sm:text-2xl"
          >
            {getEntryInitials(entry.name)}
          </span>
          <span className="min-w-0 break-words">{entry.name}</span>
        </span>
      }
      description={entry.quote ?? entry.celebrationQuote ?? "Winning it all!"}
      descriptionClassName="ml-[5rem] sm:ml-[6.25rem]"
      scoreRefreshLabel={scoreRefreshLabel}
    >
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="secondaryGreen">
          <Link href={`/pools/${publicSlug}#leaderboard`}>
            Back to standings
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/pools/${publicSlug}/projections`}>
            View projections
          </Link>
        </Button>
      </div>

      <CreatePoolCta />

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

      <EntryMovementPanel digest={movementDigest} />

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
    </PublicPoolShell>
  );
}

function getSignupHref() {
  const nextPath = "/dashboard/pools/new";
  return `/sign-up?next=${encodeURIComponent(nextPath)}`;
}

function CreatePoolCta() {
  return (
    <LedgerPanel
      title="You still have time to create your own pool"
      description="Start a shorter 2026 World Cup pool from one of the rounds that can still lock cleanly."
      action={
        <Button asChild variant="primaryGreen">
          <Link href={getSignupHref()}>
            <CirclePlus /> Create pool
          </Link>
        </Button>
      }
    />
  );
}

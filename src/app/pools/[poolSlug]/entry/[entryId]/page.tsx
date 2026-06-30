import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CirclePlus } from "lucide-react";

import {
  AdvancementPicksPanel,
  GroupPicksPanel,
  KnockoutScoringPanel,
  PodiumBonusPanel,
  ThirdPlaceQualifierPicksPanel,
  TodaysResultsPanel,
} from "@/components/app/entry-detail-panels";
import { FutureLeveragePanel } from "@/components/app/future-leverage-panel";
import {
  CollapsibleLedgerPanel,
  LedgerPanel,
  LedgerRow,
  LedgerRows,
} from "@/components/app/ledger";
import { OpponentPathsPanel } from "@/components/app/opponent-paths-panel";
import { ScoreCards } from "@/components/app/pool-public-widgets";
import {
  PublicPoolShell,
} from "@/components/app/public-pool-shell";
import { Badge } from "@/components/ui/badge";
import { WorldCupBracket } from "@/components/app/world-cup-bracket";
import { Button } from "@/components/ui/button";
import { getAvailableTournamentTemplates } from "@/lib/templates/catalog";
import { buildPickedBracketView } from "@/lib/world-cup-pool/bracket";
import { formatDateTime, getPublicPool } from "@/lib/world-cup-pool/data";
import { buildFutureLeverageReport } from "@/lib/world-cup-pool/future-leverage";
import { buildLeaderboardRows } from "@/lib/world-cup-pool/leaderboard";
import { buildOpponentPathsReport } from "@/lib/world-cup-pool/opponent-paths";
import { scorePool } from "@/lib/world-cup-pool/scoring";
import { buildTodaysResultsReport } from "@/lib/world-cup-pool/todays-results";

type EntryPageProps = {
  params: Promise<{ poolSlug: string; entryId: string }>;
};

export const dynamicParams = false;

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
  const scoreRefreshLabel = formatDateTime(pool.results.meta?.lastUpdated);
  const availableTournamentTemplates =
    getAvailableTournamentTemplates("world-cup");

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

      <CreatePoolCta templates={availableTournamentTemplates} />

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

      <TodaysResultsPanel report={todaysResults} picks={picks} />

      <FutureLeveragePanel report={futureLeverage} picks={picks} />

      <GroupPicksPanel picks={picks} results={pool.results} score={score} />

      {submittedBracket ? (
        <CollapsibleLedgerPanel
          title="Submitted bracket"
          description="This entry's knockout path from the Round of 32 through the final."
          defaultOpen={false}
        >
          <WorldCupBracket
            rounds={submittedBracket.rounds}
            thirdPlace={submittedBracket.thirdPlace}
            picks={picks}
          />
        </CollapsibleLedgerPanel>
      ) : null}

      <PodiumBonusPanel picks={picks} score={score} />

      <AdvancementPicksPanel picks={picks} />

      <ThirdPlaceQualifierPicksPanel picks={picks} />

      <KnockoutScoringPanel picks={picks} score={score} />

      <OpponentPathsPanel report={opponentPaths} />
    </PublicPoolShell>
  );
}

type AvailableTournamentTemplate = ReturnType<
  typeof getAvailableTournamentTemplates
>[number];

function getSignupHref(templateSlug: string) {
  const nextPath = `/dashboard/pools/new?template=${templateSlug}`;
  return `/sign-up?next=${encodeURIComponent(nextPath)}`;
}

function CreatePoolCta({
  templates,
}: {
  templates: AvailableTournamentTemplate[];
}) {
  const primaryTemplate = templates[0];
  if (!primaryTemplate) return null;

  return (
    <LedgerPanel
      title="You still have time to create your own pool"
      description="Start a shorter 2026 World Cup pool from one of the rounds that can still lock cleanly."
      action={
        <Button asChild variant="primaryGreen">
          <Link href={getSignupHref(primaryTemplate.slug)}>
            <CirclePlus /> Create pool
          </Link>
        </Button>
      }
    >
      <LedgerRows className="grid md:grid-cols-3 md:divide-x md:divide-y-0">
        {templates.map((template) => (
          <LedgerRow key={template.slug} className="space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-brand-ink">
                  {template.name}
                </h2>
                <Badge variant="outline">{template.lock}</Badge>
              </div>
              <p className="text-sm font-normal leading-6 text-muted-foreground">
                {template.bestFor}: {template.picks}.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={getSignupHref(template.slug)}>
                Use this format <ArrowRight />
              </Link>
            </Button>
          </LedgerRow>
        ))}
      </LedgerRows>
    </LedgerPanel>
  );
}

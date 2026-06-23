import Link from "next/link";
import { notFound } from "next/navigation";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { OpponentPathsPanel } from "@/components/app/opponent-paths-panel";
import {
  MatchupLine,
  PointsBadge,
  ScoreCards,
  StatusBadge,
  TeamPill,
} from "@/components/app/pool-public-widgets";
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
import { formatDateTime, getPublicPool } from "@/lib/world-cup-pool/data";
import { buildOpponentPathsReport } from "@/lib/world-cup-pool/opponent-paths";
import { scorePool } from "@/lib/world-cup-pool/scoring";
import { buildTodaysResultsReport } from "@/lib/world-cup-pool/todays-results";
import { cn } from "@/lib/utils";
import type { TodaysResultsReport } from "@/lib/world-cup-pool/todays-results";
import type { EntryPicks } from "@/lib/world-cup-pool/types";

type EntryPageProps = {
  params: Promise<{ poolSlug: string; entryId: string }>;
};

export const dynamicParams = false;

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

  const score = scorePool(picks, pool.results);
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

  return (
    <PublicPoolShell
      poolName={pool.entriesConfig.poolName}
      eyebrow="Entry detail"
      title={entry.name}
      description="A public read-only view of this entry's picks and scoring breakdown."
      meta={
        <PublicPoolMetaCard
          label="Updated"
          value={formatDateTime(pool.results.meta?.lastUpdated)}
        />
      }
    >
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="secondaryGreen">
          <Link href={`/pools/${publicSlug}#leaderboard`}>
            Back to standings
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/pools/${publicSlug}?standings=projection#leaderboard`}>
            View projections
          </Link>
        </Button>
      </div>

      <ScoreCards score={score} />

      <OpponentPathsPanel report={opponentPaths} />

      <TodaysResultsPanel report={todaysResults} picks={picks} />

      <section className="grid gap-5 lg:grid-cols-[1fr_24rem]">
        <LedgerPanel
          title="Group picks"
          description="Predicted order is compared against the current live order."
        >
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(picks.groups).map(([groupId, group]) => {
              const groupScore = score.groups.find(
                (item) => item.groupId === groupId,
              );
              const currentOrder =
                pool.results.groups?.[groupId]?.currentOrder ?? [];

              return (
                <div key={groupId} className="rounded-lg border bg-background">
                  <div className="flex items-center justify-between gap-3 border-b bg-surface-ledger px-4 py-3">
                    <h2 className="text-sm font-semibold text-brand-ink">
                      Group {groupId}
                    </h2>
                    <PointsBadge
                      points={groupScore?.points ?? 0}
                      active={Boolean(groupScore?.points)}
                    />
                  </div>
                  <div className="grid gap-4 p-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                        Pick
                      </p>
                      <ol className="space-y-2">
                        {group.predictedOrder.map((team) => (
                          <li key={team}>
                            <TeamPill team={team} picks={picks} />
                          </li>
                        ))}
                      </ol>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                        Current
                      </p>
                      {currentOrder.length ? (
                        <ol className="space-y-2">
                          {currentOrder.map((team) => (
                            <li key={team}>
                              <TeamPill team={team} picks={picks} />
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Not started
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="border-t px-4 py-3 text-sm text-muted-foreground">
                    Advancer hits:{" "}
                    <span className="font-semibold text-brand-ink">
                      {groupScore?.advancementHits.length ?? 0}/
                      {group.predictedAdvancers.length}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </LedgerPanel>

        <LedgerPanel title="Podium and bonus">
          <LedgerRows>
            {score.finals.map((item) => (
              <LedgerRow key={item.label}>
                <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
                  {item.label}
                </p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <TeamPill team={item.predicted} picks={picks} />
                  <PointsBadge points={item.points} active={item.hit} />
                </div>
              </LedgerRow>
            ))}
            {score.bonus.map((item) => (
              <LedgerRow key={item.id}>
                <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
                  {item.label}
                </p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <TeamPill team={item.pick} picks={picks} />
                  <PointsBadge points={item.points} active={item.hit} />
                </div>
              </LedgerRow>
            ))}
          </LedgerRows>
        </LedgerPanel>
      </section>

      <LedgerPanel title="Knockout scoring">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-ledger hover:bg-surface-ledger">
              <TableHead>Stage</TableHead>
              <TableHead>Hits</TableHead>
              <TableHead>Per hit</TableHead>
              <TableHead>Points</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {score.knockout.map((stage) => (
              <TableRow key={stage.stageKey}>
                <TableCell className="font-medium text-brand-ink">
                  {stage.label}
                </TableCell>
                <TableCell>
                  {stage.hits.length ? (
                    <div className="flex flex-wrap gap-2">
                      {stage.hits.map((team) => (
                        <TeamPill key={team} team={team} picks={picks} />
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No hits yet</span>
                  )}
                </TableCell>
                <TableCell>{stage.perTeam}</TableCell>
                <TableCell className="font-semibold">{stage.points}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </LedgerPanel>
    </PublicPoolShell>
  );
}

function TodaysResultsPanel({
  report,
  picks,
}: {
  report: TodaysResultsReport | null;
  picks: EntryPicks;
}) {
  if (!report) return null;

  const description =
    report.matchCount > 0
      ? `${report.dateLabel}: simulated win, draw, and loss outcomes for today's unfinished matches.`
      : `${report.dateLabel}: no unfinished matches are scheduled for this pool.`;
  const directImpactMatchIds = new Set(
    report.matches
      .filter((item) =>
        item.outcomes.some(
          (outcome) =>
            outcome.rankChange !== 0 ||
            outcome.pointChange !== 0 ||
            outcome.playersAboveAlsoHelped > 0 ||
            outcome.chasersCanRiseAbove > 0,
        ),
      )
      .map((item) => item.match.id),
  );
  const scenarioKey = (
    scenario: TodaysResultsReport["bestScenarios"][number],
  ) =>
    scenario.outcomes
      .filter((outcome) => directImpactMatchIds.has(outcome.matchId))
      .map((outcome) => `${outcome.matchId}:${outcome.outcome}`)
      .sort()
      .join("|");
  const uniqueBestScenarios = report.bestScenarios.filter(
    (scenario, index, scenarios) => {
      const key = scenarioKey(scenario);
      return scenarios.findIndex((item) => scenarioKey(item) === key) === index;
    },
  );
  const uniqueScenarioKeys = new Set<string>();
  let visibleRisingScenarioCount = 0;
  for (const scenario of report.bestScenarios) {
    const key = scenarioKey(scenario);
    if (uniqueScenarioKeys.has(key)) continue;
    uniqueScenarioKeys.add(key);
    if (scenario.rank < report.currentRank) visibleRisingScenarioCount += 1;
  }
  const primaryScenario = uniqueBestScenarios[0];
  const alternateScenarios = uniqueBestScenarios.slice(1);
  const impactMatches = report.matches.filter((item) =>
    directImpactMatchIds.has(item.match.id),
  );

  return (
    <LedgerPanel title="Today's results" description={description}>
      <LedgerRows className="grid md:grid-cols-4 md:divide-x md:divide-y-0">
        <LedgerRow className="py-3">
          <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
            Current rank
          </p>
          <p className="mt-1 text-2xl font-semibold leading-none text-brand-ink">
            #{report.currentRank}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {report.currentTotal} pts
          </p>
        </LedgerRow>
        <LedgerRow className="py-3">
          <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
            Best today
          </p>
          <p className="mt-1 text-2xl font-semibold leading-none text-brand-ink">
            #{report.bestRank}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {report.bestTotal} pts
          </p>
        </LedgerRow>
        <LedgerRow className="py-3">
          <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
            Paths up
          </p>
          <p className="mt-1 text-2xl font-semibold leading-none text-brand-ink">
            {visibleRisingScenarioCount}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            of {uniqueScenarioKeys.size} meaningful paths
          </p>
        </LedgerRow>
        <LedgerRow className="py-3">
          <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
            Matches
          </p>
          <p className="mt-1 text-2xl font-semibold leading-none text-brand-ink">
            {impactMatches.length}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            with direct impact
          </p>
        </LedgerRow>
      </LedgerRows>

      {report.matchCount === 0 ? (
        <div className="border-t px-5 py-4 text-sm text-muted-foreground">
          There is nothing this entry needs from today&apos;s matches yet.
        </div>
      ) : (
        <div className="grid gap-0 border-t lg:grid-cols-[1fr_1fr] lg:divide-x">
          <div className="p-5">
            <h2 className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">
              What needs to happen
            </h2>
            {report.risingScenarioCount > 0 && primaryScenario ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-lg border bg-cta-green-soft p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                        Best route
                      </p>
                      <p className="mt-1 text-2xl font-semibold leading-none text-brand-ink">
                        Rise to #{primaryScenario.rank}
                      </p>
                    </div>
                    <StatusBadge
                      tone="helpful"
                      label={`+${primaryScenario.pointChange} pts`}
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <ScenarioOutcomeBadges
                      outcomes={primaryScenario.outcomes}
                      directImpactMatchIds={directImpactMatchIds}
                      showNoImpact={false}
                    />
                  </div>
                  <p className="mt-4 text-sm leading-5 text-muted-foreground">
                    Helps{" "}
                    <span className="font-semibold text-brand-ink">
                      {primaryScenario.playersAboveAlsoHelped}
                    </span>{" "}
                    entries already above this one;{" "}
                    <span className="font-semibold text-brand-ink">
                      {primaryScenario.chasersCanRiseAbove}
                    </span>{" "}
                    chasers could still rise above it.
                  </p>
                </div>

                {alternateScenarios.length ? (
                  <div className="rounded-lg border bg-background">
                    <div className="border-b px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                        Other paths to #{report.bestRank}
                      </p>
                    </div>
                    <div className="divide-y">
                      {alternateScenarios.map((scenario, index) => (
                        <div
                          key={`${scenario.rank}-${scenario.total}-${index}`}
                          className="px-4 py-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <ScenarioOutcomeBadges
                              outcomes={scenario.outcomes}
                              directImpactMatchIds={directImpactMatchIds}
                              showNoImpact={false}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                No combination of today&apos;s unfinished results moves this
                entry above its current rank. The best simulated outcome leaves
                it at{" "}
                <span className="font-semibold text-brand-ink">
                  #{report.bestRank}
                </span>{" "}
                with{" "}
                <span className="font-semibold text-brand-ink">
                  {report.bestTotal} pts
                </span>
                .
              </p>
            )}
          </div>

          <div className="p-5">
            <h2 className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">
              Match pressure
            </h2>
            <div className="mt-4 space-y-3">
              {impactMatches.length ? (
                impactMatches.map((item) => {
                  const bestOutcome = item.outcomes.slice().sort((a, b) => {
                    if (a.rank !== b.rank) return a.rank - b.rank;
                    return b.total - a.total;
                  })[0];
                  const hasEntrySwing = item.outcomes.some(
                    (outcome) =>
                      outcome.rankChange !== 0 || outcome.pointChange !== 0,
                  );
                  const hasPoolPressure = item.outcomes.some(
                    (outcome) =>
                      outcome.playersAboveAlsoHelped > 0 ||
                      outcome.chasersCanRiseAbove > 0,
                  );
                  const hasDirectImpact = hasEntrySwing || hasPoolPressure;

                  return (
                    <div
                      key={item.match.id}
                      className="rounded-lg border bg-background p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-brand-ink">
                            {item.groupId
                              ? `Group ${item.groupId}`
                              : "Pool match"}{" "}
                            <span className="text-muted-foreground">
                              - {item.match.detail || "Scheduled"}
                            </span>
                          </p>
                          <MatchupLine
                            homeTeam={item.match.homeTeam}
                            awayTeam={item.match.awayTeam}
                            picks={picks}
                            homeScore={item.match.homeScore}
                            awayScore={item.match.awayScore}
                            className="mt-2 text-base"
                          />
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          <StatusBadge
                            tone={
                              hasDirectImpact && bestOutcome?.helpsRise
                                ? "helpful"
                                : "neutral"
                            }
                            label={
                              hasDirectImpact
                                ? `Helpful: ${bestOutcome?.label}`
                                : "Neutral"
                            }
                          />
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        {item.outcomes.map((outcome) => (
                          <div
                            key={outcome.outcome}
                            className={cn(
                              "rounded-md border px-3 py-2",
                              hasDirectImpact &&
                                outcome.outcome === bestOutcome?.outcome
                                ? "border-brand-hot/20 bg-brand-hot/5"
                                : "bg-surface-ledger/50",
                            )}
                          >
                            <div className="grid gap-2 sm:grid-cols-[7.5rem_1fr_auto] sm:items-center">
                              <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                                {outcome.label}
                              </p>
                              <div className="h-2 overflow-hidden rounded-full bg-muted">
                                <div
                                  className={cn(
                                    "h-full rounded-full",
                                    hasDirectImpact &&
                                      outcome.outcome === bestOutcome?.outcome
                                      ? "bg-brand-hot"
                                      : "bg-muted-foreground/35",
                                  )}
                                  style={{ width: `${outcome.chancePercent}%` }}
                                />
                              </div>
                              <p className="text-sm font-semibold text-brand-ink">
                                {outcome.chancePercent}%
                              </p>
                            </div>
                            <p className="mt-2 text-xs leading-4 text-muted-foreground sm:ml-[7.5rem]">
                              {hasDirectImpact
                                ? `${outcome.playersAboveAlsoHelped} above gain; ${outcome.chasersCanRiseAbove} chasers rise above.`
                                : "No standings swing."}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-lg border bg-background p-4 text-sm leading-6 text-muted-foreground">
                  No remaining match has a direct standings impact for this
                  entry.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </LedgerPanel>
  );
}

function ScenarioOutcomeBadges({
  outcomes,
  directImpactMatchIds,
  showNoImpact = true,
}: {
  outcomes: TodaysResultsReport["bestScenarios"][number]["outcomes"];
  directImpactMatchIds: Set<string>;
  showNoImpact?: boolean;
}) {
  const impactOutcomes = outcomes.filter((outcome) =>
    directImpactMatchIds.has(outcome.matchId),
  );
  const noImpactCount = outcomes.length - impactOutcomes.length;

  return (
    <>
      {impactOutcomes.map((outcome) => (
        <Badge key={outcome.matchId} variant="outline">
          {outcome.label}
        </Badge>
      ))}
      {showNoImpact && noImpactCount > 0 ? (
        <Badge variant="outline">
          No impact{noImpactCount > 1 ? ` x${noImpactCount}` : ""}
        </Badge>
      ) : null}
    </>
  );
}

import {
  CollapsibleLedgerPanel,
  LedgerRow,
  LedgerRows,
} from "@/components/app/ledger";
import {
  MatchupLine,
  PointsBadge,
  StatusBadge,
  TeamPill,
} from "@/components/app/pool-public-widgets";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { TodaysResultsReport } from "@/lib/world-cup-pool/todays-results";
import type { EntryPicks, PoolResults, PoolScore } from "@/lib/world-cup-pool/types";

export function GroupPicksPanel({
  picks,
  results,
  score,
}: {
  picks: EntryPicks;
  results: PoolResults;
  score: PoolScore;
}) {
  return (
    <CollapsibleLedgerPanel
      title="Group picks"
      description="Predicted order is compared against the current live order."
      defaultOpen={false}
    >
      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
        {Object.entries(picks.groups).map(([groupId, group]) => {
          const groupScore = score.groups.find(
            (item) => item.groupId === groupId,
          );
          const currentOrder = results.groups?.[groupId]?.currentOrder ?? [];

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
                <TeamList title="Pick" teams={group.predictedOrder} picks={picks} />
                <TeamList
                  title="Current"
                  teams={currentOrder}
                  picks={picks}
                  emptyLabel="Not started"
                />
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
    </CollapsibleLedgerPanel>
  );
}

function TeamList({
  title,
  teams,
  picks,
  emptyLabel,
}: {
  title: string;
  teams: string[];
  picks: EntryPicks;
  emptyLabel?: string;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
        {title}
      </p>
      {teams.length ? (
        <ol className="space-y-2">
          {teams.map((team) => (
            <li key={team}>
              <TeamPill team={team} picks={picks} />
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  );
}

export function PodiumBonusPanel({
  picks,
  score,
}: {
  picks: EntryPicks;
  score: PoolScore;
}) {
  return (
    <CollapsibleLedgerPanel title="Podium and bonus" defaultOpen={false}>
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
    </CollapsibleLedgerPanel>
  );
}

const advancementStages = [
  { key: "roundOf16", label: "Round of 16" },
  { key: "quarterFinalists", label: "Quarter-finals" },
  { key: "semifinalists", label: "Semi-finals" },
  { key: "finalists", label: "Final" },
  { key: "thirdPlaceMatch", label: "Third-place match" },
] as const;

export function AdvancementPicksPanel({ picks }: { picks: EntryPicks }) {
  return (
    <CollapsibleLedgerPanel
      title="Advancement picks"
      description="Every team this entry picked to reach each knockout round."
      defaultOpen={false}
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-surface-ledger hover:bg-surface-ledger">
            <TableHead>Round</TableHead>
            <TableHead>Teams</TableHead>
            <TableHead className="text-right">Count</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {advancementStages.map((stage) => {
            const teams = picks.advancement[stage.key];

            return (
              <TableRow key={stage.key}>
                <TableCell className="font-medium text-brand-ink">
                  {stage.label}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {teams.map((team) => (
                      <TeamPill key={team} team={team} picks={picks} />
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {teams.length}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </CollapsibleLedgerPanel>
  );
}

export function ThirdPlaceQualifierPicksPanel({ picks }: { picks: EntryPicks }) {
  const selectedGroups = Object.entries(picks.thirdPlace).filter(
    ([, pick]) => pick.selected,
  );

  return (
    <CollapsibleLedgerPanel
      title="Third-place qualifiers"
      description="The third-place group teams this entry selected to advance."
      defaultOpen={false}
    >
      <LedgerRows>
        <LedgerRow>
          <div className="flex flex-wrap gap-2">
            {selectedGroups.map(([groupId, pick]) => (
              <div
                key={groupId}
                className="flex items-center gap-2 rounded-full border bg-background px-3 py-2"
              >
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Group {groupId}
                </span>
                <TeamPill team={pick.team} picks={picks} />
              </div>
            ))}
          </div>
        </LedgerRow>
      </LedgerRows>
    </CollapsibleLedgerPanel>
  );
}

export function KnockoutScoringPanel({
  picks,
  score,
}: {
  picks: EntryPicks;
  score: PoolScore;
}) {
  return (
    <CollapsibleLedgerPanel title="Knockout scoring" defaultOpen={false}>
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
    </CollapsibleLedgerPanel>
  );
}

export function TodaysResultsPanel({
  report,
  picks,
}: {
  report: TodaysResultsReport | null;
  picks: EntryPicks;
}) {
  if (!report) return null;

  const hasKnockoutMatch = report.matches.some((item) => !item.groupId);
  const description =
    report.matchCount > 0
      ? hasKnockoutMatch
        ? `${report.dateLabel}: simulated outcomes for today's unfinished matches.`
        : `${report.dateLabel}: simulated win, draw, and loss outcomes for today's unfinished matches.`
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
  const bestRouteScenarios = primaryScenario
    ? uniqueBestScenarios.filter(
        (scenario) => scenario.rank === primaryScenario.rank,
      )
    : [];
  const bestRouteSummary = primaryScenario
    ? scenarioSummary({
        scenarios: bestRouteScenarios,
        matches: report.matches,
        directImpactMatchIds,
      })
    : "";
  const impactMatches = report.matches.filter((item) =>
    directImpactMatchIds.has(item.match.id),
  );

  return (
    <CollapsibleLedgerPanel
      title="Today's results"
      description={description}
      defaultOpen={false}
    >
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
                  <p className="mt-4 text-lg font-semibold leading-7 text-brand-ink">
                    {bestRouteSummary}
                  </p>
                  <p className="mt-4 text-sm leading-5 text-muted-foreground">
                    This same outcome also gives points to{" "}
                    <span className="font-semibold text-brand-ink">
                      {primaryScenario.playersAboveAlsoHelped}
                    </span>{" "}
                    entries already ahead;{" "}
                    <span className="font-semibold text-brand-ink">
                      {primaryScenario.chasersCanRiseAbove}
                    </span>{" "}
                    entries behind could still overtake it.
                  </p>
                </div>
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
                                ? `${outcome.playersAboveAlsoHelped} ahead also gain points; ${outcome.chasersCanRiseAbove} behind can overtake.`
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
    </CollapsibleLedgerPanel>
  );
}

function scenarioSummary({
  scenarios,
  matches,
  directImpactMatchIds,
}: {
  scenarios: TodaysResultsReport["bestScenarios"];
  matches: TodaysResultsReport["matches"];
  directImpactMatchIds: Set<string>;
}) {
  const firstScenario = scenarios[0];
  if (!firstScenario) return "";

  const phrases = matches
    .filter((item) => directImpactMatchIds.has(item.match.id))
    .map((item) => {
      const outcomes = new Set(
        scenarios
          .map((scenario) =>
            scenario.outcomes.find(
              (outcome) => outcome.matchId === item.match.id,
            ),
          )
          .filter((outcome): outcome is NonNullable<typeof outcome> =>
            Boolean(outcome),
          )
          .map((outcome) => outcome.outcome),
      );

      return matchOutcomePhrase(item.match.homeTeam, item.match.awayTeam, outcomes);
    })
    .filter(Boolean);

  return `${formatSentenceList(phrases)}.`;
}

function matchOutcomePhrase(
  homeTeam: string,
  awayTeam: string,
  outcomes: Set<string>,
) {
  const homeWins = outcomes.has("home");
  const awayWins = outcomes.has("away");
  const draws = outcomes.has("draw");

  if (homeWins && draws && !awayWins) {
    return `${homeTeam} draws or beats ${awayTeam}`;
  }

  if (awayWins && draws && !homeWins) {
    return `${awayTeam} draws or beats ${homeTeam}`;
  }

  if (homeWins && awayWins && !draws) {
    return `${homeTeam} or ${awayTeam} wins`;
  }

  if (homeWins && !awayWins && !draws) return `${homeTeam} beats ${awayTeam}`;
  if (awayWins && !homeWins && !draws) return `${awayTeam} beats ${homeTeam}`;
  if (draws && !homeWins && !awayWins) return `${homeTeam} draws with ${awayTeam}`;

  return `${homeTeam}-${awayTeam} can finish any way`;
}

function formatSentenceList(items: string[]) {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]}, and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

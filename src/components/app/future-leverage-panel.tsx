"use client";

import { useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CollapsibleLedgerPanel,
  LedgerRow,
  LedgerRows,
} from "@/components/app/ledger";
import { StatusBadge, TeamPill } from "@/components/app/pool-public-widgets";
import { displayTeamName } from "@/lib/world-cup-pool/scoring";
import type {
  FutureLeverageChaser,
  FutureLeverageMatch,
  FutureLeverageOutcome,
  FutureLeverageReport,
  FutureRaceMilestone,
  FutureRaceMovement,
} from "@/lib/world-cup-pool/future-leverage";
import type { EntryPicks } from "@/lib/world-cup-pool/types";
import { cn } from "@/lib/utils";

type FutureLeveragePanelProps = {
  report: FutureLeverageReport | null;
  picks: EntryPicks;
};

export function FutureLeveragePanel({
  report,
  picks,
}: FutureLeveragePanelProps) {
  const [view, setView] = useState<"simple" | "advanced">("simple");

  if (!report) return null;

  return (
    <CollapsibleLedgerPanel
      title="Future leverage"
      description="Upcoming matches that can move this entry or give chasers a route."
      defaultOpen
    >
      <div className="border-b bg-background/70 px-5 py-4">
        <div className="inline-flex rounded-md border bg-surface-paper p-1">
          <Button
            type="button"
            size="sm"
            variant={view === "simple" ? "secondaryGreen" : "ghost"}
            aria-pressed={view === "simple"}
            onClick={() => setView("simple")}
          >
            Simple
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === "advanced" ? "secondaryGreen" : "ghost"}
            aria-pressed={view === "advanced"}
            onClick={() => setView("advanced")}
          >
            Advanced
          </Button>
        </div>
      </div>

      {view === "simple" ? (
        <SimpleRaceView report={report} />
      ) : (
        <AdvancedLeverageView report={report} picks={picks} />
      )}
    </CollapsibleLedgerPanel>
  );
}

function SimpleRaceView({ report }: { report: FutureLeverageReport }) {
  const [selectedMatchId, setSelectedMatchId] = useState(
    report.raceMilestones[0]?.id ?? "",
  );
  const selectedMatch =
    report.raceMilestones.find((match) => match.id === selectedMatchId) ??
    report.raceMilestones[0];

  return (
    <LedgerRows>
      <LedgerRow className="space-y-4">
        <SectionTitle
          title="Match impact matrix"
          count={report.raceMilestones.length}
        />
        {report.raceMilestones.length ? (
          <>
            <MatchSelector
              matches={report.raceMilestones}
              selectedMatchId={selectedMatch?.id ?? ""}
              onSelect={setSelectedMatchId}
            />
            {selectedMatch ? (
              <ImpactMatrix
                match={selectedMatch}
                targetId={report.target.id}
                targetRank={report.target.rank}
              />
            ) : null}
          </>
        ) : (
          <EmptyNote>
            No upcoming match data is available for the impact matrix.
          </EmptyNote>
        )}
      </LedgerRow>
    </LedgerRows>
  );
}

function AdvancedLeverageView({
  report,
  picks,
}: {
  report: FutureLeverageReport;
  picks: EntryPicks;
}) {
  return (
      <LedgerRows className="grid gap-0 lg:grid-cols-[1.35fr_1fr] lg:divide-x lg:divide-y-0">
        <LedgerRow className="space-y-4">
          <SectionTitle
            title="Games to watch"
            count={report.matches.length}
          />
          {report.matches.length ? (
            <div className="grid gap-3">
              {report.matches.map((match) => (
                <MatchCard key={match.id} match={match} picks={picks} />
              ))}
            </div>
          ) : (
            <EmptyNote>
              No scheduled match currently creates a direct standings swing for
              this entry.
            </EmptyNote>
          )}
        </LedgerRow>

        <LedgerRow className="space-y-4">
          <SectionTitle
            title="Chasers still alive"
            count={report.chasers.length}
          />
          {report.chasers.length ? (
            <div className="grid gap-3">
              {report.chasers.map((chaser) => (
                <ChaserCard key={chaser.id} chaser={chaser} picks={picks} />
              ))}
            </div>
          ) : (
            <EmptyNote>
              No entry behind this one has enough unique remaining upside to
              overtake it from the current scores.
            </EmptyNote>
          )}
        </LedgerRow>
      </LedgerRows>
  );
}

function MatchSelector({
  matches,
  selectedMatchId,
  onSelect,
}: {
  matches: FutureRaceMilestone[];
  selectedMatchId: string;
  onSelect: (matchId: string) => void;
}) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-3">
        {matches.map((match) => {
          const selected = match.id === selectedMatchId;

          return (
            <button
              key={match.id}
              type="button"
              className={cn(
                "w-64 rounded-lg border bg-background px-4 py-3 text-left transition hover:border-primary/35 hover:bg-primary/5",
                selected && "border-cta-green bg-cta-green-soft",
              )}
              aria-pressed={selected}
              onClick={() => onSelect(match.id)}
            >
              <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                {stageLabel(match.stage)} - {formatMatchDate(match.date)}
              </p>
              <p className="mt-2 truncate font-semibold text-brand-ink">
                {formatShortMatch(match.homeTeam, match.awayTeam)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {match.outcomes.length} possible results
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ImpactMatrix({
  match,
  targetId,
  targetRank,
}: {
  match: FutureRaceMilestone;
  targetId: string;
  targetRank: number;
}) {
  const columnTemplate = `minmax(12rem,1.05fr) repeat(${match.outcomes.length}, minmax(12rem,1fr))`;
  const rows = match.outcomes[0]?.movements ?? [];

  return (
    <div className="rounded-lg border bg-background">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-surface-ledger/70 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            Selected match
          </p>
          <p className="mt-1 font-semibold text-brand-ink">
            {formatShortMatch(match.homeTeam, match.awayTeam)}
          </p>
        </div>
        <StatusBadge label={match.detail || "Scheduled"} />
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-max">
          <div
            className="grid border-b bg-surface-ledger/45"
            style={{ gridTemplateColumns: columnTemplate }}
          >
            <div className="px-4 py-3 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Current top 10
            </div>
            {match.outcomes.map((outcome) => (
              <div
                key={outcome.outcome}
                className="border-l px-4 py-3 text-sm font-semibold text-brand-ink"
              >
                {displayTeamName(outcome.label)}
              </div>
            ))}
          </div>

          {rows.map((row) => (
            <div
              key={row.id}
              className={cn(
                "grid border-b last:border-b-0",
                row.id === targetId && "bg-cta-green-soft/45",
              )}
              style={{ gridTemplateColumns: columnTemplate }}
            >
              <PlayerMatrixLabel movement={row} isTarget={row.id === targetId} />
              {match.outcomes.map((outcome) => {
                const movement =
                  outcome.movements.find((item) => item.id === row.id) ?? row;
                const targetMovement = outcome.movements.find(
                  (item) => item.id === targetId,
                );

                return (
                  <ImpactCell
                    key={`${row.id}-${outcome.outcome}`}
                    movement={movement}
                    isTarget={row.id === targetId}
                    targetRank={targetRank}
                    targetMovement={targetMovement}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlayerMatrixLabel({
  movement,
  isTarget,
}: {
  movement: FutureRaceMovement;
  isTarget: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-brand-ink">
          #{movement.currentRank} {movement.name}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {movement.currentTotal} pts now
        </p>
      </div>
      {isTarget ? <Badge variant="secondary">You</Badge> : null}
    </div>
  );
}

function ImpactCell({
  movement,
  isTarget,
  targetRank,
  targetMovement,
}: {
  movement: FutureRaceMovement;
  isTarget: boolean;
  targetRank: number;
  targetMovement?: FutureRaceMovement;
}) {
  const chaserPassesTarget =
    !isTarget &&
    movement.currentRank >= targetRank &&
    targetMovement &&
    movement.projectedTotal > targetMovement.projectedTotal;
  const drops = movement.rankDelta < 0;
  const gains = movement.rankDelta > 0 || movement.totalDelta > 0;
  const tone = chaserPassesTarget || drops ? "danger" : gains ? "gain" : "neutral";

  return (
    <div className="border-l px-4 py-3">
      <div
        className={cn(
          "min-h-24 rounded-md border px-3 py-2",
          tone === "gain" && "border-cta-green/40 bg-cta-green-soft",
          tone === "danger" && "border-brand-hot/35 bg-brand-hot/10",
          tone === "neutral" && "bg-background",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-brand-ink">
              #{movement.projectedRank}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {movement.projectedTotal} pts
            </p>
          </div>
          <MovementBadge movement={movement} />
        </div>
        <p className="mt-3 text-xs leading-4 text-muted-foreground">
          {cellSummary(movement, chaserPassesTarget)}
        </p>
      </div>
    </div>
  );
}

function MovementBadge({ movement }: { movement: FutureRaceMovement }) {
  if (movement.rankDelta > 0) {
    return <Badge variant="secondary">+{movement.rankDelta} rank</Badge>;
  }
  if (movement.rankDelta < 0) {
    return <Badge variant="outline">{movement.rankDelta} rank</Badge>;
  }
  if (movement.totalDelta > 0) {
    return <Badge variant="outline">+{movement.totalDelta}</Badge>;
  }
  return <Badge variant="outline">same</Badge>;
}

function cellSummary(movement: FutureRaceMovement, chaserPassesTarget?: boolean) {
  if (chaserPassesTarget) return "Passes this entry in this scenario.";
  if (movement.rankDelta > 0) {
    return `Rises from #${movement.currentRank}.`;
  }
  if (movement.rankDelta < 0) {
    return `Falls from #${movement.currentRank}.`;
  }
  if (movement.totalDelta > 0) {
    return `Gains ${movement.totalDelta} pts, rank unchanged.`;
  }
  return "No change.";
}

function MatchCard({
  match,
  picks,
}: {
  match: FutureLeverageMatch;
  picks: EntryPicks;
}) {
  const riskCount = Math.max(
    ...match.outcomes.map((outcome) => outcome.chasersPassing.length),
  );

  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            {formatMatchDate(match.date)} - {match.detail || "Scheduled"}
          </p>
          <div className="mt-2">
            <MatchTeams
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
              picks={picks}
            />
          </div>
        </div>
        <StatusBadge
          tone={match.bestOutcome.rankChange > 0 ? "helpful" : "neutral"}
          label={bestOutcomeLabel(match.bestOutcome)}
        />
      </div>

      {riskCount > 0 ? (
        <p className="mt-3 text-sm leading-5 text-brand-hot">
          Risk: {riskCount} chaser{riskCount === 1 ? "" : "s"} can move above
          this entry in at least one result.
        </p>
      ) : null}

      {match.pathNotes.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {match.pathNotes.map((note) => (
            <Badge key={note} variant="outline">
              {note}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="mt-4 grid gap-2">
        {match.outcomes.map((outcome) => (
          <OutcomeRow key={outcome.outcome} outcome={outcome} />
        ))}
      </div>
    </div>
  );
}

function OutcomeRow({ outcome }: { outcome: FutureLeverageOutcome }) {
  const notes = [
    outcome.entriesPassed.length
      ? `passes ${formatNames(outcome.entriesPassed)}`
      : "",
    outcome.chasersPassing.length
      ? `${formatNames(outcome.chasersPassing)} overtake`
      : "",
  ].filter(Boolean);

  return (
    <div className="rounded-md border bg-surface-ledger/45 px-3 py-2">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <p className="min-w-0 font-medium text-brand-ink">
          {displayTeamName(outcome.label)}
        </p>
        <p className="text-sm font-semibold text-brand-ink">
          #{outcome.rank} - {outcome.total} pts
          {outcome.pointChange > 0 ? ` (+${outcome.pointChange})` : ""}
        </p>
      </div>
      <p className="mt-1 text-xs leading-4 text-muted-foreground">
        {notes.length ? notes.join("; ") : "No rank swing from this result."}
      </p>
    </div>
  );
}

function ChaserCard({
  chaser,
  picks,
}: {
  chaser: FutureLeverageChaser;
  picks: EntryPicks;
}) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-brand-ink">
            #{chaser.rank} {chaser.name}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {chaser.total} pts, {chaser.gap} behind
          </p>
        </div>
        <StatusBadge tone="helpful" label={`needs +${chaser.neededSwing}`} />
      </div>

      <div className="mt-4 grid gap-2">
        {chaser.routeEvents.length ? (
          chaser.routeEvents.map((event) => (
            <div
              key={`${chaser.id}-${event.title}`}
              className="rounded-md border bg-surface-ledger/45 px-3 py-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-brand-ink">
                  {event.title}
                </p>
                <Badge variant="outline">+{event.points}</Badge>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm leading-5 text-muted-foreground">
            This entry is already close enough that one shared standings swing
            can move it above.
          </p>
        )}
      </div>

      {chaser.matches.length ? (
        <div className="mt-4 space-y-2">
          {chaser.matches.map((match) => (
            <div
              key={`${chaser.id}-${match.homeTeam}-${match.awayTeam}`}
              className="rounded-md border px-3 py-2"
            >
              <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                {match.detail || "Scheduled"}
              </p>
              <div className="mt-1">
                <MatchTeams
                  homeTeam={match.homeTeam}
                  awayTeam={match.awayTeam}
                  picks={picks}
                />
              </div>
              <p className="mt-2 text-xs leading-4 text-muted-foreground">
                Watch for: {match.preferredOutcome}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MatchTeams({
  homeTeam,
  awayTeam,
  picks,
}: {
  homeTeam: string;
  awayTeam: string;
  picks: EntryPicks;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-brand-ink">
      <TeamPill team={homeTeam} picks={picks} />
      <span className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
        vs
      </span>
      <TeamPill team={awayTeam} picks={picks} />
    </div>
  );
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">
        {title}
      </h2>
      <Badge variant="outline">{count}</Badge>
    </div>
  );
}

function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border bg-background px-4 py-3 text-sm leading-6 text-muted-foreground">
      {children}
    </p>
  );
}

function bestOutcomeLabel(outcome: FutureLeverageOutcome) {
  if (outcome.rankChange > 0) return `Best: rise to #${outcome.rank}`;
  if (outcome.pointChange > 0) return `Best: +${outcome.pointChange} pts`;
  return "No direct gain";
}

function stageLabel(stage: FutureRaceMilestone["stage"]) {
  return (
    STAGE_LABELS[stage] ?? "Upcoming"
  );
}

const STAGE_LABELS: Record<FutureRaceMilestone["stage"], string> = {
  roundOf32: "R32",
  roundOf16: "R16",
  quarterFinal: "QF",
  semiFinal: "SF",
  final: "Final",
};

function formatShortMatch(homeTeam: string, awayTeam: string) {
  return `${displayTeamName(homeTeam)} vs ${displayTeamName(awayTeam)}`;
}

function formatMatchDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Upcoming";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatNames(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

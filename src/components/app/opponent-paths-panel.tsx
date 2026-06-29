"use client";

import { useMemo, useState } from "react";

import {
  CollapsibleLedgerPanel,
  LedgerRow,
  LedgerRows,
} from "@/components/app/ledger";
import { StatusBadge } from "@/components/app/pool-public-widgets";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  OpponentPathEvent,
  OpponentPathOpponent,
  OpponentPathsReport,
} from "@/lib/world-cup-pool/opponent-paths";
import { cn } from "@/lib/utils";

type OpponentPathsPanelProps = {
  report: OpponentPathsReport | null;
};

type ScoreSnapshot = {
  id: string;
  label: string;
  title: string;
  detail: string;
  total: number;
  gap: number;
  points: number;
  overtakes: boolean;
  tags: string[];
};

export function OpponentPathsPanel({ report }: OpponentPathsPanelProps) {
  const [firstOpponentId, setFirstOpponentId] = useState(
    report?.defaultOpponentIds[0] ?? "",
  );
  const [secondOpponentId, setSecondOpponentId] = useState(
    report?.defaultOpponentIds[1] ?? "none",
  );

  const firstOpponent = useMemo(
    () => report?.opponents.find((opponent) => opponent.id === firstOpponentId),
    [firstOpponentId, report?.opponents],
  );
  const secondOpponent = useMemo(
    () =>
      secondOpponentId === "none"
        ? undefined
        : report?.opponents.find((opponent) => opponent.id === secondOpponentId),
    [secondOpponentId, report?.opponents],
  );
  const selectedOpponents = [firstOpponent, secondOpponent].filter(
    (opponent): opponent is OpponentPathOpponent => Boolean(opponent),
  );
  const handleFirstOpponentChange = (opponentId: string) => {
    setFirstOpponentId(opponentId);
    if (secondOpponentId === opponentId) setSecondOpponentId("none");
  };
  const snapshotCount = selectedOpponents.reduce(
    (count, opponent) =>
      count + snapshotEvents(opponent).length + opponent.matches.slice(0, 3).length,
    0,
  );

  if (!report || report.opponents.length === 0) return null;

  return (
    <CollapsibleLedgerPanel
      title="Catch-up snapshots"
      description="Pick one or two opponents and scan the scoreboard snapshots that matter most."
      defaultOpen={false}
    >
      <div className="border-b bg-background/70 px-5 py-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
          <OpponentSelect
            label="Opponent 1"
            value={firstOpponentId}
            opponents={report.opponents}
            onChange={handleFirstOpponentChange}
          />
          <OpponentSelect
            label="Opponent 2"
            value={secondOpponentId}
            opponents={report.opponents.filter(
              (opponent) => opponent.id !== firstOpponentId,
            )}
            onChange={setSecondOpponentId}
            allowNone
          />
          <div className="rounded-lg border bg-surface-ledger px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Snapshots
            </p>
            <p className="mt-1 text-2xl font-semibold leading-none text-brand-ink">
              {snapshotCount}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              score and match views
            </p>
          </div>
        </div>
      </div>

      <LedgerRows
        className={cn(
          "grid",
          selectedOpponents.length > 1 &&
            "lg:grid-cols-2 lg:divide-x lg:divide-y-0",
        )}
      >
        {selectedOpponents.map((opponent) => (
          <OpponentSnapshotCard
            key={opponent.id}
            opponent={opponent}
            targetTotal={report.target.total}
          />
        ))}
      </LedgerRows>
    </CollapsibleLedgerPanel>
  );
}

function OpponentSelect({
  label,
  value,
  opponents,
  onChange,
  allowNone = false,
}: {
  label: string;
  value: string;
  opponents: OpponentPathOpponent[];
  onChange: (value: string) => void;
  allowNone?: boolean;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
        {label}
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 w-full bg-background">
          <SelectValue placeholder="Choose opponent" />
        </SelectTrigger>
        <SelectContent>
          {allowNone ? <SelectItem value="none">None</SelectItem> : null}
          {opponents.map((opponent) => (
            <SelectItem key={opponent.id} value={opponent.id}>
              #{opponent.rank} {opponent.name} - {opponent.total} pts
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function OpponentSnapshotCard({
  opponent,
  targetTotal,
}: {
  opponent: OpponentPathOpponent;
  targetTotal: number;
}) {
  const snapshots = buildScoreSnapshots(opponent, targetTotal);
  const overtakeSnapshot = snapshots.find((snapshot) => snapshot.overtakes);

  return (
    <LedgerRow className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand-ink">
            #{opponent.rank} {opponent.name}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {targetTotal} vs {opponent.total} pts
          </p>
        </div>
        <StatusBadge
          tone={overtakeSnapshot ? "helpful" : "neutral"}
          label={
            overtakeSnapshot
              ? `Overtake at ${overtakeSnapshot.total}`
              : `Need +${opponent.neededSwing}`
          }
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat label="Gap" value={gapLabel(opponent.gap)} />
        <MiniStat label="Need" value={`+${opponent.neededSwing}`} />
        <MiniStat label="Upside" value={`+${opponent.playerUpside}`} />
      </div>

      <section>
        <SectionLabel title="Score snapshots" />
        <div className="grid gap-3">
          {snapshots.map((snapshot) => (
            <SnapshotCard key={snapshot.id} snapshot={snapshot} />
          ))}
        </div>
      </section>

      <section>
        <SectionLabel title="Match snapshots" />
        {opponent.matches.length ? (
          <div className="grid gap-3">
            {opponent.matches.slice(0, 3).map((match) => (
              <div key={match.id} className="rounded-lg border bg-background p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                      {match.groupId ? `Group ${match.groupId}` : "Pool event"} -{" "}
                      {match.detail || "Scheduled"}
                    </p>
                    <p className="mt-2 font-semibold text-brand-ink">
                      {match.homeTeam} vs {match.awayTeam}
                    </p>
                  </div>
                  <StatusBadge tone="helpful" label={match.preferredOutcome} />
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  Player value +{match.playerValue}; opponent value +
                  {match.opponentValue}.
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border bg-background px-3 py-3 text-sm text-muted-foreground">
            No remaining match is tied directly to this matchup yet.
          </p>
        )}
      </section>
    </LedgerRow>
  );
}

function snapshotEvents(opponent: OpponentPathOpponent) {
  return (
    opponent.routeEvents.length
      ? opponent.routeEvents
      : opponent.gainEvents.slice(0, 5)
  );
}

function buildScoreSnapshots(
  opponent: OpponentPathOpponent,
  targetTotal: number,
): ScoreSnapshot[] {
  const events = snapshotEvents(opponent);
  const snapshots: ScoreSnapshot[] = [
    {
      id: "now",
      label: "Now",
      title: `${targetTotal} - ${opponent.total}`,
      detail: gapSentence(opponent.gap),
      total: targetTotal,
      gap: opponent.gap,
      points: 0,
      overtakes: targetTotal > opponent.total,
      tags: ["Current"],
    },
  ];
  let runningTotal = targetTotal;

  for (const [index, event] of events.entries()) {
    runningTotal += event.points;
    const gap = opponent.total - runningTotal;
    snapshots.push({
      id: event.id,
      label: `Snapshot ${index + 1}`,
      title: event.title,
      detail: gapSentence(gap),
      total: runningTotal,
      gap,
      points: event.points,
      overtakes: runningTotal > opponent.total,
      tags: eventTags(event),
    });
  }

  return snapshots;
}

function eventTags(event: OpponentPathEvent) {
  return [event.category, event.groupId ? `Group ${event.groupId}` : ""].filter(
    Boolean,
  );
}

function SnapshotCard({ snapshot }: { snapshot: ScoreSnapshot }) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        snapshot.overtakes
          ? "border-brand-hot/25 bg-brand-hot/5"
          : "bg-background",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            {snapshot.label}
          </p>
          <p className="mt-1 font-semibold text-brand-ink">{snapshot.title}</p>
        </div>
        <StatusBadge
          tone={snapshot.overtakes ? "helpful" : "neutral"}
          label={snapshot.points > 0 ? `+${snapshot.points}` : "Live"}
        />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[7rem_1fr] sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            Score
          </p>
          <p className="mt-1 text-2xl font-semibold leading-none text-brand-ink">
            {snapshot.total}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-brand-ink">{snapshot.detail}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {snapshot.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-background px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold leading-none text-brand-ink">
        {value}
      </p>
    </div>
  );
}

function SectionLabel({ title }: { title: string }) {
  return (
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
      {title}
    </h2>
  );
}

function gapLabel(gap: number) {
  if (gap > 0) return `-${gap}`;
  if (gap < 0) return `+${Math.abs(gap)}`;
  return "Tied";
}

function gapSentence(gap: number) {
  if (gap > 0) return `Still ${gap} points behind.`;
  if (gap < 0) return `Ahead by ${Math.abs(gap)} points.`;
  return "Tied with this opponent.";
}

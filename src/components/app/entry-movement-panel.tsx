import {
  ArrowDownRight,
  ArrowUpRight,
  Route,
  ShieldAlert,
  Trophy,
  UsersRound,
} from "lucide-react";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { StatusBadge } from "@/components/app/pool-public-widgets";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  CloseRival,
  EntryMovementDigest,
  MovementMatchDecider,
  MovementOutcomeSpotlight,
} from "@/lib/world-cup-pool/entry-movement-digest";

export function EntryMovementPanel({
  digest,
}: {
  digest: EntryMovementDigest | null;
}) {
  if (!digest) return null;

  return (
    <LedgerPanel
      title="Race movement"
      description="Current rank pressure, nearby rivals, and the outcomes that can move this entry."
    >
      <RaceSnapshot digest={digest} />
      <WinPathPanel digest={digest} />
      <BigDeciders digest={digest} />
      <CloseRivals digest={digest} />
    </LedgerPanel>
  );
}

function RaceSnapshot({ digest }: { digest: EntryMovementDigest }) {
  const { target, raceSnapshot } = digest;

  return (
    <LedgerRows className="grid md:grid-cols-3 xl:grid-cols-5 md:divide-x md:divide-y-0">
      <SnapshotMetric
        label="Current"
        value={`#${target.rank}`}
        note={`${target.total} pts of ${target.totalEntries} entries`}
      />
      <SnapshotMetric
        label="Leader gap"
        value={digest.winPath.gap ? `${digest.winPath.gap} pts` : "0 pts"}
        note={
          digest.winPath.leaderNames.length
            ? `Leader: ${digest.winPath.leaderNames.join(", ")}`
            : "No leader found"
        }
      />
      <SnapshotMetric
        label="Can still win?"
        value={winPathShortLabel(digest.winPath.status)}
        note={digest.winPath.summary}
      />
      <SnapshotMetric
        label="Closest target"
        value={raceSnapshot.closestAhead ? `#${raceSnapshot.closestAhead.rank}` : "-"}
        note={
          raceSnapshot.closestAhead
            ? `${raceSnapshot.closestAhead.name}, ${raceSnapshot.closestAhead.gap} pts up`
            : "No entry above"
        }
      />
      <SnapshotMetric
        label="Biggest danger"
        value={
          raceSnapshot.closestChaser ? `#${raceSnapshot.closestChaser.rank}` : "-"
        }
        note={
          raceSnapshot.closestChaser
            ? `${raceSnapshot.closestChaser.name}, ${raceSnapshot.closestChaser.gap} pts back`
            : "No close chaser"
        }
      />
    </LedgerRows>
  );
}

function SnapshotMetric({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note: string;
}) {
  return (
    <LedgerRow className="py-4">
      <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold leading-none text-brand-ink">
        {value}
      </p>
      <p className="mt-2 line-clamp-3 text-sm leading-5 text-muted-foreground">
        {note}
      </p>
    </LedgerRow>
  );
}

function WinPathPanel({ digest }: { digest: EntryMovementDigest }) {
  const { winPath } = digest;

  return (
    <div className="border-t px-5 py-5">
      <div
        className={cn(
          "rounded-lg border p-4",
          winPath.status === "mathematicallyOut"
            ? "border-destructive/20 bg-destructive/5"
            : winPath.status === "canWin" || winPath.status === "leading"
              ? "border-brand-mark/20 bg-cta-green-soft"
              : "bg-background",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <span
              className={cn(
                "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border bg-surface-paper",
                winPath.status === "mathematicallyOut"
                  ? "text-destructive"
                  : "text-brand-mark",
              )}
              aria-hidden="true"
            >
              {winPath.status === "leading" ? (
                <Trophy className="size-5" />
              ) : (
                <Route className="size-5" />
              )}
            </span>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold tracking-normal text-brand-ink">
                Win path
              </h3>
              <p className="mt-1 text-base font-semibold leading-6 text-brand-ink">
                {winPath.summary}
              </p>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                Current {winPath.entryTotal} pts. Max possible{" "}
                {winPath.maxPossible} pts. Leader has {winPath.leaderTotal} pts.
              </p>
            </div>
          </div>
          <Badge
            variant={
              winPath.status === "mathematicallyOut" ? "destructive" : "secondary"
            }
          >
            {winPathStatusLabel(winPath.status)}
          </Badge>
        </div>

        {winPath.status === "canWin" && winPath.events.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {winPath.events.map((event) => (
              <div
                key={`${event.category}:${event.title}`}
                className="rounded-md border bg-surface-paper px-3 py-2"
              >
                <p className="text-sm font-semibold leading-5 text-brand-ink">
                  {event.title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {event.category} · +{event.points} route pts
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BigDeciders({ digest }: { digest: EntryMovementDigest }) {
  return (
    <div className="border-t">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div>
          <h3 className="text-lg font-semibold tracking-normal text-brand-ink">
            Big deciders
          </h3>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            The matches where one result helps, hurts, or clarifies the path.
          </p>
        </div>
        <StatusBadge
          tone={digest.matchDeciders.length ? "helpful" : "neutral"}
          label={`${digest.matchDeciders.length} match${digest.matchDeciders.length === 1 ? "" : "es"}`}
        />
      </div>

      {digest.matchDeciders.length ? (
        <LedgerRows className="grid gap-0 xl:grid-cols-2 xl:divide-x xl:[&>*:nth-child(2n+1)]:border-r">
          {digest.matchDeciders.map((decider) => (
            <MatchDeciderRow key={decider.id} decider={decider} />
          ))}
        </LedgerRows>
      ) : (
        <div className="border-t px-5 py-4 text-sm leading-6 text-muted-foreground">
          {digest.emptyState}
        </div>
      )}
    </div>
  );
}

function MatchDeciderRow({ decider }: { decider: MovementMatchDecider }) {
  return (
    <LedgerRow>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h4 className="font-semibold text-brand-ink">{decider.title}</h4>
        <Badge variant="outline">{decider.timing}</Badge>
      </div>
      <div className="mt-4 grid gap-3">
        {decider.best ? <OutcomeBlock outcome={decider.best} /> : null}
        {decider.danger ? <OutcomeBlock outcome={decider.danger} /> : null}
        {decider.neutral && !decider.best ? (
          <OutcomeBlock outcome={decider.neutral} />
        ) : null}
      </div>
    </LedgerRow>
  );
}

function OutcomeBlock({ outcome }: { outcome: MovementOutcomeSpotlight }) {
  const isDanger = outcome.label === "Danger result";
  const Icon = isDanger ? ArrowDownRight : ArrowUpRight;

  return (
    <div
      className={cn(
        "rounded-md border px-3 py-3",
        isDanger ? "border-destructive/20 bg-destructive/5" : "bg-background",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon
            className={cn(
              "size-4 shrink-0",
              isDanger ? "text-destructive" : "text-brand-mark",
            )}
            aria-hidden="true"
          />
          <p className="text-sm font-semibold text-brand-ink">
            {outcome.label}:{" "}
            <span className="text-muted-foreground">{outcome.outcome}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {outcome.badges.map((badge) => (
            <Badge
              key={badge}
              variant={isDanger ? "destructive" : "outline"}
            >
              {badge}
            </Badge>
          ))}
        </div>
      </div>
      <p className="mt-2 text-sm font-medium leading-6 text-brand-ink">
        {outcome.summary}
      </p>
    </div>
  );
}

function CloseRivals({ digest }: { digest: EntryMovementDigest }) {
  return (
    <div className="border-t">
      <div className="flex items-center gap-3 px-5 py-4">
        <UsersRound className="size-5 text-brand-mark" aria-hidden="true" />
        <div>
          <h3 className="text-lg font-semibold tracking-normal text-brand-ink">
            Close rivals
          </h3>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            Nearby entries that define the next move up or down.
          </p>
        </div>
      </div>

      {digest.closeRivals.length ? (
        <LedgerRows className="grid lg:grid-cols-2 lg:divide-x lg:[&>*:nth-child(2n+1)]:border-r">
          {digest.closeRivals.map((rival) => (
            <RivalRow key={rival.id} rival={rival} />
          ))}
        </LedgerRows>
      ) : (
        <div className="border-t px-5 py-4 text-sm leading-6 text-muted-foreground">
          No nearby rivals to show yet.
        </div>
      )}
    </div>
  );
}

function RivalRow({ rival }: { rival: CloseRival }) {
  return (
    <LedgerRow>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-brand-ink">
              #{rival.rank} {rival.name}
            </p>
            <Badge variant="outline">{relationLabel(rival.relation)}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {rival.total} pts, {rival.gap} pt gap
          </p>
        </div>
        {rival.relation === "chaser" ? (
          <ShieldAlert className="size-5 text-destructive" aria-hidden="true" />
        ) : null}
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-brand-ink">
        {rival.routeSummary}
      </p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {rival.riskSummary}
      </p>
      {rival.events.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {rival.events.map((event) => (
            <Badge key={`${event.category}:${event.title}`} variant="outline">
              {event.title} +{event.points}
            </Badge>
          ))}
        </div>
      ) : null}
    </LedgerRow>
  );
}

function relationLabel(relation: CloseRival["relation"]) {
  if (relation === "ahead") return "Ahead";
  if (relation === "chaser") return "Chaser";
  return "Tied";
}

function winPathStatusLabel(status: EntryMovementDigest["winPath"]["status"]) {
  if (status === "leading") return "Leading";
  if (status === "canWin") return "Can still win";
  if (status === "noVisibleRoute") return "No visible route";
  return "Out";
}

function winPathShortLabel(status: EntryMovementDigest["winPath"]["status"]) {
  if (status === "leading") return "Yes";
  if (status === "canWin") return "Yes";
  if (status === "noVisibleRoute") return "Unclear";
  return "No";
}

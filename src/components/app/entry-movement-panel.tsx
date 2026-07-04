import { ArrowDownRight, ArrowUpRight, ShieldAlert, UsersRound } from "lucide-react";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { StatusBadge } from "@/components/app/pool-public-widgets";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  CloseRival,
  EntryMovementDigest,
  MovementDecider,
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
      <BigDeciders digest={digest} />
      <CloseRivals digest={digest} />
    </LedgerPanel>
  );
}

function RaceSnapshot({ digest }: { digest: EntryMovementDigest }) {
  const { target, raceSnapshot } = digest;

  return (
    <LedgerRows className="grid md:grid-cols-3 xl:grid-cols-6 md:divide-x md:divide-y-0">
      <SnapshotMetric
        label="Now"
        value={`#${target.rank}`}
        note={`${target.total} pts of ${target.totalEntries} entries`}
      />
      <SnapshotMetric
        label="Closest ahead"
        value={raceSnapshot.closestAhead ? `#${raceSnapshot.closestAhead.rank}` : "-"}
        note={
          raceSnapshot.closestAhead
            ? `${raceSnapshot.closestAhead.name}, ${raceSnapshot.closestAhead.gap} pts up`
            : "No entry above"
        }
      />
      <SnapshotMetric
        label="Closest chaser"
        value={
          raceSnapshot.closestChaser ? `#${raceSnapshot.closestChaser.rank}` : "-"
        }
        note={
          raceSnapshot.closestChaser
            ? `${raceSnapshot.closestChaser.name}, ${raceSnapshot.closestChaser.gap} pts back`
            : "No close chaser"
        }
      />
      <SnapshotMetric
        label="Best path"
        value={`#${raceSnapshot.bestReachableRank}`}
        note={`${raceSnapshot.bestReachableTotal} pts reachable`}
      />
      <SnapshotMetric
        label="Paths up"
        value={raceSnapshot.pathsUp}
        note={`${raceSnapshot.impactfulMatchCount} match${raceSnapshot.impactfulMatchCount === 1 ? "" : "es"} with impact`}
      />
      <SnapshotMetric
        label="Downside"
        value={raceSnapshot.biggestDownside ? "Live" : "Low"}
        note={raceSnapshot.biggestDownside ?? "No visible drop trigger"}
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

function BigDeciders({ digest }: { digest: EntryMovementDigest }) {
  return (
    <div className="border-t">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div>
          <h3 className="text-lg font-semibold tracking-normal text-brand-ink">
            Big deciders
          </h3>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            Watch the outcome, then the rank swing.
          </p>
        </div>
        <StatusBadge
          tone={digest.deciders.length ? "helpful" : "neutral"}
          label={`${digest.deciders.length} active`}
        />
      </div>

      {digest.deciders.length ? (
        <LedgerRows>
          {digest.deciders.map((decider) => (
            <DeciderRow key={decider.id} decider={decider} />
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

function DeciderRow({ decider }: { decider: MovementDecider }) {
  const Icon =
    decider.direction === "down" || decider.direction === "mixed"
      ? ArrowDownRight
      : ArrowUpRight;

  return (
    <LedgerRow>
      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(12rem,18rem)] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Icon
              className={cn(
                "size-4",
                decider.direction === "down" || decider.direction === "mixed"
                  ? "text-destructive"
                  : decider.direction === "up"
                    ? "text-brand-mark"
                    : "text-muted-foreground",
              )}
              aria-hidden="true"
            />
            <p className="font-semibold text-brand-ink">{decider.title}</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            <span className="font-semibold text-brand-ink">Want:</span>{" "}
            {decider.desiredOutcome}
          </p>
          <p className="mt-1 text-base font-semibold leading-6 text-brand-ink">
            {decider.impact}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {decider.tags.map((tag) => (
            <Badge
              key={tag}
              variant={decider.direction === "down" ? "destructive" : "outline"}
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </LedgerRow>
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

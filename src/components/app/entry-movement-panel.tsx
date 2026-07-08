import {
  ArrowDownRight,
  ArrowRight,
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
  const dateGroups = groupMatchDecidersByDate(digest.matchDeciders);

  return (
    <div className="border-t px-5 py-5">
      <div className="rounded-lg border bg-background p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold tracking-normal text-brand-ink">
              Big deciders
            </h3>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              The matches where one result helps, hurts, or clarifies the path.
              Each lane starts from the current leaderboard spot and finishes at
              the projected result.
            </p>
          </div>
          <StatusBadge
            tone={digest.matchDeciders.length ? "helpful" : "neutral"}
            label={`${digest.matchDeciders.length} match${digest.matchDeciders.length === 1 ? "" : "es"}`}
          />
        </div>

        {digest.matchDeciders.length ? (
          <div className="mt-4 overflow-hidden rounded-md border bg-surface-paper">
            {dateGroups.map((group) => (
              <section key={group.key} className="[&+&]:border-t">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-surface-ledger/70 px-4 py-2">
                  <h4 className="text-sm font-semibold text-brand-ink">
                    {group.label}
                  </h4>
                  <Badge variant="outline">
                    {group.items.length} match{group.items.length === 1 ? "" : "es"}
                  </Badge>
                </div>
                <div className="divide-y">
                  {group.items.map((decider) => (
                    <MatchDeciderRow
                      key={decider.id}
                      currentRank={digest.target.rank}
                      decider={decider}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-md border bg-surface-paper px-4 py-3 text-sm leading-6 text-muted-foreground">
            {digest.emptyState}
          </div>
        )}
      </div>
    </div>
  );
}

function groupMatchDecidersByDate(deciders: MovementMatchDecider[]) {
  const groups = new Map<
    string,
    {
      key: string;
      label: string;
      items: MovementMatchDecider[];
    }
  >();

  for (const decider of deciders) {
    const key = matchDateGroupKey(decider.date);
    const group = groups.get(key) ?? {
      key,
      label: formatMatchDateGroup(decider.date),
      items: [],
    };
    group.items.push(decider);
    groups.set(key, group);
  }

  return Array.from(groups.values());
}

function matchDateGroupKey(value: string | undefined) {
  if (!value) return "unscheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unscheduled";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatMatchDateGroup(value: string | undefined) {
  if (!value) return "Unscheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unscheduled";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Toronto",
    weekday: "short",
    month: "long",
    day: "numeric",
  }).format(date);
}

function matchTitleWithoutDate(title: string) {
  return title.replace(/\s+-\s+.*$/, "");
}

function MatchDeciderRow({
  currentRank,
  decider,
}: {
  currentRank: number;
  decider: MovementMatchDecider;
}) {
  const outcomes = [decider.best, decider.danger, decider.neutral].filter(
    Boolean,
  ) as MovementOutcomeSpotlight[];

  return (
    <div className="px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h5 className="font-semibold text-brand-ink">
            {matchTitleWithoutDate(decider.title)}
          </h5>
        </div>
        <Badge variant="outline">{decider.timing}</Badge>
      </div>
      <div className="mt-4 space-y-3">
        {outcomes.map((outcome) => (
          <OutcomeLane
            key={outcome.id}
            currentRank={currentRank}
            outcome={outcome}
          />
        ))}
      </div>
    </div>
  );
}

function OutcomeLane({
  currentRank,
  outcome,
}: {
  currentRank: number;
  outcome: MovementOutcomeSpotlight;
}) {
  const isDanger = outcome.label === "Danger result";
  const isNeutral = outcome.label === "Neutral points";
  const Icon = isDanger ? ArrowDownRight : isNeutral ? ArrowRight : ArrowUpRight;
  const projectedRank =
    outcome.projectedRank ?? Math.max(1, currentRank - outcome.rankChange);
  const visibleBadges = outcome.badges.filter(
    (badge) => !isRedundantOutcomeBadge(badge, outcome, projectedRank),
  );

  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        isDanger
          ? "border-destructive/20 bg-destructive/5"
          : isNeutral
            ? "bg-background"
            : "border-brand-mark/20 bg-cta-green-soft/70",
      )}
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_8.5rem] lg:items-stretch">
        <div className="relative min-h-[5.75rem] overflow-hidden rounded-md border bg-surface-paper px-3 py-3">
          <div
            className={cn(
              "absolute left-4 right-4 top-1/2 h-1 -translate-y-1/2 rounded-full",
              isDanger
                ? "bg-destructive/20"
                : isNeutral
                  ? "bg-muted"
                  : "bg-brand-mark/20",
            )}
            aria-hidden="true"
          />
          <div className="relative grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full border bg-surface-paper shadow-sm",
                isDanger ? "text-destructive" : "text-brand-mark",
              )}
              aria-hidden="true"
            >
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 rounded-md border bg-background px-3 py-2 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                {outcome.label}
              </p>
              <p className="mt-1 break-words text-sm font-semibold leading-5 text-brand-ink">
                {outcome.outcome}
              </p>
            </div>
            <span
              className={cn(
                "hidden h-9 min-w-9 shrink-0 items-center justify-center rounded-full border bg-surface-paper px-2 text-xs font-semibold shadow-sm sm:inline-flex",
                isDanger ? "text-destructive" : "text-brand-mark",
              )}
            >
              {rankEffectLabel(outcome)}
            </span>
          </div>
        </div>

        <LanePost
          label="Projected"
          value={`#${projectedRank}`}
          note={pointEffectLabel(outcome)}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <p className="min-w-0 flex-1 text-sm font-medium leading-6 text-brand-ink">
          {outcome.summary}
        </p>
        {visibleBadges.length ? (
          <div className="flex flex-wrap gap-2">
            {visibleBadges.map((badge) => (
              <Badge key={badge} variant={isDanger ? "destructive" : "outline"}>
                {badge}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LanePost({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-3 rounded-md border bg-surface-paper px-3 py-2 lg:flex-col lg:items-start lg:justify-center">
      <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
        {label}
      </p>
      <div className="text-right lg:text-left">
        <p className="text-xl font-semibold leading-none text-brand-ink">
          {value}
        </p>
        {note ? (
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            {note}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function rankEffectLabel(outcome: MovementOutcomeSpotlight) {
  if (outcome.rankChange > 0) return `+${outcome.rankChange}`;
  if (outcome.rankChange < 0) return `${outcome.rankChange}`;
  return "0";
}

function pointEffectLabel(outcome: MovementOutcomeSpotlight) {
  if (outcome.pointChange > 0) return `+${outcome.pointChange} pts`;
  if (outcome.pointChange < 0) return `${outcome.pointChange} pts`;
  return "No point gain";
}

function isRedundantOutcomeBadge(
  badge: string,
  outcome: MovementOutcomeSpotlight,
  projectedRank: number,
) {
  return (
    badge === `Up to #${projectedRank}` ||
    badge === `Down to #${projectedRank}` ||
    badge === `Stays #${projectedRank}` ||
    badge === pointEffectLabel(outcome)
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
        <div className="flex min-w-0 items-start gap-3">
          <RivalAvatar name={rival.name} />
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

function RivalAvatar({ name }: { name: string }) {
  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-full border bg-cta-green-soft text-sm font-semibold text-brand-mark">
      {rivalInitials(name)}
    </span>
  );
}

function rivalInitials(name: string) {
  const words = name
    .replace(/\s+\(\d+\)$/, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return (
    words
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join("") || "?"
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

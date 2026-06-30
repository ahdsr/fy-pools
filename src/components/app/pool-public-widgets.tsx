import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { displayTeamName } from "@/lib/world-cup-pool/scoring";
import type {
  EntriesConfig,
  EntryPicks,
  MatchResult,
  PoolResults,
  PoolScore,
} from "@/lib/world-cup-pool/types";
import { cn } from "@/lib/utils";

type PublicToolLink = {
  title: string;
  body: string;
  href: string;
  icon: LucideIcon;
};

export function StatGrid({
  stats,
}: {
  stats: { label: string; value: string | number; note?: string }[];
}) {
  return (
    <LedgerRows className="grid md:grid-cols-4 md:divide-x md:divide-y-0">
      {stats.map((stat) => (
        <LedgerRow key={stat.label}>
          <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground sm:text-sm">
            {stat.label}
          </p>
          <p className="mt-2 text-2xl font-semibold leading-none text-brand-ink sm:text-3xl">
            {stat.value}
          </p>
          {stat.note ? (
            <p className="mt-2 text-[0.9375rem] font-normal leading-6 text-muted-foreground sm:text-sm sm:leading-5">
              {stat.note}
            </p>
          ) : null}
        </LedgerRow>
      ))}
    </LedgerRows>
  );
}

export function ScoreCards({
  score,
  position,
}: {
  score: PoolScore;
  position?: {
    rank: number;
    totalEntries: number;
  };
}) {
  const cards = [
    ["Group", score.subtotals.group],
    ["Knockout", score.subtotals.knockout],
    ["Finals", score.subtotals.finals],
    ["Bonus", score.subtotals.bonus],
  ] as const;

  return (
    <LedgerPanel title="Score summary">
      <LedgerRows className="grid lg:grid-cols-6 lg:divide-x lg:divide-y-0">
        <LedgerRow className="bg-cta-green-soft">
          <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground sm:text-sm">
            Position
          </p>
          <p className="mt-2 text-3xl font-semibold leading-none text-brand-ink sm:text-4xl">
            {position ? `#${position.rank}` : "-"}
          </p>
          {position ? (
            <p className="mt-2 text-[0.9375rem] leading-6 text-muted-foreground sm:text-sm sm:leading-5">
              of {position.totalEntries} entries
            </p>
          ) : null}
        </LedgerRow>
        <LedgerRow>
          <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground sm:text-sm">
            Total
          </p>
          <p className="mt-2 text-2xl font-semibold leading-none text-brand-ink sm:text-3xl">
            {score.total}
          </p>
        </LedgerRow>
        {cards.map(([label, points]) => (
          <LedgerRow key={label}>
            <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground sm:text-sm">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold leading-none text-brand-ink sm:text-3xl">
              {points}
            </p>
          </LedgerRow>
        ))}
      </LedgerRows>
    </LedgerPanel>
  );
}

export function PayoutPanel({
  entriesConfig,
  compact = false,
}: {
  entriesConfig: EntriesConfig;
  compact?: boolean;
}) {
  if (!entriesConfig.payouts?.length) return null;

  return (
    <LedgerPanel
      title="Prize ledger"
      description={entriesConfig.prizePoolLabel}
    >
      <LedgerRows
        className={
          compact
            ? undefined
            : "grid sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4"
        }
      >
        {entriesConfig.payouts.map((payout) => (
          <LedgerRow key={payout.place}>
            <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground sm:text-sm">
              {payout.place}
            </p>
            <p className="mt-2 text-xl font-semibold text-brand-ink sm:text-2xl">
              {payout.amount}
            </p>
          </LedgerRow>
        ))}
      </LedgerRows>
    </LedgerPanel>
  );
}

export function PublicToolsPanel({ tools }: { tools: PublicToolLink[] }) {
  return (
    <LedgerPanel title="Pool tools">
      <LedgerRows>
        {tools.map((item) => {
          const Icon = item.icon;

          return (
            <LedgerRow key={item.title} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Icon className="size-5 text-brand-mark" />
                <Badge variant="outline">Public</Badge>
              </div>
              <div>
                <p className="font-semibold text-brand-ink">{item.title}</p>
                <p className="mt-1 text-[0.9375rem] font-normal leading-6 text-muted-foreground sm:text-sm sm:leading-5">
                  {item.body}
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href={item.href}>Open</Link>
              </Button>
            </LedgerRow>
          );
        })}
      </LedgerRows>
    </LedgerPanel>
  );
}

export function LatestUpdatesPanel({
  results,
  referencePicks,
}: {
  results: PoolResults;
  referencePicks?: EntryPicks;
}) {
  const matches = results.matches ?? [];
  const liveMatches = matches.filter(isLiveMatch).slice(0, 5);
  const upcomingMatches = matches
    .filter(isUpcomingMatch)
    .slice(0, Math.max(0, 5 - liveMatches.length));

  return (
    <LedgerPanel
      title="Match updates"
      description={results.meta?.status ?? "Latest standings update"}
    >
      <div className="divide-y">
        <MatchUpdatesSection
          title="Live"
          matches={liveMatches}
          referencePicks={referencePicks}
          emptyLabel="No live matches"
        />
        <MatchUpdatesSection
          title="Upcoming"
          matches={upcomingMatches}
          referencePicks={referencePicks}
          emptyLabel="No upcoming matches"
        />
      </div>
    </LedgerPanel>
  );
}

function MatchUpdatesSection({
  title,
  matches,
  referencePicks,
  emptyLabel,
}: {
  title: string;
  matches: MatchResult[];
  referencePicks?: EntryPicks;
  emptyLabel: string;
}) {
  return (
    <section>
      <h3 className="border-b bg-background/55 px-5 py-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
        {title}
      </h3>
      {matches.length ? (
        <LedgerRows>
          {matches.map((match) => (
            <LedgerRow key={match.id} className="space-y-2">
              <div className="min-w-0">
                {match.detail ? (
                  <p className="mb-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                    {match.detail}
                  </p>
                ) : null}
                <MatchupLine
                  homeTeam={match.homeTeam}
                  awayTeam={match.awayTeam}
                  picks={referencePicks}
                  homeScore={shouldShowScore(match) ? match.homeScore : undefined}
                  awayScore={shouldShowScore(match) ? match.awayScore : undefined}
                  layout="split"
                  className="text-sm"
                />
              </div>
            </LedgerRow>
          ))}
        </LedgerRows>
      ) : (
        <p className="px-5 py-4 text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </section>
  );
}

function isLiveMatch(match: MatchResult) {
  return match.state === "in" && !match.completed;
}

function isUpcomingMatch(match: MatchResult) {
  return !match.completed && match.state !== "in" && match.state !== "post";
}

function shouldShowScore(match: MatchResult) {
  return match.completed || match.state === "in";
}

export function StatusBadge({
  label,
  tone = "neutral",
  className,
}: {
  label: ReactNode;
  tone?: "neutral" | "live" | "helpful";
  className?: string;
}) {
  return (
    <Badge
      variant={tone === "neutral" ? "outline" : "secondary"}
      className={cn("max-w-full", className)}
    >
      <span className="truncate">{label}</span>
    </Badge>
  );
}

export function PointsBadge({
  points,
  active,
}: {
  points: number;
  active?: boolean;
}) {
  return <Badge variant={active ? "secondary" : "outline"}>{points} pts</Badge>;
}

export function TeamPill({
  team,
  picks,
  score,
  className,
  flagPosition = "start",
}: {
  team?: string;
  picks?: EntryPicks;
  score?: string | number | null;
  className?: string;
  flagPosition?: "start" | "end";
}) {
  if (!team) {
    return <span className="text-muted-foreground">Not entered</span>;
  }

  const option = Object.values(picks?.groups ?? {})
    .flatMap((group) => group.teams)
    .find((item) => item.name === team);

  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-2 font-medium text-brand-ink",
        className,
      )}
    >
      {flagPosition === "start" ? <TeamFlag flagCode={option?.flagCode} /> : null}
      <span className="truncate">{displayTeamName(team)}</span>
      {score !== undefined ? (
        <span className="shrink-0 text-muted-foreground">({score ?? "-"})</span>
      ) : null}
      {flagPosition === "end" ? <TeamFlag flagCode={option?.flagCode} /> : null}
    </span>
  );
}

function TeamFlag({ flagCode }: { flagCode?: string }) {
  if (!flagCode) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w40/${flagCode}.png`}
      alt=""
      loading="lazy"
      className="h-4 w-6 shrink-0 rounded-[2px] border object-cover"
    />
  );
}

export function MatchupLine({
  homeTeam,
  awayTeam,
  picks,
  homeScore,
  awayScore,
  className,
  layout = "inline",
}: {
  homeTeam?: string;
  awayTeam?: string;
  picks?: EntryPicks;
  homeScore?: string | number | null;
  awayScore?: string | number | null;
  className?: string;
  layout?: "inline" | "split";
}) {
  if (layout === "split") {
    return (
      <div
        className={cn(
          "grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 font-semibold text-brand-ink",
          className,
        )}
      >
        <TeamPill team={homeTeam} picks={picks} score={homeScore} />
        <span className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          vs
        </span>
        <TeamPill
          team={awayTeam}
          picks={picks}
          score={awayScore}
          flagPosition="end"
          className="justify-end text-right"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-brand-ink",
        className,
      )}
    >
      <TeamPill team={homeTeam} picks={picks} score={homeScore} />
      <span className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
        vs
      </span>
      <TeamPill team={awayTeam} picks={picks} score={awayScore} />
    </div>
  );
}

export function EmptyStateAction({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Button asChild variant="secondaryGreen">
      <Link href={href}>{label}</Link>
    </Button>
  );
}

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
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
import { displayTeamName } from "@/lib/world-cup-pool/scoring";
import type {
  EntriesConfig,
  EntryPicks,
  LeaderboardRow,
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
          <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
            {stat.label}
          </p>
          <p className="mt-2 text-3xl font-semibold leading-none text-brand-ink">
            {stat.value}
          </p>
          {stat.note ? (
            <p className="mt-2 text-sm font-normal leading-5 text-muted-foreground">
              {stat.note}
            </p>
          ) : null}
        </LedgerRow>
      ))}
    </LedgerRows>
  );
}

export function ScoreCards({ score }: { score: PoolScore }) {
  const cards = [
    ["Group", score.subtotals.group],
    ["Knockout", score.subtotals.knockout],
    ["Finals", score.subtotals.finals],
    ["Bonus", score.subtotals.bonus],
  ] as const;

  return (
    <LedgerPanel title="Score summary">
      <LedgerRows className="grid md:grid-cols-5 md:divide-x md:divide-y-0">
        <LedgerRow className="bg-cta-green-soft">
          <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
            Total
          </p>
          <p className="mt-2 text-4xl font-semibold leading-none text-brand-ink">
            {score.total}
          </p>
        </LedgerRow>
        {cards.map(([label, points]) => (
          <LedgerRow key={label}>
            <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
              {label}
            </p>
            <p className="mt-2 text-3xl font-semibold leading-none text-brand-ink">
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
            <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
              {payout.place}
            </p>
            <p className="mt-2 text-2xl font-semibold text-brand-ink">
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
                <p className="mt-1 text-sm font-normal leading-5 text-muted-foreground">
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

export function LeaderboardTable({
  rows,
  poolSlug,
  limit,
}: {
  rows: LeaderboardRow[];
  poolSlug: string;
  limit?: number;
}) {
  const visibleRows = limit ? rows.slice(0, limit) : rows;

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-surface-ledger hover:bg-surface-ledger">
          <TableHead>Rank</TableHead>
          <TableHead>Entry</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Group</TableHead>
          <TableHead>Knockout</TableHead>
          <TableHead>Finals</TableHead>
          <TableHead>Bonus</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {visibleRows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-semibold text-brand-ink">
              {row.rank}
            </TableCell>
            <TableCell>
              <Link
                href={`/pools/${poolSlug}/entry/${row.id}`}
                className="font-medium text-brand-ink hover:text-brand-hot"
              >
                {row.name}
              </Link>
            </TableCell>
            <TableCell className="font-semibold">{row.score.total}</TableCell>
            <TableCell>{row.score.subtotals.group}</TableCell>
            <TableCell>{row.score.subtotals.knockout}</TableCell>
            <TableCell>{row.score.subtotals.finals}</TableCell>
            <TableCell>{row.score.subtotals.bonus}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function LatestUpdatesPanel({
  results,
  referencePicks,
}: {
  rows: LeaderboardRow[];
  results: PoolResults;
  referencePicks?: EntryPicks;
}) {
  const matches = (results.matches ?? []).slice(0, 5);

  return (
    <LedgerPanel
      title="Latest updates"
      description={results.meta?.status ?? "Latest standings update"}
    >
      <LedgerRows>
        {matches.map((match) => (
          <LedgerRow key={match.id} className="space-y-2">
            <div className="min-w-0">
              <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
                <StatusBadge
                  tone={match.state === "in" ? "live" : "neutral"}
                  label={
                    match.detail || (match.completed ? "Final" : "Upcoming")
                  }
                />
                <span className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                  {renderMatchStatus(match)}
                </span>
              </div>
              <MatchupLine
                homeTeam={match.homeTeam}
                awayTeam={match.awayTeam}
                picks={referencePicks}
                homeScore={shouldShowScore(match) ? match.homeScore : undefined}
                awayScore={shouldShowScore(match) ? match.awayScore : undefined}
                className="text-sm"
              />
            </div>
          </LedgerRow>
        ))}
      </LedgerRows>
    </LedgerPanel>
  );
}

function renderMatchStatus(match: MatchResult) {
  if (match.winner) {
    return `${displayTeamName(match.winner)} won`;
  }
  if (match.state === "in" && !match.completed) {
    return "Live";
  }
  if (!match.completed) {
    return "Upcoming";
  }
  return "Draw";
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
}: {
  team?: string;
  picks?: EntryPicks;
  score?: string | number | null;
  className?: string;
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
      {option?.flagCode ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://flagcdn.com/w40/${option.flagCode}.png`}
          alt=""
          loading="lazy"
          className="h-4 w-6 rounded-[2px] border object-cover"
        />
      ) : null}
      <span className="truncate">{displayTeamName(team)}</span>
      {score !== undefined ? (
        <span className="shrink-0 text-muted-foreground">({score ?? "-"})</span>
      ) : null}
    </span>
  );
}

export function MatchupLine({
  homeTeam,
  awayTeam,
  picks,
  homeScore,
  awayScore,
  className,
}: {
  homeTeam?: string;
  awayTeam?: string;
  picks?: EntryPicks;
  homeScore?: string | number | null;
  awayScore?: string | number | null;
  className?: string;
}) {
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

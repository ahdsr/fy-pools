import Link from "next/link";

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

export function PayoutPanel({ entriesConfig }: { entriesConfig: EntriesConfig }) {
  if (!entriesConfig.payouts?.length) return null;

  return (
    <LedgerPanel title="Prize ledger" description={entriesConfig.prizePoolLabel}>
      <LedgerRows className="grid sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
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
  rows,
  results,
}: {
  rows: LeaderboardRow[];
  results: PoolResults;
}) {
  const leaders = rows.filter((row) => row.rank === 1);
  const matches = (results.matches ?? []).slice(0, 5);

  return (
    <LedgerPanel
      title="Latest updates"
      description={results.meta?.status ?? "Latest standings update"}
    >
      <LedgerRows>
        {leaders.length ? (
          <LedgerRow>
            <p className="font-medium text-brand-ink">
              {leaders.map((leader) => leader.name).join(" and ")}{" "}
              {leaders.length === 1 ? "leads" : "share first"} with{" "}
              {leaders[0].score.total} points.
            </p>
          </LedgerRow>
        ) : null}
        {matches.map((match) => (
          <LedgerRow key={match.id} className="grid gap-2 md:grid-cols-[7rem_1fr_auto] md:items-center">
            <Badge variant={match.state === "in" ? "secondary" : "outline"}>
              {match.detail || (match.completed ? "FT" : "Live")}
            </Badge>
            <p className="font-medium text-brand-ink">
              {renderMatchText(match)}
            </p>
            <p className="text-sm font-normal text-muted-foreground">
              {match.homeScore ?? "-"}-{match.awayScore ?? "-"}
            </p>
          </LedgerRow>
        ))}
      </LedgerRows>
    </LedgerPanel>
  );
}

function renderMatchText(match: MatchResult) {
  const home = displayTeamName(match.homeTeam);
  const away = displayTeamName(match.awayTeam);
  if (match.winner) {
    return `${displayTeamName(match.winner)} beat ${displayTeamName(match.loser)}`;
  }
  if (match.state === "in" && !match.completed) {
    return `Live: ${home} vs ${away}`;
  }
  return `${home} drew ${away}`;
}

export function TeamPill({ team, picks }: { team?: string; picks?: EntryPicks }) {
  if (!team) {
    return <span className="text-muted-foreground">Not entered</span>;
  }

  const option = Object.values(picks?.groups ?? {})
    .flatMap((group) => group.teams)
    .find((item) => item.name === team);

  return (
    <span className="inline-flex min-w-0 items-center gap-2 font-medium text-brand-ink">
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
    </span>
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

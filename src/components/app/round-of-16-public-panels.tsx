import Link from "next/link";
import { CheckCircle2, Pencil, Trophy } from "lucide-react";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { MatchupLine, TeamPill } from "@/components/app/pool-public-widgets";
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
import type {
  RoundOf16PublicEntry,
  RoundOf16PublicPool,
  RoundOf16ViewerEntry,
} from "@/lib/round-of-16/public";
import type { RoundOf16StoredLeaderboardRow } from "@/lib/round-of-16/persistence";
import {
  getKnockoutPoolStageDetails,
  getEnabledRoundOf16BonusProps,
  type RoundOf16PoolSettings,
} from "@/lib/templates/round-of-16-draft";
import { formatDateTime } from "@/lib/date-time";

function latestResultByLineKey(rows: RoundOf16StoredLeaderboardRow[]) {
  const firstScoredRow = rows[0];
  const resultByLineKey = new Map<string, string>();

  for (const line of firstScoredRow?.lines ?? []) {
    if (line.result) resultByLineKey.set(line.key, line.result);
  }

  return resultByLineKey;
}

export function RoundOf16PublicStats({ pool }: { pool: RoundOf16PublicPool }) {
  const leader = pool.latestStandings[0];

  return (
    <LedgerPanel>
      <LedgerRows className="grid md:grid-cols-5 md:divide-x md:divide-y-0">
        <LedgerRow>
          <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground sm:text-sm">
            Entries
          </p>
          <p className="mt-2 text-2xl font-semibold leading-none text-brand-ink sm:text-3xl">
            {pool.entries.length}
          </p>
          <p className="mt-2 text-sm font-normal leading-5 text-muted-foreground">
            Submitted picks
          </p>
        </LedgerRow>
        <LedgerRow>
          <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground sm:text-sm">
            First place
          </p>
          <p className="mt-2 text-2xl font-semibold leading-none text-brand-ink sm:text-3xl">
            {leader?.entryName ?? "TBD"}
          </p>
          <p className="mt-2 text-sm font-normal leading-5 text-muted-foreground">
            {leader ? `${leader.total} points` : "Not scored"}
          </p>
        </LedgerRow>
        <LedgerRow>
          <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground sm:text-sm">
            Pick lock
          </p>
          <p className="mt-2 text-2xl font-semibold leading-none text-brand-ink sm:text-3xl">
            {pool.settings.basics.picksLockAt ? "Set" : "Open"}
          </p>
          <p className="mt-2 text-sm font-normal leading-5 text-muted-foreground">
            {formatDateTime(pool.settings.basics.picksLockAt)}
          </p>
        </LedgerRow>
        <LedgerRow>
          <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground sm:text-sm">
            Prize
          </p>
          <p className="mt-2 text-2xl font-semibold leading-none text-brand-ink sm:text-3xl">
            {pool.settings.scoring.prizePoolLabel || "TBD"}
          </p>
          <p className="mt-2 text-sm font-normal leading-5 text-muted-foreground">
            {pool.settings.payouts.filter((payout) => payout.place || payout.amount).length} payouts
          </p>
        </LedgerRow>
        <LedgerRow>
          <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground sm:text-sm">
            Scoring
          </p>
          <p className="mt-2 text-2xl font-semibold leading-none text-brand-ink sm:text-3xl">
            {pool.latestStandingsCalculatedAt ? "Updated" : "Pending"}
          </p>
          <p className="mt-2 text-sm font-normal leading-5 text-muted-foreground">
            {pool.latestStandingsCalculatedAt
              ? formatDateTime(pool.latestStandingsCalculatedAt)
              : "No snapshot yet"}
          </p>
        </LedgerRow>
      </LedgerRows>
    </LedgerPanel>
  );
}

export function RoundOf16ViewerEntryPanel({
  entry,
  settings,
}: {
  entry: NonNullable<RoundOf16PublicPool["viewerEntry"]>;
  settings: RoundOf16PoolSettings;
}) {
  const bonusProps = getEnabledRoundOf16BonusProps(settings);

  return (
    <LedgerPanel
      title="Your picks"
      description={`Submitted ${formatDateTime(entry.submittedAt)}.`}
      action={
        entry.canEdit ? (
          <Button asChild variant="primaryGreen">
            <Link href={entry.editHref}>
              Edit picks <Pencil />
            </Link>
          </Button>
        ) : (
          <Badge variant="outline">Locked</Badge>
        )
      }
    >
      <LedgerRows>
        <LedgerRow className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {settings.matchups.map((matchup, index) => (
            <div key={matchup.id} className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                Match {index + 1}
              </p>
              <TeamPill
                team={entry.picks.winners[matchup.id]}
                className="mt-1 max-w-full"
                emptyLabel="No pick"
              />
            </div>
          ))}
        </LedgerRow>
        {bonusProps.length ? (
          <LedgerRow className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bonusProps.map((prop) => (
              <div key={prop.id} className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                  {prop.label}
                </p>
                <p className="mt-1 truncate font-semibold text-brand-ink">
                  {entry.picks.bonusAnswers[prop.id] ?? "No answer"}
                </p>
              </div>
            ))}
          </LedgerRow>
        ) : null}
      </LedgerRows>
    </LedgerPanel>
  );
}

export function RoundOf16Leaderboard({
  rows,
  entries,
  poolSlug,
}: {
  rows: RoundOf16StoredLeaderboardRow[];
  entries: RoundOf16PublicEntry[];
  poolSlug: string;
}) {
  if (rows.length === 0) {
    return (
      <LedgerPanel
        id="leaderboard"
        title="Leaderboard"
        description="Standings appear after picks lock and scoring updates run."
      >
        <LedgerRows>
          {entries.map((entry) => (
            <LedgerRow
              key={entry.entryId}
              className="flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-semibold text-brand-ink">{entry.entryName}</p>
                <p className="mt-1 text-sm font-normal text-muted-foreground">
                  Submitted {formatDateTime(entry.submittedAt)}
                </p>
              </div>
              <Badge variant="outline">Awaiting score</Badge>
            </LedgerRow>
          ))}
          {entries.length === 0 ? (
            <LedgerRow>
              <p className="text-sm font-normal leading-6 text-muted-foreground">
                No submitted entries are public yet.
              </p>
            </LedgerRow>
          ) : null}
        </LedgerRows>
      </LedgerPanel>
    );
  }

  return (
    <LedgerPanel
      id="leaderboard"
      title="Leaderboard"
      description="Latest stored standings snapshot from automatic scoring."
      action={<Badge variant="outline">{rows.length} scored</Badge>}
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-surface-ledger hover:bg-surface-ledger">
            <TableHead>Rank</TableHead>
            <TableHead>Entry</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Max</TableHead>
            <TableHead>Submitted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.entryId}>
              <TableCell className="font-semibold text-brand-ink">
                {row.rank}
              </TableCell>
              <TableCell>
                <Link
                  href={`/pools/${poolSlug}/entry/${row.entryId}`}
                  className="font-medium text-brand-ink hover:text-brand-hot"
                >
                  {row.entryName}
                </Link>
              </TableCell>
              <TableCell className="font-semibold text-brand-ink">
                {row.total}
              </TableCell>
              <TableCell>{row.maxPoints}</TableCell>
              <TableCell>{formatDateTime(row.submittedAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </LedgerPanel>
  );
}

export function RoundOf16EntrantsPanel({
  entries,
  poolSlug,
  picksArePublic,
}: {
  entries: RoundOf16PublicEntry[];
  poolSlug: string;
  picksArePublic: boolean;
}) {
  return (
    <LedgerPanel
      title="Entrants"
      description={
        picksArePublic
          ? "Submitted entries in this pool."
          : "Submitted entries are listed now. Pick details unlock after the deadline."
      }
    >
      <LedgerRows>
        {entries.map((entry) => (
          <LedgerRow
            key={entry.entryId}
            className="flex items-center justify-between gap-4"
          >
            <div className="min-w-0">
              {entry.picksVisible ? (
                <Link
                  href={`/pools/${poolSlug}/entry/${entry.entryId}`}
                  className="block truncate font-semibold text-brand-ink hover:text-brand-hot"
                >
                  {entry.entryName}
                </Link>
              ) : (
                <p className="truncate font-semibold text-brand-ink">
                  {entry.entryName}
                </p>
              )}
              <p className="mt-1 text-sm font-normal text-muted-foreground">
                Submitted {formatDateTime(entry.submittedAt)}
              </p>
            </div>
            <Badge variant="outline">
              {entry.picksVisible ? "Viewable" : "Locked"}
            </Badge>
          </LedgerRow>
        ))}
        {entries.length === 0 ? (
          <LedgerRow>
            <p className="text-sm font-normal leading-6 text-muted-foreground">
              No submitted entries yet.
            </p>
          </LedgerRow>
        ) : null}
      </LedgerRows>
    </LedgerPanel>
  );
}

export function RoundOf16BracketPanel({
  settings,
  standings,
}: {
  settings: RoundOf16PoolSettings;
  standings: RoundOf16StoredLeaderboardRow[];
}) {
  const results = latestResultByLineKey(standings);
  const stage = getKnockoutPoolStageDetails(settings);

  return (
    <LedgerPanel
      title={`${stage.label} bracket`}
      description="Configured matchups with official winners shown after scoring."
    >
      <LedgerRows className="grid lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        {settings.matchups.map((matchup, index) => {
          const result = results.get(`${stage.fieldPrefix}_${index + 1}_winner`) ?? "";

          return (
            <LedgerRow key={matchup.id} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-brand-ink">
                  Match {index + 1}
                </p>
                <Badge variant={result ? "secondary" : "outline"}>
                  {result ? "Final" : "Pending"}
                </Badge>
              </div>
              <div className="divide-y rounded-md border bg-background">
                {[matchup.teamOne, matchup.teamTwo].map((team) => {
                  const winner = result && team === result;

                  return (
                    <div
                      key={team}
                      className="flex min-h-11 items-center justify-between gap-3 px-3 py-2"
                    >
                      <TeamPill team={team} className="max-w-full" />
                      {winner ? (
                        <CheckCircle2 className="size-4 text-brand-success" />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </LedgerRow>
          );
        })}
      </LedgerRows>
    </LedgerPanel>
  );
}

export function RoundOf16EntryDetail({
  entry,
  settings,
  standing,
}: {
  entry: RoundOf16ViewerEntry;
  settings: RoundOf16PoolSettings;
  standing?: RoundOf16StoredLeaderboardRow;
}) {
  const bonusProps = getEnabledRoundOf16BonusProps(settings);
  const stage = getKnockoutPoolStageDetails(settings);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <LedgerPanel
        title="Submitted picks"
        description={`This entry's locked ${stage.pluralLabel.toLowerCase()} winners and bonus answers.`}
      >
        <LedgerRows>
          {settings.matchups.map((matchup, index) => (
            <LedgerRow
              key={matchup.id}
              className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center"
            >
              <div>
                <p className="font-semibold text-brand-ink">
                  {matchup.label || `${stage.label} Match ${index + 1}`}
                </p>
                <MatchupLine
                  homeTeam={matchup.teamOne}
                  awayTeam={matchup.teamTwo}
                  className="mt-1 text-sm"
                />
              </div>
              <Badge variant="outline">
                <TeamPill
                  team={entry.picks.winners[matchup.id]}
                  className="max-w-36"
                  emptyLabel="No pick"
                />
              </Badge>
            </LedgerRow>
          ))}
          {bonusProps.map((prop) => (
            <LedgerRow
              key={prop.id}
              className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center"
            >
              <div>
                <p className="font-semibold text-brand-ink">{prop.label}</p>
                <p className="mt-1 text-sm font-normal text-muted-foreground">
                  {prop.points} points
                </p>
              </div>
              <Badge variant="outline">
                {entry.picks.bonusAnswers[prop.id] ?? "No pick"}
              </Badge>
            </LedgerRow>
          ))}
        </LedgerRows>
      </LedgerPanel>

      <LedgerPanel
        title="Score breakdown"
        description="Line-item scoring from the latest leaderboard snapshot."
        action={standing ? <Trophy className="size-5 text-brand-mark" /> : null}
      >
        {standing ? (
          <LedgerRows>
            <LedgerRow>
              <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
                Total
              </p>
              <p className="mt-2 text-3xl font-semibold text-brand-ink">
                {standing.total}/{standing.maxPoints}
              </p>
            </LedgerRow>
            {standing.lines.map((line) => (
              <LedgerRow key={line.key}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-brand-ink">{line.label}</p>
                    <p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">
                      Pick: {line.pick || "None"}; Result: {line.result || "Pending"}
                    </p>
                  </div>
                  <Badge variant={line.pointsAwarded ? "secondary" : "outline"}>
                    {line.pointsAwarded}/{line.maxPoints}
                  </Badge>
                </div>
              </LedgerRow>
            ))}
          </LedgerRows>
        ) : (
          <LedgerRow>
            <p className="text-sm font-normal leading-6 text-muted-foreground">
              This entry has not been scored yet.
            </p>
          </LedgerRow>
        )}
      </LedgerPanel>
    </div>
  );
}

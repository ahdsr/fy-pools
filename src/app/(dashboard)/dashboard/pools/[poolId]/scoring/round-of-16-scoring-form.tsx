"use client";

import { Calculator, CheckCircle2 } from "lucide-react";
import * as React from "react";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RoundOf16StoredLeaderboardRow } from "@/lib/round-of-16/persistence";
import {
  getEnabledRoundOf16BonusProps,
  type RoundOf16PoolSettings,
} from "@/lib/templates/round-of-16-draft";
import {
  refreshRoundOf16ScoringAction,
  type RefreshRoundOf16ScoringState,
} from "./actions";

type RoundOf16ScoringFormProps = {
  poolId: string;
  settings: RoundOf16PoolSettings;
  initialRows: RoundOf16StoredLeaderboardRow[];
};

function latestRows({
  actionRows,
  initialRows,
}: {
  actionRows?: RoundOf16StoredLeaderboardRow[];
  initialRows: RoundOf16StoredLeaderboardRow[];
}) {
  return actionRows ?? initialRows;
}

function ScoreboardTable({ rows }: { rows: RoundOf16StoredLeaderboardRow[] }) {
  if (rows.length === 0) {
    return (
      <LedgerRow>
        <p className="text-sm font-normal leading-6 text-muted-foreground">
          No scored standings yet. Enter results and refresh scoring to create
          the first leaderboard snapshot.
        </p>
      </LedgerRow>
    );
  }

  return (
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
            <TableCell>{row.entryName}</TableCell>
            <TableCell className="font-semibold text-brand-ink">
              {row.total}
            </TableCell>
            <TableCell>{row.maxPoints}</TableCell>
            <TableCell>
              {row.submittedAt
                ? new Date(row.submittedAt).toLocaleString()
                : "Not submitted"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function RoundOf16ScoringForm({
  poolId,
  settings,
  initialRows,
}: RoundOf16ScoringFormProps) {
  const [state, formAction, pending] = React.useActionState<
    RefreshRoundOf16ScoringState,
    FormData
  >(refreshRoundOf16ScoringAction, {});
  const rows = latestRows({ actionRows: state.rows, initialRows });
  const enabledBonusProps = getEnabledRoundOf16BonusProps(settings);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_26rem] xl:items-start">
      <LedgerPanel
        title="Round of 16 results"
        description="Enter official results, then refresh scoring to store line-item breakdowns and a leaderboard snapshot."
      >
        <form action={formAction} className="space-y-5 p-5">
          <input type="hidden" name="poolId" value={poolId} />
          <LedgerRows className="overflow-hidden rounded-lg border">
            {settings.matchups.map((matchup, index) => (
              <LedgerRow
                key={matchup.id}
                className="grid gap-3 md:grid-cols-[1fr_16rem] md:items-center"
              >
                <div>
                  <Label
                    htmlFor={`winner-${matchup.id}`}
                    className="font-semibold text-brand-ink"
                  >
                    {matchup.label || `Round of 16 Match ${index + 1}`}
                  </Label>
                  <p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">
                    {matchup.teamOne} vs {matchup.teamTwo}
                  </p>
                </div>
                <Input
                  id={`winner-${matchup.id}`}
                  name={`winner:${matchup.id}`}
                  placeholder="Winning team"
                  required
                />
              </LedgerRow>
            ))}
          </LedgerRows>

          <LedgerRows className="overflow-hidden rounded-lg border">
            {enabledBonusProps.map((prop) => (
              <LedgerRow
                key={prop.id}
                className="grid gap-3 md:grid-cols-[1fr_16rem] md:items-center"
              >
                <div>
                  <Label
                    htmlFor={`bonus-${prop.id}`}
                    className="font-semibold text-brand-ink"
                  >
                    {prop.label}
                  </Label>
                  <p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">
                    {prop.points} points
                  </p>
                </div>
                <Input
                  id={`bonus-${prop.id}`}
                  name={`bonus:${prop.id}`}
                  type={prop.id === "penalty-decisions" ? "number" : "text"}
                  min={0}
                  placeholder="Official answer"
                  required
                />
              </LedgerRow>
            ))}
          </LedgerRows>

          {state.message ? (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {state.message}
            </p>
          ) : null}
          {state.calculatedAt ? (
            <p className="rounded-lg border border-brand-success/20 bg-brand-success/10 px-3 py-2 text-sm font-medium text-brand-success">
              Scoring refreshed {new Date(state.calculatedAt).toLocaleString()}.
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" variant="primaryGreen" disabled={pending}>
              <Calculator />
              {pending ? "Refreshing..." : "Refresh scoring"}
            </Button>
          </div>
        </form>
      </LedgerPanel>

      <LedgerPanel
        title="Leaderboard totals"
        description="Latest stored standings snapshot."
        action={
          rows.length ? (
            <CheckCircle2 className="size-5 text-brand-success" />
          ) : null
        }
      >
        <ScoreboardTable rows={rows} />
      </LedgerPanel>
    </div>
  );
}

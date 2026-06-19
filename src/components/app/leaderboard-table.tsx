"use client";

import { Calculator, ListOrdered } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
import { cn } from "@/lib/utils";
import type { PoolAnalyticsRow } from "@/lib/world-cup-pool/leaderboard";
import type { LeaderboardRow } from "@/lib/world-cup-pool/types";

type LeaderboardTableProps = {
  rows: LeaderboardRow[];
  analyticsRows: PoolAnalyticsRow[];
  poolSlug: string;
  payoutPlaces: number;
  limit?: number;
};

type StandingsView = "current" | "projection";

export function LeaderboardTable({
  rows,
  analyticsRows,
  poolSlug,
  payoutPlaces,
  limit,
}: LeaderboardTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view: StandingsView =
    searchParams.get("standings") === "projection" ? "projection" : "current";
  const visibleRows = limit ? rows.slice(0, limit) : rows;
  const projectionsById = new Map(analyticsRows.map((row) => [row.id, row]));

  function setView(nextView: StandingsView) {
    const params = new URLSearchParams(searchParams);
    if (nextView === "projection") {
      params.set("standings", "projection");
    } else {
      params.delete("standings");
    }

    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}#leaderboard`, {
      scroll: false,
    });
  }

  return (
    <div>
      <div className="flex flex-col gap-3 border-b bg-background/65 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          {view === "projection"
            ? "Projection columns show each entry's remaining ceiling."
            : "Current mode ranks entries by points scored so far."}
        </div>
        <div
          className="inline-flex w-fit rounded-md border bg-surface-paper p-1"
          aria-label="Standings view"
        >
          <Button
            type="button"
            variant={view === "current" ? "secondaryGreen" : "ghost"}
            size="sm"
            aria-pressed={view === "current"}
            onClick={() => setView("current")}
            className="h-8"
          >
            <ListOrdered />
            Current
          </Button>
          <Button
            type="button"
            variant={view === "projection" ? "secondaryGreen" : "ghost"}
            size="sm"
            aria-pressed={view === "projection"}
            onClick={() => setView("projection")}
            className="h-8"
          >
            <Calculator />
            Projection
          </Button>
        </div>
      </div>

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
            {view === "projection" ? (
              <>
                <TableHead>Max</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Best rank</TableHead>
                <TableHead>Top {payoutPlaces}</TableHead>
                <TableHead>Status</TableHead>
              </>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleRows.map((row) => {
            const projection = projectionsById.get(row.id);

            return (
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
                {view === "projection" ? (
                  <>
                    <TableCell className="font-semibold text-brand-ink">
                      {projection?.maxPossible ?? row.score.total}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">
                        {projection?.remaining.total ?? 0}
                      </span>
                      {projection ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          G {projection.remaining.group} / K{" "}
                          {projection.remaining.knockout} / F{" "}
                          {projection.remaining.finals} / B{" "}
                          {projection.remaining.bonus}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>{projection?.ceilingRank ?? row.rank}</TableCell>
                    <TableCell>
                      <Badge
                        variant={projection?.canReachPayout ? "secondary" : "outline"}
                      >
                        {projection?.canReachPayout ? "In reach" : "Out"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={projection?.canWin ? "secondary" : "outline"}
                        className={cn(
                          projection?.canWin
                            ? "border-cta-green/25 bg-cta-green-soft text-brand-ink"
                            : "",
                        )}
                      >
                        {projection?.canWin ? "Alive" : "Eliminated"}
                      </Badge>
                    </TableCell>
                  </>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

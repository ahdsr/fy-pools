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
  const leaderTotal = rows[0]?.score.total ?? 0;
  const payoutCutoff =
    rows[Math.min(payoutPlaces, rows.length) - 1]?.score.total ?? leaderTotal;

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
            ? "Race view shows the current chase for prizes and first place."
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
            {view === "projection" ? (
              <>
                <TableHead>Points</TableHead>
                <TableHead>Top {payoutPlaces}</TableHead>
                <TableHead>1st place</TableHead>
              </>
            ) : (
              <>
                <TableHead>Total</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Knockout</TableHead>
                <TableHead>Finals</TableHead>
                <TableHead>Bonus</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleRows.map((row) => {
            const topFourGap = Math.max(0, payoutCutoff - row.score.total);
            const leaderGap = Math.max(0, leaderTotal - row.score.total);
            const isInPayout = row.score.total >= payoutCutoff;
            const isLeader = leaderGap === 0;

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
                {view === "projection" ? (
                  <>
                    <TableCell className="font-semibold text-brand-ink">
                      {row.score.total}
                    </TableCell>
                    <TableCell>
                      <Badge variant={isInPayout ? "secondary" : "outline"}>
                        {isInPayout ? `Top ${payoutPlaces}` : `${topFourGap} back`}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={isLeader ? "secondary" : "outline"}
                        className={
                          isLeader
                            ? "border-cta-green/25 bg-cta-green-soft text-brand-ink"
                            : ""
                        }
                      >
                        {isLeader ? "Leader" : `${leaderGap} back`}
                      </Badge>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="font-semibold">
                      {row.score.total}
                    </TableCell>
                    <TableCell>{row.score.subtotals.group}</TableCell>
                    <TableCell>{row.score.subtotals.knockout}</TableCell>
                    <TableCell>{row.score.subtotals.finals}</TableCell>
                    <TableCell>{row.score.subtotals.bonus}</TableCell>
                  </>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LeaderboardRow } from "@/lib/world-cup-pool/types";

type LeaderboardTableProps = {
  rows: LeaderboardRow[];
  poolSlug: string;
  limit?: number;
};

export function LeaderboardTable({
  rows,
  poolSlug,
  limit,
}: LeaderboardTableProps) {
  const visibleRows = limit ? rows.slice(0, limit) : rows;

  return (
    <>
      <ol className="divide-y sm:hidden" aria-label="Current standings">
        {visibleRows.map((row) => (
          <li key={row.id} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
            <span className="text-sm font-bold tabular-nums text-brand-ink">{row.rank}</span>
            <Link
              href={`/pools/${poolSlug}/entry/${row.id}`}
              className="min-w-0 font-semibold text-brand-ink hover:text-brand-hot focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
            >
              <span className="block truncate">{row.name}</span>
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                Group {row.score.subtotals.group} · Knockout {row.score.subtotals.knockout}
              </span>
            </Link>
            <div className="text-right">
              <span className="block text-sm font-bold tabular-nums text-brand-ink">{row.score.total}</span>
              <span className="block text-[0.6875rem] font-medium uppercase tracking-normal text-muted-foreground">Total</span>
            </div>
          </li>
        ))}
      </ol>
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-ledger hover:bg-surface-ledger">
              <TableHead>Rank</TableHead>
              <TableHead>Entry</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Knockout</TableHead>
              <TableHead>Finals</TableHead>
              <TableHead>Bonus</TableHead>
              <TableHead>Total</TableHead>
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
                    className="inline-flex items-center font-medium text-brand-ink hover:text-brand-hot"
                  >
                    <span>{row.name}</span>
                  </Link>
                </TableCell>
                <TableCell>{row.score.subtotals.group}</TableCell>
                <TableCell>{row.score.subtotals.knockout}</TableCell>
                <TableCell>{row.score.subtotals.finals}</TableCell>
                <TableCell>{row.score.subtotals.bonus}</TableCell>
                <TableCell className="font-semibold">
                  {row.score.total}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

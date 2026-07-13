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
    <div>
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
  );
}

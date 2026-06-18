import { LedgerPanel } from "@/components/app/ledger";
import { PageShell } from "@/components/app/page-shell";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type LeaderboardPageProps = {
  params: Promise<{ poolSlug: string }>;
};

const rows = [
  { rank: 1, name: "Sample Commissioner", total: 42, status: "Leader" },
  { rank: 2, name: "Sample Player", total: 38, status: "In payout range" },
  { rank: 3, name: "Imported Entry", total: 31, status: "Alive" },
];

export default async function LeaderboardPage({ params }: LeaderboardPageProps) {
  const { poolSlug } = await params;

  return (
    <PageShell
      eyebrow="Pool leaderboard"
      title="Leaderboard"
      description="Readable standings with score totals, payout status, and future audit links."
      backHref={`/pools/${poolSlug}`}
    >
      <LedgerPanel
        title="Current standings"
        description="Table-first hierarchy keeps ranks and totals easy to scan."
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-ledger hover:bg-surface-ledger">
              <TableHead>Rank</TableHead>
              <TableHead>Entry</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.name}>
                <TableCell>{row.rank}</TableCell>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell>{row.total}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{row.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </LedgerPanel>
    </PageShell>
  );
}

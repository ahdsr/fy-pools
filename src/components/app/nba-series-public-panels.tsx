import Link from "next/link";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { Badge } from "@/components/ui/badge";
import type { NbaPublicPool } from "@/lib/nba-series/persistence";
import { getNbaSimulationSeries } from "@/lib/nba-series/persistence";

export function NbaSeriesPublicPanels({ pool }: { pool: NbaPublicPool }) {
  const series = getNbaSimulationSeries(pool.settings);
  const leader = pool.latestStandings[0];
  return <>
    <LedgerPanel><LedgerRows className="grid md:grid-cols-4 md:divide-x md:divide-y-0"><LedgerRow><p className="text-xs font-medium uppercase text-muted-foreground">Entries</p><p className="mt-2 text-3xl font-semibold text-brand-ink">{pool.entries.length}</p></LedgerRow><LedgerRow><p className="text-xs font-medium uppercase text-muted-foreground">Leader</p><p className="mt-2 text-2xl font-semibold text-brand-ink">{leader?.entryName ?? "TBD"}</p><p className="text-sm text-muted-foreground">{leader ? `${leader.total} points` : "Awaiting results"}</p></LedgerRow><LedgerRow><p className="text-xs font-medium uppercase text-muted-foreground">Series complete</p><p className="mt-2 text-3xl font-semibold text-brand-ink">{Object.keys(pool.settings.results).length}/15</p></LedgerRow><LedgerRow><p className="text-xs font-medium uppercase text-muted-foreground">Prize pool</p><p className="mt-2 text-2xl font-semibold text-brand-ink">{pool.settings.scoring.prizePoolLabel || "TBD"}</p></LedgerRow></LedgerRows></LedgerPanel>
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start"><LedgerPanel title="Playoff bracket" description="Commissioner-entered series results advance through the bracket in order."><LedgerRows>{series.map((item) => <LedgerRow key={item.id} className="grid gap-2 sm:grid-cols-[9rem_1fr_auto] sm:items-center"><p className="text-sm font-semibold text-brand-ink">{item.label}</p><p className="text-sm text-muted-foreground">{item.homeTeam && item.awayTeam ? `${item.homeTeam} vs ${item.awayTeam}` : "Awaiting prior series"}</p>{item.result ? <Badge variant="secondary">{item.result.winner} {item.result.winnerWins}–{item.result.loserWins}</Badge> : <Badge variant="outline">Pending</Badge>}</LedgerRow>)}</LedgerRows></LedgerPanel><NbaSeriesLeaderboard pool={pool} /></section>
  </>;
}

export function NbaSeriesLeaderboard({ pool }: { pool: NbaPublicPool }) {
  return <LedgerPanel title="Leaderboard" description="Standings refresh whenever the commissioner simulates a completed series."><LedgerRows>{pool.latestStandings.length ? pool.latestStandings.map((row) => <LedgerRow key={row.entryId} className="flex items-center justify-between gap-4"><div><p className="font-semibold text-brand-ink">{row.rank}. {row.entryName}</p><p className="text-sm text-muted-foreground">Max {row.maxPoints} points</p></div><p className="text-xl font-bold text-brand-ink">{row.total}</p></LedgerRow>) : pool.entries.map((entry) => <LedgerRow key={entry.entryId}><p className="font-semibold text-brand-ink">{entry.entryName}</p><p className="text-sm text-muted-foreground">Submitted bracket awaiting a result.</p></LedgerRow>)}{!pool.entries.length ? <LedgerRow><p className="text-sm text-muted-foreground">No submitted brackets yet.</p></LedgerRow> : null}</LedgerRows><div className="border-t px-5 py-4"><Link href={`/pools/${pool.poolSlug}/leaderboard`} className="text-sm font-semibold text-brand-ink hover:text-brand-hot">View full standings</Link></div></LedgerPanel>;
}

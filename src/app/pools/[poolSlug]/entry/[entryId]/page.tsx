import Link from "next/link";
import { notFound } from "next/navigation";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import {
  ScoreCards,
  TeamPill,
} from "@/components/app/pool-public-widgets";
import { PublicPoolShell } from "@/components/app/public-pool-shell";
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
import { formatDateTime, getPublicPool, MARCINS_POOL_SLUG } from "@/lib/world-cup-pool/data";
import { scorePool } from "@/lib/world-cup-pool/scoring";

type EntryPageProps = {
  params: Promise<{ poolSlug: string; entryId: string }>;
};

export default async function EntryPage({ params }: EntryPageProps) {
  const { poolSlug, entryId } = await params;
  const pool = await getPublicPool(poolSlug);
  if (!pool) notFound();

  const entry = pool.entriesConfig.entries.find((item) => item.id === entryId);
  if (!entry?.picksPath) notFound();

  const picks = pool.picksByPath.get(entry.picksPath);
  if (!picks) notFound();

  const score = scorePool(picks, pool.results);

  return (
    <PublicPoolShell
      poolName={pool.entriesConfig.poolName}
      poolSlug={MARCINS_POOL_SLUG}
      active="entry"
      eyebrow="Entry detail"
      title={entry.name}
      description="A public read-only view of this entry's picks and scoring breakdown."
      meta={
        <div className="rounded-lg border border-white/18 bg-black/30 p-4 backdrop-blur-md">
          <p className="text-sm font-medium uppercase tracking-normal text-white/62">
            Updated
          </p>
          <p className="mt-2 text-xl font-semibold leading-tight text-white">
            {formatDateTime(pool.results.meta?.lastUpdated)}
          </p>
        </div>
      }
    >
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="secondaryGreen">
          <Link href={`/pools/${MARCINS_POOL_SLUG}/leaderboard`}>
            Back to leaderboard
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/pools/${MARCINS_POOL_SLUG}/projections`}>
            View projections
          </Link>
        </Button>
      </div>

      <ScoreCards score={score} />

      <section className="grid gap-5 lg:grid-cols-[1fr_24rem]">
        <LedgerPanel
          title="Group picks"
          description="Predicted order is compared against the current live order."
        >
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(picks.groups).map(([groupId, group]) => {
              const groupScore = score.groups.find((item) => item.groupId === groupId);
              const currentOrder = pool.results.groups?.[groupId]?.currentOrder ?? [];

              return (
                <div key={groupId} className="rounded-lg border bg-background">
                  <div className="flex items-center justify-between gap-3 border-b bg-surface-ledger px-4 py-3">
                    <h2 className="font-semibold text-brand-ink">Group {groupId}</h2>
                    <Badge variant={groupScore?.points ? "secondary" : "outline"}>
                      {groupScore?.points ?? 0} pts
                    </Badge>
                  </div>
                  <div className="grid gap-4 p-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                        Pick
                      </p>
                      <ol className="space-y-2">
                        {group.predictedOrder.map((team) => (
                          <li key={team}>
                            <TeamPill team={team} picks={picks} />
                          </li>
                        ))}
                      </ol>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                        Current
                      </p>
                      {currentOrder.length ? (
                        <ol className="space-y-2">
                          {currentOrder.map((team) => (
                            <li key={team}>
                              <TeamPill team={team} picks={picks} />
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="text-sm text-muted-foreground">Not started</p>
                      )}
                    </div>
                  </div>
                  <div className="border-t px-4 py-3 text-sm text-muted-foreground">
                    Advancer hits:{" "}
                    <span className="font-semibold text-brand-ink">
                      {groupScore?.advancementHits.length ?? 0}/
                      {group.predictedAdvancers.length}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </LedgerPanel>

        <LedgerPanel title="Podium and bonus">
          <LedgerRows>
            {score.finals.map((item) => (
              <LedgerRow key={item.label}>
                <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
                  {item.label}
                </p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <TeamPill team={item.predicted} picks={picks} />
                  <Badge variant={item.hit ? "secondary" : "outline"}>
                    {item.points} pts
                  </Badge>
                </div>
              </LedgerRow>
            ))}
            {score.bonus.map((item) => (
              <LedgerRow key={item.id}>
                <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
                  {item.label}
                </p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <TeamPill team={item.pick} picks={picks} />
                  <Badge variant={item.hit ? "secondary" : "outline"}>
                    {item.points} pts
                  </Badge>
                </div>
              </LedgerRow>
            ))}
          </LedgerRows>
        </LedgerPanel>
      </section>

      <LedgerPanel title="Knockout scoring">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-ledger hover:bg-surface-ledger">
              <TableHead>Stage</TableHead>
              <TableHead>Hits</TableHead>
              <TableHead>Per hit</TableHead>
              <TableHead>Points</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {score.knockout.map((stage) => (
              <TableRow key={stage.stageKey}>
                <TableCell className="font-medium text-brand-ink">
                  {stage.label}
                </TableCell>
                <TableCell>
                  {stage.hits.length ? (
                    <div className="flex flex-wrap gap-2">
                      {stage.hits.map((team) => (
                        <TeamPill key={team} team={team} picks={picks} />
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No hits yet</span>
                  )}
                </TableCell>
                <TableCell>{stage.perTeam}</TableCell>
                <TableCell className="font-semibold">{stage.points}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </LedgerPanel>
    </PublicPoolShell>
  );
}

import { notFound } from "next/navigation";

import { PageShell } from "@/components/app/page-shell";
import { Badge } from "@/components/ui/badge";
import { getCommissionerRoundOf16ScoringPool } from "@/lib/round-of-16/persistence";
import { RoundOf16ScoringForm } from "./round-of-16-scoring-form";

type ScoringPageProps = {
  params: Promise<{ poolId: string }>;
};

export const dynamic = "force-dynamic";

export default async function ScoringPage({ params }: ScoringPageProps) {
  const { poolId } = await params;
  const pool = await getCommissionerRoundOf16ScoringPool(poolId);

  if (!pool) notFound();

  return (
    <PageShell
      eyebrow="Scoring"
      title={pool.poolName}
      description="Score Round of 16 winner picks and enabled bonus props from one commissioner ledger."
      showHeader={false}
      heroAction={
        <Badge variant="outline">{pool.submittedEntries} submitted entries</Badge>
      }
    >
      <RoundOf16ScoringForm
        poolId={pool.poolId}
        settings={pool.settings}
        initialRows={pool.latestStandings}
      />
    </PageShell>
  );
}

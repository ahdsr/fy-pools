import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DashboardRouteSkeleton } from "@/components/app/dashboard-route-skeleton";
import { getCommissionerRoundOf16AdminPool } from "@/lib/round-of-16/persistence";
import { getCommissionerNbaSeriesPool } from "@/lib/nba-series/persistence";
import { getCommissionerRankedFinishPool } from "@/lib/ranked-finish/persistence";
import { getPoolRuntimeTargetById } from "@/lib/templates/runtime-dispatch";
import { createRoundOf16WizardStateFromSettings } from "@/lib/templates/round-of-16-draft";
import { NewPoolWizardStart } from "../../new/new-pool-wizard-start";
import { NbaSeriesCommissioner } from "./nba-series-commissioner";
import { RankedFinishCommissioner } from "./ranked-finish-commissioner";
import { recordRankedFinishResultAction, resetRankedFinishResultsAction, updateRankedFinishPoolDetailsAction } from "./ranked-finish-actions";
import { updateNbaSeriesPoolDetailsAction } from "./nba-actions";
import { PageShell } from "@/components/app/page-shell";
import { DoubleDownCommissionerPanel } from "@/components/app/double-down-commissioner-panel";
import { PoolDetailsEditor } from "@/components/app/pool-details-editor";

type EditPoolPageProps = {
  params: Promise<{ poolId: string }>;
};

export const unstable_instant = {
  prefetch: "runtime",
  samples: [{ params: { poolId: "instant-navigation-sample" } }],
};

export default async function EditPoolPage({ params }: EditPoolPageProps) {
  return (
    <Suspense
      fallback={
        <DashboardRouteSkeleton
          title="Edit pool"
          description="Loading your pool settings and invite plan."
        />
      }
    >
      <EditPoolWizard params={params} />
    </Suspense>
  );
}

async function EditPoolWizard({ params }: EditPoolPageProps) {
  const { poolId } = await params;
  const target = await getPoolRuntimeTargetById(poolId);
  if (target?.runtime === "nba-series") {
    const nbaPool = await getCommissionerNbaSeriesPool(poolId);
    if (nbaPool) return <PageShell eyebrow="NBA Playoffs" title={nbaPool.poolName} description="Edit pool details, then manage your bracket simulation and scoring." showHeader={false}><DoubleDownCommissionerPanel poolId={nbaPool.poolId} /><div className="grid gap-5"><PoolDetailsEditor poolId={nbaPool.poolId} basics={nbaPool.settings.basics} updateAction={updateNbaSeriesPoolDetailsAction} /><NbaSeriesCommissioner poolId={nbaPool.poolId} poolName={nbaPool.poolName} settings={nbaPool.settings} /></div></PageShell>;
  }
  if (target?.runtime === "ranked-finish") {
    const rankedPool = await getCommissionerRankedFinishPool(poolId, target.templateSlug);
    if (rankedPool) return <PageShell eyebrow={target.templateName} title={rankedPool.poolName} description={`Edit pool details or record ${target.competitorNoun} finishing positions.`} showHeader={false}><DoubleDownCommissionerPanel poolId={rankedPool.poolId} /><div className="grid gap-5"><PoolDetailsEditor poolId={rankedPool.poolId} basics={rankedPool.settings.basics} updateAction={updateRankedFinishPoolDetailsAction.bind(null, target.templateSlug)} /><RankedFinishCommissioner poolId={rankedPool.poolId} poolName={rankedPool.poolName} settings={rankedPool.settings} participantNoun={target.competitorNoun} recordAction={recordRankedFinishResultAction.bind(null, target.templateSlug)} resetAction={resetRankedFinishResultsAction.bind(null, target.templateSlug)} /></div></PageShell>;
  }

  const pool = await getCommissionerRoundOf16AdminPool(poolId);

  if (!pool) notFound();

  return (
    <>
      <DoubleDownCommissionerPanel poolId={pool.poolId} />
      <NewPoolWizardStart
      editPool={{
        poolId: pool.poolId,
        poolSlug: pool.poolSlug,
        status: pool.status,
        initialState: createRoundOf16WizardStateFromSettings(
          pool.settings,
          pool.directInvites,
        ),
      }}
      />
    </>
  );
}

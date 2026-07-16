import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DashboardRouteSkeleton } from "@/components/app/dashboard-route-skeleton";
import { getCommissionerRoundOf16AdminPool } from "@/lib/round-of-16/persistence";
import { getCommissionerNbaSeriesPool } from "@/lib/nba-series/persistence";
import { getCommissionerF1Pool } from "@/lib/ranked-finish/persistence";
import { createRoundOf16WizardStateFromSettings } from "@/lib/templates/round-of-16-draft";
import { NewPoolWizardStart } from "../../new/new-pool-wizard-start";
import { NbaSeriesCommissioner } from "./nba-series-commissioner";
import { F1Commissioner } from "./f1-commissioner";
import { PageShell } from "@/components/app/page-shell";

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
  const pool = await getCommissionerRoundOf16AdminPool(poolId);

  if (!pool) {
    const nbaPool = await getCommissionerNbaSeriesPool(poolId);
    if (nbaPool) return <PageShell eyebrow="NBA Playoffs" title={nbaPool.poolName} description="Manage your bracket simulation and scoring from this commissioner workspace." showHeader={false}><NbaSeriesCommissioner poolId={nbaPool.poolId} poolName={nbaPool.poolName} settings={nbaPool.settings} /></PageShell>;
    const f1Pool = await getCommissionerF1Pool(poolId);
    if (f1Pool) return <PageShell eyebrow="F1 race weekend" title={f1Pool.poolName} description="Record qualifying and race positions, then watch standings update." showHeader={false}><F1Commissioner poolId={f1Pool.poolId} poolName={f1Pool.poolName} settings={f1Pool.settings} /></PageShell>;
  }

  if (!pool) notFound();

  return (
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
  );
}

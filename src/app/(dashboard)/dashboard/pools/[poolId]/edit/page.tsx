import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DashboardRouteSkeleton } from "@/components/app/dashboard-route-skeleton";
import { getCommissionerRoundOf16AdminPool } from "@/lib/round-of-16/persistence";
import { createRoundOf16WizardStateFromSettings } from "@/lib/templates/round-of-16-draft";
import { NewPoolWizardStart } from "../../new/new-pool-wizard-start";

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

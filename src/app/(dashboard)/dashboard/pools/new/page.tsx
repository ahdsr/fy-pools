import { Suspense } from "react";

import { DashboardRouteSkeleton } from "@/components/app/dashboard-route-skeleton";
import { getNbaPlayoffCatalogSnapshots } from "@/lib/events/catalog";
import { getF1EventCatalogSnapshots, selectUpcomingCatalogEvents } from "@/lib/events/catalog";
import { NewPoolWizardStart } from "./new-pool-wizard-start";

export const unstable_instant = {
  prefetch: "runtime",
  samples: [{ searchParams: { template: null, draft: null } }],
};

export default async function NewPoolPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const { template } = await searchParams;
  const nbaCatalogEvents = template === "nba-series-bracket"
    ? await getNbaPlayoffCatalogSnapshots().catch(() => [])
    : [];
  const f1CatalogEvents = template === "f1-grand-prix-predictor"
    ? selectUpcomingCatalogEvents(await getF1EventCatalogSnapshots())
    : [];
  return (
    <Suspense
      fallback={
        <DashboardRouteSkeleton
          title="New pool"
          description="Set up your pool format, scoring, and invite plan."
        />
      }
    >
      <NewPoolWizardStart initialNbaCatalogEvents={nbaCatalogEvents} initialF1CatalogEvents={f1CatalogEvents} />
    </Suspense>
  );
}

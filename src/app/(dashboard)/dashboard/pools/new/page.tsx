import { Suspense } from "react";

import { DashboardRouteSkeleton } from "@/components/app/dashboard-route-skeleton";
import { getNbaPlayoffCatalogSnapshots } from "@/lib/events/catalog";
import { getRankedFinishCatalogEvents } from "@/lib/ranked-finish/catalog";
import { getRankedFinishTemplate } from "@/lib/ranked-finish/templates";
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
  const rankedFinishCatalogEvents = getRankedFinishTemplate(template ?? "")
    ? await getRankedFinishCatalogEvents(template!).catch(() => [])
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
      <NewPoolWizardStart initialNbaCatalogEvents={nbaCatalogEvents} initialRankedFinishCatalogEvents={rankedFinishCatalogEvents} />
    </Suspense>
  );
}

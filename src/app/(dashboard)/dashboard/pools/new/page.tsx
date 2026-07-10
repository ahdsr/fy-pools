import { Suspense } from "react";

import { DashboardRouteSkeleton } from "@/components/app/dashboard-route-skeleton";
import { NewPoolWizardStart } from "./new-pool-wizard-start";

export const unstable_instant = {
  prefetch: "runtime",
  samples: [{ searchParams: { template: null, draft: null } }],
};

export default function NewPoolPage() {
  return (
    <Suspense
      fallback={
        <DashboardRouteSkeleton
          title="New pool"
          description="Set up your pool format, scoring, and invite plan."
        />
      }
    >
      <NewPoolWizardStart />
    </Suspense>
  );
}

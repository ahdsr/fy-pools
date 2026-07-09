import { Suspense } from "react";

import { DashboardLoadingScreen } from "@/components/app/dashboard-loading-screen";
import { NewPoolWizardStart } from "./new-pool-wizard-start";

export default function NewPoolPage() {
  return (
    <Suspense fallback={<DashboardLoadingScreen />}>
      <NewPoolWizardStart />
    </Suspense>
  );
}

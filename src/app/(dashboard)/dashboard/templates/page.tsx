import { Suspense } from "react";

import { DashboardLoadingScreen } from "@/components/app/dashboard-loading-screen";
import { TemplateLibrary } from "./template-library";

export default function DashboardTemplatesPage() {
  return (
    <Suspense fallback={<DashboardLoadingScreen />}>
      <TemplateLibrary />
    </Suspense>
  );
}

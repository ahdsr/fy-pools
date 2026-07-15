import { Suspense } from "react";

import { DashboardRouteSkeleton } from "@/components/app/dashboard-route-skeleton";
import { TemplateLibrary } from "./template-library";

export const unstable_instant = {
  prefetch: "runtime",
  samples: [{ searchParams: { category: null } }],
};

export default function DashboardTemplatesPage() {
  return (
    <Suspense
      fallback={
        <DashboardRouteSkeleton
          title="Templates"
          description="Browse every template category so commissioners start from a clear format, not blank setup."
        />
      }
    >
      <TemplateLibrary audience="workspace" />
    </Suspense>
  );
}

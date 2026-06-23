import { Suspense } from "react";

import { TemplateLibrary } from "./template-library";

export default function DashboardTemplatesPage() {
  return (
    <Suspense>
      <TemplateLibrary />
    </Suspense>
  );
}

import { Suspense } from "react";

import { NewPoolWizardStart } from "./new-pool-wizard-start";

export default function NewPoolPage() {
  return (
    <Suspense>
      <NewPoolWizardStart />
    </Suspense>
  );
}

import { LedgerPanel } from "@/components/app/ledger";
import { PageShell } from "@/components/app/page-shell";

type DashboardRouteSkeletonProps = {
  title: string;
  description: string;
};

export function DashboardRouteSkeleton({
  title,
  description,
}: DashboardRouteSkeletonProps) {
  return (
    <PageShell title={title} description={description} showHeader={false}>
      <LedgerPanel title="Loading content" description="Preparing this workspace.">
        <div className="grid gap-3 p-5" aria-busy="true" aria-live="polite">
          <div className="h-10 animate-pulse rounded-md bg-muted/80" />
          <div className="h-24 animate-pulse rounded-md bg-muted/80" />
          <div className="h-24 animate-pulse rounded-md bg-muted/80" />
        </div>
      </LedgerPanel>
    </PageShell>
  );
}

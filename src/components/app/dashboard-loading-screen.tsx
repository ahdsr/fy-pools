import { RouteLoadingScreen } from "@/components/app/route-loading-screen";

export function DashboardLoadingScreen() {
  return (
    <RouteLoadingScreen
      eyebrow="Pool admin"
      title="Workspace"
      description="A simple operating ledger for pool setup, entries, locks, and scoring."
    />
  );
}

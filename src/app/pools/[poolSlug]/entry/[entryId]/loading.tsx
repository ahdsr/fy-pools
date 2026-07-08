import { RouteLoadingScreen } from "@/components/app/route-loading-screen";

export default function Loading() {
  return (
    <RouteLoadingScreen
      eyebrow="Entry detail"
      title="Preparing page"
      description="Preparing score details, picks, and movement paths."
    />
  );
}

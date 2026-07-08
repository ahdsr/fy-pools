import { RouteLoadingScreen } from "@/components/app/route-loading-screen";

export default function Loading() {
  return (
    <RouteLoadingScreen
      eyebrow="Public pool"
      title="Public pool"
      description="Pulling standings, picks, and pool details."
    />
  );
}

import { RouteLoadingScreen } from "@/components/app/route-loading-screen";

export default function Loading() {
  return (
    <RouteLoadingScreen
      eyebrow="Account"
      title="Choose a new password"
      description="Set a new password for your PoolWaffle account."
    />
  );
}

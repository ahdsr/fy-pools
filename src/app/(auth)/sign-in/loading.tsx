import { RouteLoadingScreen } from "@/components/app/route-loading-screen";

export default function Loading() {
  return (
    <RouteLoadingScreen
      eyebrow="Account"
      title="Sign in to PoolWaffle"
      description="Use your email and password to manage pools or submit invited picks."
    />
  );
}

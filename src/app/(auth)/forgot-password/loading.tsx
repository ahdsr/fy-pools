import { RouteLoadingScreen } from "@/components/app/route-loading-screen";

export default function Loading() {
  return (
    <RouteLoadingScreen
      eyebrow="Account"
      title="Reset your password"
      description="Enter your account email and we will send a reset link."
    />
  );
}

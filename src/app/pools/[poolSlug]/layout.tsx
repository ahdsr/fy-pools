import type { Metadata } from "next";

import { PublicPoolRouteHeader } from "@/components/app/mock-auth";
import { PUBLIC_POOL_SLUGS } from "@/lib/world-cup-pool/data";

export const metadata: Metadata = {
  title: {
    default: "Pool overview",
    template: "%s | PoolWaffle",
  },
  description:
    "View public pool standings, rules, brackets, projections, and entry score details.",
};

export function generateStaticParams() {
  return PUBLIC_POOL_SLUGS.map((poolSlug) => ({ poolSlug }));
}

export default function PublicPoolLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <PublicPoolRouteHeader />
      {children}
    </>
  );
}

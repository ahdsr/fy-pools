import type { Metadata } from "next";
import { Suspense } from "react";

import { PublicPoolRouteHeader } from "@/components/app/mock-auth";
import type { PublicPoolNavVariant } from "@/components/app/mock-auth";
import { getPoolRuntimeTargetBySlug } from "@/lib/templates/runtime-dispatch";
import { PUBLIC_POOL_SLUGS } from "@/lib/world-cup-pool/data";

const publicWorldCupPoolSlugs = new Set<string>(PUBLIC_POOL_SLUGS);

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
  params,
}: Readonly<{
  params: Promise<{ poolSlug: string }>;
  children: React.ReactNode;
}>) {
  return (
    <>
      <Suspense fallback={<PublicPoolRouteHeader poolSlug="" />}>
        <PublicPoolNavigation params={params} />
      </Suspense>
      {children}
    </>
  );
}

async function PublicPoolNavigation({
  params,
}: {
  params: Promise<{ poolSlug: string }>;
}) {
  const { poolSlug } = await params;
  if (publicWorldCupPoolSlugs.has(poolSlug)) {
    return <PublicPoolRouteHeader poolSlug={poolSlug} variant="world-cup" />;
  }

  const target = await getPoolRuntimeTargetBySlug(poolSlug);
  const variant: PublicPoolNavVariant = target?.runtime ?? "unknown";
  return <PublicPoolRouteHeader poolSlug={poolSlug} variant={variant} />;
}

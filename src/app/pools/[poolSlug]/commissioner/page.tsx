import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { PublicPoolShell } from "@/components/app/public-pool-shell";
import { Button } from "@/components/ui/button";
import {
  getPublicPool,
  liveScoreMatchDates,
  scoreRefreshLabel,
  scoreRefreshSourceLabel,
} from "@/lib/world-cup-pool/data";

export const metadata: Metadata = {
  title: "Commissioner controls",
  description: "Sign in to manage private pool settings, entries, and scoring.",
  robots: {
    index: false,
    follow: false,
  },
};

type CommissionerPageProps = {
  params: Promise<{ poolSlug: string }>;
};

export default async function CommissionerPage({
  params,
}: CommissionerPageProps) {
  const { poolSlug } = await params;
  const pool = await getPublicPool(poolSlug);
  if (!pool) notFound();

  return (
    <PublicPoolShell
      poolName={pool.entriesConfig.poolName}
      eyebrow="Commissioner area"
      title="Commissioner tools require sign-in"
      description="Admin controls, imports, lock rules, and result overrides are available in the signed-in dashboard, not on this public pool page."
      scoreRefreshLabel={scoreRefreshLabel(pool)}
      scoreRefreshSource={scoreRefreshSourceLabel(pool)}
      liveScoreMatchDates={liveScoreMatchDates(pool)}
    >
      <LedgerPanel title="Private controls">
        <LedgerRows className="grid md:grid-cols-[1fr_auto] md:items-center md:divide-x md:divide-y-0">
          <LedgerRow className="flex gap-4">
            <ShieldCheck className="mt-1 size-5 shrink-0 text-brand-mark" />
            <div>
              <p className="font-semibold text-brand-ink">
                Public viewers cannot administer this pool
              </p>
              <p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">
                Public pool pages are for entrants and viewers. Use the
                dashboard to manage this pool and its participants.
              </p>
            </div>
          </LedgerRow>
          <LedgerRow className="flex flex-wrap gap-3">
            <Button asChild variant="primaryGreen">
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/pools/${poolSlug}`}>Back to pool overview</Link>
            </Button>
          </LedgerRow>
        </LedgerRows>
      </LedgerPanel>
    </PublicPoolShell>
  );
}

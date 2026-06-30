import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { PublicPoolShell } from "@/components/app/public-pool-shell";
import { Button } from "@/components/ui/button";
import {
  formatDateTime,
  getPublicPool,
  MARCINS_POOL_SLUG,
} from "@/lib/world-cup-pool/data";

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
      description="Admin controls, imports, lock rules, and result overrides live in the signed-in dashboard rather than on Marcin's public share page."
      scoreRefreshLabel={formatDateTime(pool.results.meta?.lastUpdated)}
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
                The public route is designed for friends and entrants. Marcin&apos;s
                commissioner workflow should stay in the dashboard mock until
                auth and role checks are wired.
              </p>
            </div>
          </LedgerRow>
          <LedgerRow className="flex flex-wrap gap-3">
            <Button asChild variant="primaryGreen">
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/pools/${MARCINS_POOL_SLUG}`}>Back to pool</Link>
            </Button>
          </LedgerRow>
        </LedgerRows>
      </LedgerPanel>
    </PublicPoolShell>
  );
}

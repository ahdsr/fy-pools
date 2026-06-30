import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { notFound } from "next/navigation";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { PublicPoolShell } from "@/components/app/public-pool-shell";
import { Button } from "@/components/ui/button";
import {
  formatDateTime,
  getPublicPool,
  MARCINS_POOL_SLUG,
} from "@/lib/world-cup-pool/data";

type MakePicksPageProps = {
  params: Promise<{ poolSlug: string }>;
};

export default async function MakePicksPage({ params }: MakePicksPageProps) {
  const { poolSlug } = await params;
  const pool = await getPublicPool(poolSlug);
  if (!pool) notFound();

  return (
    <PublicPoolShell
      poolName={pool.entriesConfig.poolName}
      eyebrow="Player entry"
      title="Sign in to make picks"
      description="Marcin's public pool page is read-only for friends. Pick entry belongs behind the player sign-in flow so drafts, locks, and private picks stay controlled."
      scoreRefreshLabel={formatDateTime(pool.results.meta?.lastUpdated)}
    >
      <LedgerPanel title="Player access">
        <LedgerRows className="grid md:grid-cols-[1fr_auto] md:items-center md:divide-x md:divide-y-0">
          <LedgerRow className="flex gap-4">
            <LockKeyhole className="mt-1 size-5 shrink-0 text-brand-mark" />
            <div>
              <p className="font-semibold text-brand-ink">
                Pick entry is not public
              </p>
              <p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">
                Players should sign in before creating or editing an entry. The
                shared page remains safe to send around because it only exposes
                standings, projections, and read-only score details.
              </p>
            </div>
          </LedgerRow>
          <LedgerRow className="flex flex-wrap gap-3">
            <Button asChild variant="primaryGreen">
              <Link href="/sign-in">Sign in</Link>
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

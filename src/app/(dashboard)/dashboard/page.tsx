import Link from "next/link";
import { ArrowRight, ClipboardList, FileSpreadsheet } from "lucide-react";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { PageShell } from "@/components/app/page-shell";
import { PlaceholderGrid } from "@/components/app/placeholder-grid";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <PageShell
      eyebrow="Commissioner workspace"
      title="Dashboard"
      description="A simple operating ledger for pool setup, entries, locks, and scoring."
      backHref="/"
    >
      <LedgerPanel
        title="Workspace"
        description="Two starting points define the MVP: pool operations and spreadsheet import."
      >
        <LedgerRows className="grid md:grid-cols-2 md:divide-x md:divide-y-0">
          <LedgerRow className="space-y-5">
            <ClipboardList className="size-5 text-brand-mark" />
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-[0.005em] text-brand-ink">
                Pool operations
              </h2>
              <p className="text-sm font-normal leading-6 text-muted-foreground">
                Create pools, invite players, track entries, and review lock
                status from one workspace.
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard/pools">
                Open pools <ArrowRight />
              </Link>
            </Button>
          </LedgerRow>
          <LedgerRow className="space-y-5">
            <FileSpreadsheet className="size-5 text-brand-mark" />
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-[0.005em] text-brand-ink">
                Spreadsheet import
              </h2>
              <p className="text-sm font-normal leading-6 text-muted-foreground">
                Bring an Excel pool you already use and turn it into hosted
                picks, brackets, scoring, and standings.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/upload-your-own">
                Upload your own <ArrowRight />
              </Link>
            </Button>
          </LedgerRow>
        </LedgerRows>
      </LedgerPanel>
      <PlaceholderGrid
        items={[
          {
            title: "Recent activity",
            body: "Audit events will show imports, lock changes, scoring refreshes, and commissioner actions.",
          },
          {
            title: "Result sync",
            body: "Cloudflare jobs can update results once the result provider contract is defined.",
          },
          {
            title: "Subscription",
            body: "Pool hosting subscriptions belong to commissioners, not players.",
          },
        ]}
      />
    </PageShell>
  );
}

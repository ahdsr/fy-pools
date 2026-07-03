import Link from "next/link";
import {
  ArrowRight,
  Bell,
  ClipboardList,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  MoreHorizontal,
  Pencil,
  Settings,
  Trash2,
} from "lucide-react";

import {
  LedgerFeatureRows,
  LedgerPanel,
  LedgerRow,
  LedgerRows,
} from "@/components/app/ledger";
import { PageShell } from "@/components/app/page-shell";
import { PlaceholderGrid } from "@/components/app/placeholder-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCommissionerNotifications } from "@/lib/round-of-16/persistence";

const marcinPool = {
  name: "Marcin's 2026 World Cup Pool",
  slug: "marcins-2026-world-cup-pool",
  template: "World Cup Full Predictor",
  entries: "30 entries",
  status: "Public page live",
  lock: "Locks Jun 11, 2026",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const publicPoolHref = `/pools/${marcinPool.slug}`;
  const commissionerHref = `/pools/${marcinPool.slug}/commissioner`;
  const notifications = await getCommissionerNotifications();

  return (
    <PageShell
      eyebrow="Pool admin"
      title="Workspace"
      description="A simple operating ledger for pool setup, entries, locks, and scoring."
      backHref="/"
      showHeader={false}
      heroAction={
        <Button asChild variant="primaryGreen" size="lg">
          <Link href="/dashboard/pools/new">
            New pool <ArrowRight />
          </Link>
        </Button>
      }
    >
      <LedgerPanel
        title="Current pools"
        description="Mock admin controls for the pools this account manages."
      >
        <LedgerRows>
          <LedgerRow className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{marcinPool.status}</Badge>
                <Badge variant="outline">{marcinPool.entries}</Badge>
                <Badge variant="outline">{marcinPool.lock}</Badge>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-[0.005em] text-brand-ink">
                  {marcinPool.name}
                </h2>
                <p className="text-sm font-normal leading-6 text-muted-foreground">
                  {marcinPool.template} with public pool hub, leaderboard,
                  pick entry, and commissioner controls ready for wiring.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Button asChild variant="secondaryGreen">
                <Link href={publicPoolHref}>
                  Live site <ExternalLink />
                </Link>
              </Button>
              <Button asChild>
                <Link href={commissionerHref}>
                  Edit pool <Settings />
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Pool actions">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Mock actions</DropdownMenuLabel>
                  <DropdownMenuItem>
                    <Pencil />
                    Rename pool
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={commissionerHref}>
                      <Settings />
                      Edit settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Copy />
                    Duplicate pool
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive">
                    <Trash2 />
                    Delete pool
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </LedgerRow>
        </LedgerRows>
      </LedgerPanel>

      <LedgerPanel
        title="Commissioner inbox"
        description="Participant submissions appear here as soon as picks are stored."
        action={<Badge variant="outline">{notifications.length} recent</Badge>}
      >
        {notifications.length ? (
          <LedgerRows>
            {notifications.map((notification) => (
              <LedgerRow
                key={notification.id}
                className="grid gap-3 md:grid-cols-[auto_1fr_auto] md:items-center"
              >
                <span className="grid size-9 place-items-center rounded-full border bg-background text-brand-mark">
                  <Bell className="size-4" />
                </span>
                <div>
                  <p className="font-semibold text-brand-ink">
                    {notification.title}
                  </p>
                  <p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">
                    {notification.body}
                  </p>
                </div>
                <Badge variant="outline">
                  {new Date(notification.createdAt).toLocaleString()}
                </Badge>
              </LedgerRow>
            ))}
          </LedgerRows>
        ) : (
          <LedgerRow className="flex items-start gap-3">
            <Bell className="mt-1 size-5 shrink-0 text-brand-mark" />
            <p className="text-sm font-normal leading-6 text-muted-foreground">
              No submitted picks yet. Once participants submit from their join
              links, the latest activity will show here.
            </p>
          </LedgerRow>
        )}
      </LedgerPanel>

      <LedgerPanel
        title="Workspace"
        description="Two starting points define the MVP: pool operations and spreadsheet import."
      >
        <LedgerFeatureRows
          items={[
            {
              icon: ClipboardList,
              title: "Pool operations",
              body: "Create pools, invite players, track entries, and review lock status from one workspace.",
              action: (
                <Button asChild>
                  <Link href="/dashboard/pools">
                    Open pools <ArrowRight />
                  </Link>
                </Button>
              ),
            },
            {
              icon: FileSpreadsheet,
              title: "Spreadsheet import",
              body: "Bring an Excel pool you already use and turn it into hosted picks, brackets, scoring, and standings.",
              action: (
                <Button asChild variant="outline">
                  <Link href="/upload-your-own">
                    Upload your own <ArrowRight />
                  </Link>
                </Button>
              ),
            },
          ]}
        />
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

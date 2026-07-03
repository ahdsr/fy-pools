import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarClock,
  ClipboardList,
  ExternalLink,
  FileSpreadsheet,
  ListChecks,
  Settings,
  Trophy,
  Users,
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
  getCommissionerNotifications,
  getCommissionerPoolSummaries,
  type CommissionerPoolSummary,
} from "@/lib/round-of-16/persistence";

export const dynamic = "force-dynamic";

function formatDateTime(value: string) {
  if (!value) return "Not set";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString();
}

function PoolSummaryRow({ pool }: { pool: CommissionerPoolSummary }) {
  const submittedEntries = pool.entryCounts.submitted + pool.entryCounts.locked;

  return (
    <LedgerRow className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{pool.status}</Badge>
          <Badge variant="outline">{pool.deadlineStatus}</Badge>
          <Badge variant="outline">
            {submittedEntries}/{pool.inviteCounts.total} submitted
          </Badge>
          <Badge variant="outline">{pool.inviteCounts.pending} pending</Badge>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-[0.005em] text-brand-ink">
            {pool.poolName}
          </h2>
          <p className="text-sm font-normal leading-6 text-muted-foreground">
            {pool.templateName}. Picks lock {formatDateTime(pool.pickDeadline)}.
            Latest standings{" "}
            {pool.latestStandingsAt
              ? `refreshed ${formatDateTime(pool.latestStandingsAt)}`
              : "have not been scored yet"}
            .
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-background px-3 py-2">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">
              <Users className="size-3.5" />
              Invites
            </div>
            <p className="mt-1 text-sm font-semibold text-brand-ink">
              {pool.inviteCounts.accepted} accepted, {pool.inviteCounts.pending} pending
            </p>
          </div>
          <div className="rounded-lg border bg-background px-3 py-2">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">
              <ListChecks className="size-3.5" />
              Entries
            </div>
            <p className="mt-1 text-sm font-semibold text-brand-ink">
              {submittedEntries} submitted, {pool.entryCounts.missing} missing
            </p>
          </div>
          <div className="rounded-lg border bg-background px-3 py-2">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">
              <CalendarClock className="size-3.5" />
              Deadline
            </div>
            <p className="mt-1 text-sm font-semibold text-brand-ink">
              {formatDateTime(pool.pickDeadline)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
        <Button asChild variant="secondaryGreen">
          <Link href={`/pools/${pool.poolSlug}`}>
            Public page <ExternalLink />
          </Link>
        </Button>
        <Button asChild>
          <Link href={`/dashboard/pools/${pool.poolId}/scoring`}>
            Scoring <Trophy />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/pools">
            Details <Settings />
          </Link>
        </Button>
      </div>
    </LedgerRow>
  );
}

export default async function DashboardPage() {
  const [pools, notifications] = await Promise.all([
    getCommissionerPoolSummaries(),
    getCommissionerNotifications(),
  ]);

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
        description="Pools owned by this commissioner, including invite status, submissions, deadlines, and scoring state."
        action={<Badge variant="outline">{pools.length} active</Badge>}
      >
        {pools.length ? (
          <LedgerRows>
            {pools.map((pool) => (
              <PoolSummaryRow key={pool.poolId} pool={pool} />
            ))}
          </LedgerRows>
        ) : (
          <LedgerRow className="flex items-start gap-3">
            <ClipboardList className="mt-1 size-5 shrink-0 text-brand-mark" />
            <div>
              <p className="font-semibold text-brand-ink">No pools yet</p>
              <p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">
                Create a Round of 16 pool to start inviting participants and
                tracking submissions.
              </p>
              <Button asChild className="mt-4" variant="primaryGreen">
                <Link href="/dashboard/pools/new">
                  New pool <ArrowRight />
                </Link>
              </Button>
            </div>
          </LedgerRow>
        )}
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

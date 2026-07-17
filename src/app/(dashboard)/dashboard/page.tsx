import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  ArrowRight,
  Bell,
  CalendarClock,
  ClipboardList,
  Edit,
  FileSpreadsheet,
  History,
  Info,
  ListChecks,
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
  getCommissionerAuditEvents,
  getCommissionerNotifications,
  getCommissionerPoolSummaries,
  type CommissionerAuditEvent,
  type CommissionerPoolSummary,
} from "@/lib/round-of-16/persistence";
import { formatDateTime } from "@/lib/date-time";
import { DraftPoolRows } from "./draft-pool-rows";
import { DeletePoolButton } from "./pools/delete-pool-button";
import { ShareLinkButton } from "./share-link-button";

export const unstable_instant = { prefetch: "runtime", samples: [{}] };

function formatAuditEventType(value: string) {
  return value
    .split(".")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function isPastPool(pool: CommissionerPoolSummary) {
  return ["locked", "completed", "archived"].includes(
    pool.status.toLowerCase(),
  );
}

function isActivePool(pool: CommissionerPoolSummary) {
  return pool.status.toLowerCase() === "open" && pool.deadlineStatus !== "Locked";
}

function sortPoolsByCreation(pools: CommissionerPoolSummary[]) {
  return [...pools].sort((first, second) => {
    const firstCreatedAt = Date.parse(first.createdAt) || 0;
    const secondCreatedAt = Date.parse(second.createdAt) || 0;

    return secondCreatedAt - firstCreatedAt;
  });
}

function PoolSummaryCard({ pool }: { pool: CommissionerPoolSummary }) {
  const submittedEntries = pool.entryCounts.submitted + pool.entryCounts.locked;
  const infoId = `pool-summary-${pool.poolId}`;
  const poolDetails = `${pool.templateName}. Picks lock ${formatDateTime(pool.pickDeadline)}. Latest standings ${
    pool.latestStandingsAt
      ? `refreshed ${formatDateTime(pool.latestStandingsAt)}`
      : "will update automatically after results are available"
  }.`;

  return (
    <article className="flex min-h-[16rem] flex-col justify-between gap-5 px-5 py-6">
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="min-w-0 text-xl font-bold tracking-normal text-brand-ink">
              {pool.poolName}
            </h2>
            <button
              type="button"
              aria-label={`About ${pool.poolName}`}
              aria-describedby={infoId}
              className="group relative inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface-paper text-muted-foreground transition hover:border-primary/35 hover:text-brand-ink focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
            >
              <Info className="size-3.5" aria-hidden="true" />
              <span
                id={infoId}
                role="tooltip"
                className="pointer-events-none absolute left-0 top-[calc(100%+0.5rem)] z-30 w-72 max-w-[calc(100vw-3rem)] rounded-md border bg-popover px-3 py-2 text-left font-sans text-xs font-normal leading-5 tracking-normal text-popover-foreground opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                {poolDetails}
              </span>
            </button>
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <Button asChild variant="outline" size="icon-sm">
                <Link
                  href={`/dashboard/pools/${pool.poolId}/edit`}
                  aria-label={`Edit ${pool.poolName}`}
                  title={`Edit ${pool.poolName}`}
                >
                  <Edit />
                </Link>
              </Button>
              <DeletePoolButton poolId={pool.poolId} poolName={pool.poolName} iconOnly />
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:divide-x">
          <div className="sm:pr-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">
              <Users className="size-3.5" />
              Direct invites
            </div>
            <p className="mt-1 text-sm font-semibold text-brand-ink">
              {pool.inviteCounts.accepted} of {pool.inviteCounts.total} claimed
            </p>
          </div>
          <div className="sm:px-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">
              <Users className="size-3.5" />
              Shared link
            </div>
            <p className="mt-1 text-sm font-semibold text-brand-ink">
              {pool.inviteCounts.shareLinkJoins} joined
            </p>
          </div>
          <div className="sm:pr-4 xl:px-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">
              <ListChecks className="size-3.5" />
              Entries
            </div>
            <p className="mt-1 text-sm font-semibold text-brand-ink">
              {submittedEntries} submitted
            </p>
          </div>
          <div className="sm:pl-4 xl:pl-4">
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

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="primaryGreen">
          <Link href={`/pools/${pool.poolSlug}/leaderboard`}>
            Leaderboard <Trophy />
          </Link>
        </Button>
        {isActivePool(pool) && pool.makePicksHref ? (
          <Button asChild variant="outline">
            <Link href={pool.makePicksHref}>
              Make picks <ListChecks />
            </Link>
          </Button>
        ) : null}
        {isActivePool(pool) ? (
          <ShareLinkButton href={pool.shareInviteHref} />
        ) : null}
      </div>
    </article>
  );
}

function AuditEventRow({ event }: { event: CommissionerAuditEvent }) {
  return (
    <LedgerRow className="grid gap-3 md:grid-cols-[auto_1fr_auto] md:items-center">
      <span className="grid size-9 place-items-center rounded-full border bg-background text-brand-mark">
        <History className="size-4" />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-brand-ink">{event.summary}</p>
          {event.poolName ? (
            <Badge variant="outline">{event.poolName}</Badge>
          ) : null}
        </div>
        <p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">
          {formatAuditEventType(event.eventType)}
        </p>
      </div>
      <Badge variant="outline">{formatDateTime(event.createdAt)}</Badge>
    </LedgerRow>
  );
}

export default function DashboardPage() {
  return (
    <PageShell
      eyebrow="Pool admin"
      title="Workspace"
      description="A simple operating ledger for pool setup, entries, locks, and scoring."
      backHref="/"
      showHeader={false}
      heroAction={
        <Button asChild variant="primaryGreen" size="lg">
          <Link href="/dashboard/pools">
            Start new pool <ArrowRight />
          </Link>
        </Button>
      }
    >
      <Suspense fallback={<DashboardWorkspaceSkeleton />}>
        <DashboardWorkspaceContent />
      </Suspense>
    </PageShell>
  );
}

async function DashboardWorkspaceContent() {
  await connection();

  const [pools, notifications, auditEvents] = await Promise.all([
    getCommissionerPoolSummaries(),
    getCommissionerNotifications(),
    getCommissionerAuditEvents(),
  ]);
  const openPools = sortPoolsByCreation(pools.filter((pool) => !isPastPool(pool)));
  const pastPools = sortPoolsByCreation(pools.filter(isPastPool));

  if (!pools.length) {
    return <EmptyWorkspace />;
  }

  return (
    <>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.85fr)]">
        <LedgerPanel
          title="Current pools"
          description="Pools owned by this commissioner, including invitations, entries, deadlines, and scoring."
        >
          <div className="divide-y">
            {pools.length ? (
              <>
                {[
                  { title: "Open", pools: openPools },
                  { title: "Past", pools: pastPools },
                ].map(
                  (section) =>
                    section.pools.length > 0 ? (
                      <section key={section.title}>
                        <h3 className="border-b bg-background/65 px-5 py-3 text-sm font-bold tracking-normal text-brand-ink">
                          {section.title}
                        </h3>
                        <div className="divide-y">
                          {section.pools.map((pool) => (
                            <PoolSummaryCard key={pool.poolId} pool={pool} />
                          ))}
                        </div>
                      </section>
                    ) : null,
                )}
              </>
            ) : (
              <LedgerRow className="flex items-start gap-3">
                <ClipboardList className="mt-1 size-5 shrink-0 text-brand-mark" />
                <div>
                  <p className="font-semibold text-brand-ink">
                    No published pools yet
                  </p>
                  <p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">
                    Create a quarter-final pool to start inviting participants and
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
            <div>
              <DraftPoolRows />
            </div>
          </div>
        </LedgerPanel>

        <div className="grid gap-5">
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
            title="Recent activity"
            description="Operating notes for pool publish, invites, lock changes, deadline changes, scoring refreshes, and deletes."
            action={<Badge variant="outline">{auditEvents.length} recent</Badge>}
          >
            {auditEvents.length ? (
              <LedgerRows>
                {auditEvents.map((event) => (
                  <AuditEventRow key={event.id} event={event} />
                ))}
              </LedgerRows>
            ) : (
              <LedgerRow className="flex items-start gap-3">
                <History className="mt-1 size-5 shrink-0 text-brand-mark" />
                <p className="text-sm font-normal leading-6 text-muted-foreground">
                  No commissioner activity has been recorded yet. Publish a pool,
                  add invites, change a deadline, lock a pool, or refresh scoring
                  to start the operating log.
                </p>
              </LedgerRow>
            )}
          </LedgerPanel>

        </div>
      </div>
      <PlaceholderGrid
        items={[
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
    </>
  );
}

function EmptyWorkspace() {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
      <LedgerPanel
        title="Your workspace is ready"
        description="Start with a format or bring the spreadsheet your group already uses. This is where entries, deadlines, and scoring will live once your first pool is set up."
      >
        <div className="flex flex-col gap-5 px-5 py-6 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full border bg-background text-brand-mark">
              <ClipboardList className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold text-brand-ink">No pools yet</p>
              <p className="mt-1 max-w-xl text-sm font-normal leading-6 text-muted-foreground">
                Choose a ready-made template to get started quickly, or import
                the rules and scoring your group already knows.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="primaryGreen">
              <Link href="/dashboard/pools">
                Start new pool <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/upload-your-own">
                Import a spreadsheet <FileSpreadsheet />
              </Link>
            </Button>
          </div>
        </div>
      </LedgerPanel>

      <div className="grid gap-5">
        <LedgerPanel
          title="What happens next"
          description="Set up the pool once, then keep the group moving from one place."
        >
          <LedgerFeatureRows
            className="md:grid-cols-1 md:divide-x-0 md:divide-y"
            items={[
              {
                icon: ClipboardList,
                title: "Set the rules",
                body: "Pick a template, confirm the schedule, and tailor scoring before you invite anyone.",
              },
              {
                icon: Users,
                title: "Invite your group",
                body: "Share a private link when the pool is ready for players to enter their picks.",
              },
              {
                icon: Trophy,
                title: "Run the pool",
                body: "Track entries, lock picks, and publish standings from this workspace.",
              },
            ]}
          />
        </LedgerPanel>
      </div>
    </div>
  );
}

function DashboardWorkspaceSkeleton() {
  return (
    <div
      className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.85fr)]"
      aria-busy="true"
      aria-live="polite"
    >
      <LedgerPanel
        title="Current pools"
        description="Loading your pool operations."
      >
        <div className="grid gap-4 p-5">
          <div className="h-52 animate-pulse rounded-md bg-muted/80" />
          <div className="h-52 animate-pulse rounded-md bg-muted/80" />
        </div>
      </LedgerPanel>
      <div className="grid gap-5">
        <LedgerPanel title="Commissioner inbox" description="Loading recent activity.">
          <div className="grid gap-3 p-5">
            <div className="h-12 animate-pulse rounded-md bg-muted/80" />
            <div className="h-12 animate-pulse rounded-md bg-muted/80" />
          </div>
        </LedgerPanel>
        <LedgerPanel title="Recent activity" description="Loading operating notes.">
          <div className="grid gap-3 p-5">
            <div className="h-12 animate-pulse rounded-md bg-muted/80" />
            <div className="h-12 animate-pulse rounded-md bg-muted/80" />
          </div>
        </LedgerPanel>
      </div>
    </div>
  );
}

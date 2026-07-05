import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Edit,
  ExternalLink,
  FileSpreadsheet,
  History,
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
import { DraftPoolRows } from "./draft-pool-rows";
import { DeletePoolButton } from "./pools/delete-pool-button";
import { ShareLinkButton } from "./share-link-button";

export const dynamic = "force-dynamic";

function formatDateTime(value: string) {
  if (!value) return "Not set";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString();
}

function formatAuditEventType(value: string) {
  return value
    .split(".")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getPoolParticipantStatus(pool: CommissionerPoolSummary) {
  const submittedEntries = pool.entryCounts.submitted + pool.entryCounts.locked;
  const missingEntries = pool.entryCounts.missing;
  const pendingInvites = pool.inviteCounts.pending;
  const acceptedInvites = pool.inviteCounts.accepted;
  const deadlinePassed = pool.deadlineStatus === "Locked";

  if (deadlinePassed && missingEntries > 0) {
    return {
      tone: "warning" as const,
      title: `${pluralize(missingEntries, "entry", "entries")} missing after deadline`,
      body: "Review late participants before scoring or lock the pool as-is.",
    };
  }

  if (missingEntries > 0 && pendingInvites > 0) {
    return {
      tone: "warning" as const,
      title: `${pluralize(missingEntries, "entry", "entries")} still missing`,
      body: `${pluralize(pendingInvites, "direct invite")} unclaimed. Copy the share link or follow up outside the app.`,
    };
  }

  if (missingEntries > 0) {
    return {
      tone: "warning" as const,
      title: `${pluralize(missingEntries, "entry", "entries")} still missing`,
      body: `${pluralize(acceptedInvites, "direct invite")} claimed. Follow up with players who have not submitted picks.`,
    };
  }

  if (pendingInvites > 0) {
    return {
      tone: "neutral" as const,
      title: `${pluralize(pendingInvites, "direct invite")} unclaimed`,
      body: `${pluralize(submittedEntries, "entry", "entries")} submitted. The general signup link can still cover extra players.`,
    };
  }

  if (submittedEntries > 0) {
    return {
      tone: "complete" as const,
      title: "Expected entries are in",
      body: `${pluralize(submittedEntries, "entry", "entries")} submitted. Refresh scoring when results are ready.`,
    };
  }

  return {
    tone: "neutral" as const,
    title: "Waiting on first picks",
    body: "Share the pool link with participants and watch submissions land in the inbox.",
  };
}

function PoolSummaryCard({ pool }: { pool: CommissionerPoolSummary }) {
  const submittedEntries = pool.entryCounts.submitted + pool.entryCounts.locked;
  const expectedEntriesLabel = pool.expectedEntries
    ? `${submittedEntries}/${pool.expectedEntries} expected`
    : `${submittedEntries} submitted`;
  const participantStatus = getPoolParticipantStatus(pool);
  const ParticipantStatusIcon =
    participantStatus.tone === "complete" ? CheckCircle2 : AlertCircle;

  return (
    <article className="flex min-h-[16rem] flex-col justify-between gap-5 rounded-lg border bg-surface-paper p-4">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{pool.status}</Badge>
          <Badge variant="outline">{pool.deadlineStatus}</Badge>
          <Badge variant="outline">{expectedEntriesLabel}</Badge>
          <Badge variant="outline">
            {pool.inviteCounts.pending} unclaimed invites
          </Badge>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-normal text-brand-ink">
            {pool.poolName}
          </h2>
          <p className="text-sm font-normal leading-6 text-muted-foreground">
            {pool.templateName}. Picks lock {formatDateTime(pool.pickDeadline)}.
            Latest standings{" "}
            {pool.latestStandingsAt
              ? `refreshed ${formatDateTime(pool.latestStandingsAt)}`
              : "will update automatically after results are available"}
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
              {pool.inviteCounts.accepted} claimed, {pool.inviteCounts.pending} unclaimed
            </p>
          </div>
          <div className="rounded-lg border bg-background px-3 py-2">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">
              <ListChecks className="size-3.5" />
              Entries
            </div>
            <p className="mt-1 text-sm font-semibold text-brand-ink">
              {pool.expectedEntries
                ? `${submittedEntries} submitted of ${pool.expectedEntries} expected`
                : `${submittedEntries} submitted`}
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
        <div
          className={[
            "flex gap-3 rounded-lg border px-3 py-2",
            participantStatus.tone === "warning"
              ? "border-destructive/20 bg-destructive/5"
              : participantStatus.tone === "complete"
                ? "border-brand-success/25 bg-cta-green-soft"
                : "bg-background",
          ].join(" ")}
        >
          <ParticipantStatusIcon
            className={[
              "mt-0.5 size-4 shrink-0",
              participantStatus.tone === "warning"
                ? "text-destructive"
                : participantStatus.tone === "complete"
                  ? "text-brand-success"
                  : "text-brand-mark",
            ].join(" ")}
          />
          <div>
            <p className="text-sm font-semibold text-brand-ink">
              {participantStatus.title}
            </p>
            <p className="mt-0.5 text-xs font-normal leading-5 text-muted-foreground">
              {participantStatus.body}
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
        <Button asChild variant="outline">
          <Link href={`/dashboard/pools/${pool.poolId}/edit`}>
            Edit <Edit />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/pools/${pool.poolSlug}`}>
            Public <ExternalLink />
          </Link>
        </Button>
        <ShareLinkButton href={pool.shareInviteHref} />
        <DeletePoolButton poolId={pool.poolId} poolName={pool.poolName} />
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

export default async function DashboardPage() {
  const [pools, notifications, auditEvents] = await Promise.all([
    getCommissionerPoolSummaries(),
    getCommissionerNotifications(),
    getCommissionerAuditEvents(),
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
        <div className="space-y-5 p-5">
          {pools.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {pools.map((pool) => (
                <PoolSummaryCard key={pool.poolId} pool={pool} />
              ))}
            </div>
          ) : (
            <LedgerRow className="flex items-start gap-3">
              <ClipboardList className="mt-1 size-5 shrink-0 text-brand-mark" />
              <div>
                <p className="font-semibold text-brand-ink">
                  No published pools yet
                </p>
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
          <DraftPoolRows />
        </div>
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

      <LedgerPanel
        title="Workspace"
        description="Two starting points define the MVP: pool operations and spreadsheet import."
      >
        <LedgerFeatureRows
          items={[
            {
              icon: ClipboardList,
              title: "Pool operations",
              body: "Create pools, invite players, track entries, and review lock status from this workspace.",
              action: (
                <Button asChild>
                  <Link href="/dashboard/pools">
                    Start a pool <ArrowRight />
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

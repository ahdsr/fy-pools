import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowRight, CalendarClock, ClipboardList, Edit, Info, ListChecks, Trophy, Users } from "lucide-react";

import { LedgerPanel, LedgerRow } from "@/components/app/ledger";
import { PageShell } from "@/components/app/page-shell";
import { PoolFormatBrowser } from "@/components/app/pool-format-browser";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/date-time";
import { getCommissionerPoolSummaries, type CommissionerPoolSummary } from "@/lib/round-of-16/persistence";
import { DraftPoolRows } from "./draft-pool-rows";
import { DeletePoolButton } from "./pools/delete-pool-button";
import { ShareLinkButton } from "./share-link-button";

export const unstable_instant = { prefetch: "runtime", samples: [{}] };

function isPastPool(pool: CommissionerPoolSummary) {
  return ["locked", "completed", "archived"].includes(pool.status.toLowerCase());
}

function isActivePool(pool: CommissionerPoolSummary) {
  return pool.status.toLowerCase() === "open" && pool.deadlineStatus !== "Locked";
}

function sortPoolsByCreation(pools: CommissionerPoolSummary[]) {
  return [...pools].sort((first, second) => (Date.parse(second.createdAt) || 0) - (Date.parse(first.createdAt) || 0));
}

function PoolSummaryCard({ pool }: { pool: CommissionerPoolSummary }) {
  const submittedEntries = pool.entryCounts.submitted + pool.entryCounts.locked;
  const infoId = `pool-summary-${pool.poolId}`;
  const poolDetails = `${pool.templateName}. Picks lock ${formatDateTime(pool.pickDeadline)}. Latest standings ${pool.latestStandingsAt ? `refreshed ${formatDateTime(pool.latestStandingsAt)}` : "will update automatically after results are available"}.`;

  return <article className="flex min-h-[16rem] flex-col justify-between gap-5 px-5 py-6"><div className="space-y-4"><div className="flex items-center gap-2"><h2 className="min-w-0 text-xl font-bold tracking-normal text-brand-ink">{pool.poolName}</h2><button type="button" aria-label={`About ${pool.poolName}`} aria-describedby={infoId} className="group relative inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface-paper text-muted-foreground transition hover:border-primary/35 hover:text-brand-ink focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25"><Info className="size-3.5" aria-hidden="true" /><span id={infoId} role="tooltip" className="pointer-events-none absolute left-0 top-[calc(100%+0.5rem)] z-30 w-72 max-w-[calc(100vw-3rem)] rounded-md border bg-popover px-3 py-2 text-left font-sans text-xs font-normal leading-5 tracking-normal text-popover-foreground opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100">{poolDetails}</span></button><div className="ml-auto flex shrink-0 items-center gap-1"><Button asChild variant="outline" size="icon-sm"><Link href={`/dashboard/pools/${pool.poolId}/edit`} aria-label={`Edit ${pool.poolName}`} title={`Edit ${pool.poolName}`}><Edit /></Link></Button><DeletePoolButton poolId={pool.poolId} poolName={pool.poolName} iconOnly /></div></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:divide-x"><PoolMetric icon={Users} label="Direct invites">{pool.inviteCounts.accepted} of {pool.inviteCounts.total} claimed</PoolMetric><PoolMetric icon={Users} label="Shared link">{pool.inviteCounts.shareLinkJoins} joined</PoolMetric><PoolMetric icon={ListChecks} label="Entries">{submittedEntries} submitted</PoolMetric><PoolMetric icon={CalendarClock} label="Deadline">{formatDateTime(pool.pickDeadline)}</PoolMetric></div></div><div className="flex flex-wrap gap-2"><Button asChild variant="primaryGreen"><Link href={`/pools/${pool.poolSlug}/leaderboard`}>Leaderboard <Trophy /></Link></Button>{isActivePool(pool) && pool.makePicksHref ? <Button asChild variant="outline"><Link href={pool.makePicksHref}>Make picks <ListChecks /></Link></Button> : null}{isActivePool(pool) ? <ShareLinkButton href={pool.shareInviteHref} /> : null}</div></article>;
}

function PoolMetric({ icon: Icon, label, children }: { icon: typeof Users; label: string; children: React.ReactNode }) {
  return <div className="sm:pr-4 xl:px-4"><div className="flex items-center gap-2 text-xs font-medium uppercase tracking-normal text-muted-foreground"><Icon className="size-3.5" />{label}</div><p className="mt-1 text-sm font-semibold text-brand-ink">{children}</p></div>;
}

export default function DashboardPage() {
  return <PageShell eyebrow="Pool admin" title="Workspace" description="Manage your pools, then start another format whenever you are ready." backHref="/" showHeader={false} heroAction={<Button asChild variant="primaryGreen" size="lg"><Link href="/dashboard#pool-formats">Start new pool <ArrowRight /></Link></Button>}><Suspense fallback={<DashboardWorkspaceSkeleton />}><DashboardWorkspaceContent /></Suspense></PageShell>;
}

async function DashboardWorkspaceContent() {
  await connection();
  const pools = await getCommissionerPoolSummaries();
  const openPools = sortPoolsByCreation(pools.filter((pool) => !isPastPool(pool)));
  const pastPools = sortPoolsByCreation(pools.filter(isPastPool));

  return <><LedgerPanel title="My pools" description="Pools you own, including invitations, entries, deadlines, and scoring."><div className="divide-y">{pools.length ? <>{[{ title: "Open", pools: openPools }, { title: "Past", pools: pastPools }].map((section) => section.pools.length ? <section key={section.title}><h3 className="border-b bg-background/65 px-5 py-3 text-sm font-bold tracking-normal text-brand-ink">{section.title}</h3><div className="divide-y">{section.pools.map((pool) => <PoolSummaryCard key={pool.poolId} pool={pool} />)}</div></section> : null)}</> : <LedgerRow className="flex items-start gap-3"><ClipboardList className="mt-1 size-5 shrink-0 text-brand-mark" /><div><p className="font-semibold text-brand-ink">No published pools yet</p><p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">Choose a format below to start inviting participants and tracking submissions.</p><Button asChild className="mt-4" variant="primaryGreen"><Link href="/dashboard#pool-formats">New pool <ArrowRight /></Link></Button></div></LedgerRow>}<DraftPoolRows /></div></LedgerPanel><PoolFormatBrowser /></>;
}

function DashboardWorkspaceSkeleton() {
  return <div className="grid gap-7" aria-busy="true" aria-live="polite"><LedgerPanel title="My pools" description="Loading your pool operations."><div className="grid gap-4 p-5"><div className="h-52 animate-pulse rounded-md bg-muted/80" /><div className="h-52 animate-pulse rounded-md bg-muted/80" /></div></LedgerPanel><div className="h-96 animate-pulse rounded-md bg-muted/80" /></div>;
}

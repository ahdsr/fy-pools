import { connection } from "next/server";
import { Suspense } from "react";
import { CommissionerActivityList } from "@/components/app/commissioner-activity-list";
import { LedgerPanel } from "@/components/app/ledger";
import { PageShell } from "@/components/app/page-shell";
import { getCommissionerAuditEvents } from "@/lib/round-of-16/persistence";

export const unstable_instant = { prefetch: "runtime", samples: [{}] };

export default async function DashboardActivityPage() {
  return <PageShell eyebrow="Profile" title="Recent activity" description="A complete record of changes to your pools, invites, locks, and results." showHeader={false}><Suspense fallback={<LedgerPanel title="Activity log" description="Loading your commissioner activity." />}><ActivityLog /></Suspense></PageShell>;
}

async function ActivityLog() {
  await connection();
  const events = await getCommissionerAuditEvents(50);

  return <LedgerPanel title="Activity log" description="The most recent 50 commissioner actions."><CommissionerActivityList events={events} /></LedgerPanel>;
}

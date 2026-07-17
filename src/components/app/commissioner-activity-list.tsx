import { History } from "lucide-react";

import { LedgerRow, LedgerRows } from "@/components/app/ledger";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/date-time";
import type { CommissionerAuditEvent } from "@/lib/round-of-16/persistence";

function formatAuditEventType(value: string) {
  return value.split(".").filter(Boolean).map((part) => part.slice(0, 1).toUpperCase() + part.slice(1)).join(" ");
}

export function CommissionerActivityList({ events }: { events: CommissionerAuditEvent[] }) {
  if (!events.length) {
    return <LedgerRow className="flex items-start gap-3"><History className="mt-1 size-5 shrink-0 text-brand-mark" /><p className="text-sm font-normal leading-6 text-muted-foreground">No commissioner activity has been recorded yet.</p></LedgerRow>;
  }

  return <LedgerRows>{events.map((event) => <LedgerRow key={event.id} className="grid gap-3 md:grid-cols-[auto_1fr_auto] md:items-center"><span className="grid size-9 place-items-center rounded-full border bg-background text-brand-mark"><History className="size-4" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-brand-ink">{event.summary}</p>{event.poolName ? <Badge variant="outline">{event.poolName}</Badge> : null}</div><p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">{formatAuditEventType(event.eventType)}</p></div><Badge variant="outline">{formatDateTime(event.createdAt)}</Badge></LedgerRow>)}</LedgerRows>;
}

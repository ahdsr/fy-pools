"use client";

import Link from "next/link";
import * as React from "react";
import { CheckCircle2 } from "lucide-react";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { validateRankedFinishPicks } from "@/lib/ranked-finish/engine";
import type { RankedFinishPickPayload, RankedFinishSettings } from "@/lib/ranked-finish/types";

export type RankedFinishPickState = {
  message?: string;
  submitted?: { entryId: string; entryPickId: string; submittedAt: string };
};

export function RankedFinishPickForm({
  inviteCode,
  poolSlug,
  settings,
  initialPayload,
  existingSubmittedAt,
  title,
  lockLabel,
  competitorNoun,
  submitAction,
}: {
  inviteCode: string;
  poolSlug: string;
  settings: RankedFinishSettings;
  initialPayload?: RankedFinishPickPayload;
  existingSubmittedAt?: string;
  title: string;
  lockLabel: string;
  competitorNoun: string;
  submitAction: (state: RankedFinishPickState, formData: FormData) => Promise<RankedFinishPickState>;
}) {
  const [state, action, pending] = React.useActionState(submitAction, {});
  const [payload, setPayload] = React.useState<RankedFinishPickPayload>(() => initialPayload ?? { markets: {} });
  const validation = validateRankedFinishPicks(settings, payload);
  const setPick = (marketId: string, position: number, competitorId: string) => setPayload((current) => {
    const market = [...(current.markets[marketId] ?? [])];
    market[position - 1] = competitorId;
    return { markets: { ...current.markets, [marketId]: market } };
  });

  return <form action={action} className="space-y-5"><input type="hidden" name="inviteCode" value={inviteCode} /><input type="hidden" name="payload" value={JSON.stringify(payload)} />
    <LedgerPanel title={title} description={`Choose exact finishing positions. A ${competitorNoun} may appear once per market.`}><div className="flex items-center justify-between border-b bg-surface-ledger/60 px-5 py-3"><p className="text-sm font-semibold text-brand-ink">{settings.basics.eventLabel}</p><Badge variant="outline">Locks {lockLabel}</Badge></div><LedgerRows>{settings.markets.flatMap((market) => Array.from({ length: market.positions }, (_, index) => { const current = payload.markets[market.id]?.[index] ?? ""; const used = new Set((payload.markets[market.id] ?? []).filter((id, usedIndex) => usedIndex !== index)); return <LedgerRow key={`${market.id}-${index + 1}`} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_13rem] md:items-center"><div><p className="font-semibold text-brand-ink">{market.label} P{index + 1}</p><p className="text-sm text-muted-foreground">{market.pointsPerExactPosition} points for exact position</p></div><Select value={current} onValueChange={(competitorId) => setPick(market.id, index + 1, competitorId)}><SelectTrigger aria-label={`${market.label} position ${index + 1}`}><SelectValue placeholder={`Choose ${competitorNoun}`} /></SelectTrigger><SelectContent>{settings.competitors.filter((competitor) => !used.has(competitor.id) || competitor.id === current).map((competitor) => <SelectItem key={competitor.id} value={competitor.id}>{competitor.name}</SelectItem>)}</SelectContent></Select></LedgerRow>; }))}</LedgerRows></LedgerPanel>
    {state.message ? <p role="alert" className="text-sm font-medium text-destructive">{state.message}</p> : null}
    {state.submitted ? <LedgerPanel title="Picks submitted" description="Your predictions are saved. You can return to update them before the pool locks."><LedgerRow className="flex flex-wrap gap-3"><CheckCircle2 className="size-5 text-brand-success" /><Button asChild variant="outline"><Link href={`/pools/${poolSlug}`}>View pool</Link></Button></LedgerRow></LedgerPanel> : <div className="flex justify-end"><Button type="submit" variant="primaryGreen" disabled={Boolean(validation) || pending}>{pending ? "Saving…" : existingSubmittedAt ? "Update picks" : "Submit picks"}</Button></div>}
  </form>;
}

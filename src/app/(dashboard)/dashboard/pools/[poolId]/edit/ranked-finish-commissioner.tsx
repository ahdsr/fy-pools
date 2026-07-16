"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PlayCircle } from "lucide-react";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RankedFinishSettings } from "@/lib/ranked-finish/types";

export type RankedFinishResultState = { message?: string; completed?: string };

export function RankedFinishCommissioner({
  poolId,
  poolName,
  settings,
  participantNoun,
  recordAction,
  resetAction,
}: {
  poolId: string;
  poolName: string;
  settings: RankedFinishSettings;
  participantNoun: string;
  recordAction: (state: RankedFinishResultState, formData: FormData) => Promise<RankedFinishResultState>;
  resetAction: (state: RankedFinishResultState, formData: FormData) => Promise<RankedFinishResultState>;
}) {
  const router = useRouter();
  const [state, action, pending] = React.useActionState(recordAction, {});
  const [resetState, resetActionState, resetPending] = React.useActionState(resetAction, {});
  const [marketId, setMarketId] = React.useState(settings.markets[0]?.id ?? "");
  const [competitorId, setCompetitorId] = React.useState("");
  const market = settings.markets.find((candidate) => candidate.id === marketId) ?? settings.markets[0];
  const recorded = market ? settings.results[market.id] ?? [] : [];
  const available = settings.competitors.filter((competitor) => !recorded.includes(competitor.id));
  React.useEffect(() => { if (state.completed || resetState.completed) router.refresh(); }, [resetState.completed, router, state.completed]);
  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start"><LedgerPanel title={`${poolName} results`} description="Enter positions in order. Each saved result recalculates every submitted entry."><LedgerRows>{settings.markets.flatMap((candidate) => Array.from({ length: candidate.positions }, (_, index) => { const competitorIdAtPosition = settings.results[candidate.id]?.[index]; const competitor = settings.competitors.find((entry) => entry.id === competitorIdAtPosition); return <LedgerRow key={`${candidate.id}-${index + 1}`} className="grid gap-2 sm:grid-cols-[10rem_1fr_auto] sm:items-center"><p className="font-semibold text-brand-ink">{candidate.label} P{index + 1}</p><p className="text-sm text-muted-foreground">{competitor?.name ?? "Awaiting result"}</p><Badge variant={competitor ? "secondary" : "outline"}>{competitor ? "Recorded" : "Pending"}</Badge></LedgerRow>; }))}</LedgerRows></LedgerPanel><LedgerPanel title="Record next result" description="Use this deterministic entry tool to replay results and verify the leaderboard before live results are connected."><form action={action} className="space-y-4 p-5"><input type="hidden" name="poolId" value={poolId} /><input type="hidden" name="result" value={JSON.stringify(market && competitorId ? { marketId: market.id, competitorId } : {})} /><Select value={market?.id ?? ""} onValueChange={(value) => { setMarketId(value); setCompetitorId(""); }}><SelectTrigger><SelectValue placeholder="Market" /></SelectTrigger><SelectContent>{settings.markets.map((candidate) => <SelectItem key={candidate.id} value={candidate.id}>{candidate.label} ({(settings.results[candidate.id] ?? []).length}/{candidate.positions})</SelectItem>)}</SelectContent></Select>{market ? <><p className="text-sm text-muted-foreground">Next: {market.label} P{recorded.length + 1}</p><Select value={competitorId} onValueChange={setCompetitorId} disabled={recorded.length >= market.positions}><SelectTrigger><SelectValue placeholder={`Choose ${participantNoun}`} /></SelectTrigger><SelectContent>{available.map((competitor) => <SelectItem key={competitor.id} value={competitor.id}>{competitor.name}</SelectItem>)}</SelectContent></Select><Button type="submit" variant="primaryGreen" disabled={!competitorId || recorded.length >= market.positions || pending}>{pending ? "Saving…" : "Record result"}<PlayCircle /></Button></> : null}{state.message ? <p role="alert" className="text-sm font-medium text-destructive">{state.message}</p> : null}</form><form action={resetActionState} className="border-t p-5"><p className="mb-3 text-sm leading-6 text-muted-foreground">Clear every entered result and rebuild standings from zero.</p><input type="hidden" name="poolId" value={poolId} /><Button type="submit" variant="outline" disabled={!Object.keys(settings.results).length || resetPending}>{resetPending ? "Resetting…" : "Reset results"}</Button>{resetState.message ? <p role="alert" className="mt-3 text-sm font-medium text-destructive">{resetState.message}</p> : null}</form></LedgerPanel></div>;
}

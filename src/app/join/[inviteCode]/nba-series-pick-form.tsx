"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createNbaSimulation } from "@/lib/nba-series/draft";
import type { NbaSeriesPickPayload, NbaSeriesSettings } from "@/lib/nba-series/types";
import { recordSeriesResult, resolveBracketSimulation } from "@/lib/templates/bracket-simulation";
import { submitNbaSeriesPicksAction } from "./nba-actions";

const SCORE_OPTIONS = [0, 1, 2, 3];

export function NbaSeriesPickForm({ inviteCode, poolSlug, settings, initialPayload, existingSubmittedAt }: { inviteCode: string; poolSlug: string; settings: NbaSeriesSettings; initialPayload?: NbaSeriesPickPayload; existingSubmittedAt?: string }) {
  const [state, action, pending] = React.useActionState(submitNbaSeriesPicksAction, {});
  const [payload, setPayload] = React.useState<NbaSeriesPickPayload>(() => initialPayload ?? { series: {} });
  const series = React.useMemo(() => {
    const initial = createNbaSimulation({ teams: settings.teams, results: {} });
    return initial.series.reduce<{ working: typeof initial; rows: ReturnType<typeof resolveBracketSimulation> }>((current, template) => {
      const resolved = resolveBracketSimulation(current.working).find((item) => item.id === template.id)!;
      const pick = payload.series[template.id];
      const working = pick ? (() => { try { return recordSeriesResult({ simulation: current.working, seriesId: template.id, result: pick }); } catch { return current.working; } })() : current.working;
      return { working, rows: [...current.rows, resolved] };
    }, { working: initial, rows: [] }).rows;
  }, [payload, settings.teams]);
  const complete = series.length === Object.keys(payload.series).length && series.every((item) => payload.series[item.id]);
  const updatePick = (seriesId: string, winner: string, loserWins = 0) => setPayload((current) => ({ ...current, series: { ...current.series, [seriesId]: { winner, winnerWins: 4, loserWins } } }));
  return <form action={action} className="space-y-5"><input type="hidden" name="inviteCode" value={inviteCode} /><input type="hidden" name="payload" value={JSON.stringify(payload)} />
    <LedgerPanel title="Your NBA playoff bracket" description="Pick every series winner and final score. Later rounds unlock from the winners you select."><div className="flex items-center justify-between border-b bg-surface-ledger/60 px-5 py-3"><p className="text-sm font-semibold text-brand-ink">{Object.keys(payload.series).length} of {series.length} series picked</p><Badge variant="outline">Best of 7</Badge></div><LedgerRows>{series.map((item) => { const pick = payload.series[item.id]; const available = Boolean(item.homeTeam && item.awayTeam); return <LedgerRow key={item.id} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem_8rem] md:items-center"><div><p className="font-semibold text-brand-ink">{item.label}</p><p className="mt-1 text-sm text-muted-foreground">{available ? `${item.homeTeam} vs ${item.awayTeam}` : "Complete the previous round to reveal this matchup."}</p></div><Select value={pick?.winner ?? ""} onValueChange={(winner) => updatePick(item.id, winner, pick?.loserWins ?? 0)} disabled={!available}><SelectTrigger aria-label={`${item.label} winner`}><SelectValue placeholder="Winner" /></SelectTrigger><SelectContent>{item.homeTeam ? <SelectItem value={item.homeTeam}>{item.homeTeam}</SelectItem> : null}{item.awayTeam ? <SelectItem value={item.awayTeam}>{item.awayTeam}</SelectItem> : null}</SelectContent></Select><Select value={pick ? String(pick.loserWins) : ""} onValueChange={(value) => pick && updatePick(item.id, pick.winner, Number(value))} disabled={!pick}><SelectTrigger aria-label={`${item.label} score`}><SelectValue placeholder="Score" /></SelectTrigger><SelectContent>{SCORE_OPTIONS.map((losses) => <SelectItem key={losses} value={String(losses)}>4–{losses}</SelectItem>)}</SelectContent></Select></LedgerRow>; })}</LedgerRows></LedgerPanel>
    {state.message ? <p role="alert" className="text-sm font-medium text-destructive">{state.message}</p> : null}
    {state.submitted ? <LedgerPanel title="Picks submitted" description="Your bracket is saved. You can return to update it before the deadline."><LedgerRow className="flex flex-wrap gap-3"><CheckCircle2 className="size-5 text-brand-success" /><Button asChild variant="outline"><Link href={`/pools/${poolSlug}`}>View pool</Link></Button></LedgerRow></LedgerPanel> : <div className="flex justify-end"><Button type="submit" variant="primaryGreen" disabled={!complete || pending}>{pending ? "Saving…" : existingSubmittedAt ? "Update picks" : "Submit picks"}</Button></div>}
  </form>;
}

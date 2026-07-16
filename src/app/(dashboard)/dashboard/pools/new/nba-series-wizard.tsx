"use client";

import Link from "next/link";
import * as React from "react";
import { ArrowRight, Copy, RefreshCw, Trophy } from "lucide-react";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { PageShell } from "@/components/app/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createDefaultNbaSeriesSettings, validateNbaSeriesSettings } from "@/lib/nba-series/draft";
import { createNbaSettingsFromCatalogEvent } from "@/lib/nba-series/catalog";
import type { CatalogEventSnapshot } from "@/lib/events/types";
import type { NbaSeriesInvite, NbaSeriesSettings } from "@/lib/nba-series/types";
import { publishNbaSeriesPoolAction, refreshNbaCatalogAction, type PublishNbaSeriesState, type RefreshNbaCatalogState } from "./nba-actions";

const EMPTY_INVITES: NbaSeriesInvite[] = Array.from({ length: 5 }, (_, index) => ({ id: `invite-${index + 1}`, email: "", displayName: "" }));

function formatCatalogTime(value: string | undefined) {
  return value ? new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Toronto" }).format(new Date(value)) : "Not scheduled";
}

export function NbaSeriesWizard({ catalogEvents }: { catalogEvents: CatalogEventSnapshot[] }) {
  const [settings, setSettings] = React.useState<NbaSeriesSettings>(createDefaultNbaSeriesSettings);
  const [participants, setParticipants] = React.useState<NbaSeriesInvite[]>(EMPTY_INVITES);
  const [state, action, pending] = React.useActionState<PublishNbaSeriesState, FormData>(publishNbaSeriesPoolAction, {});
  const [catalogState, catalogAction, catalogPending] = React.useActionState<RefreshNbaCatalogState, FormData>(refreshNbaCatalogAction, {});
  const [catalogSeason, setCatalogSeason] = React.useState(String(new Date().getUTCFullYear()));
  const [selectedCatalogId, setSelectedCatalogId] = React.useState(catalogEvents[0]?.externalId ?? "");
  const [catalogMessage, setCatalogMessage] = React.useState("");
  const selectedCatalogEvent = catalogEvents.find((event) => event.externalId === selectedCatalogId) ?? catalogEvents[0];
  const validation = validateNbaSeriesSettings(settings);
  if (state.published) return <NbaPublishedPanel published={state.published} />;
  const updateTeam = (id: string, name: string) => setSettings((current) => ({ ...current, teams: current.teams.map((team) => team.id === id ? { ...team, name } : team) }));
  const updateInvite = (id: string, patch: Partial<NbaSeriesInvite>) => setParticipants((current) => current.map((invite) => invite.id === id ? { ...invite, ...patch } : invite));
  return (
    <PageShell eyebrow="NBA Playoffs" title="Set up an NBA Series Bracket" description="Configure the playoff field, invite your group, then use the commissioner simulator to enter series in order." showHeader={false}>
      <form action={action} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <input type="hidden" name="settings" value={JSON.stringify(settings)} />
        <input type="hidden" name="participants" value={JSON.stringify(participants)} />
        <div className="grid gap-5">
          <LedgerPanel title="Live NBA playoff field" description="Select a confirmed playoff snapshot to prefill all 16 teams, seeds, and the first-tip lock. Manual setup remains available as a fallback.">
            <div className="space-y-4 p-5">
              <div className="flex flex-wrap items-end gap-3">
                <form action={catalogAction} className="flex items-end gap-3">
                  <Field label="NBA season"><Input className="w-28" inputMode="numeric" value={catalogSeason} onChange={(event) => setCatalogSeason(event.target.value)} /></Field>
                  <input type="hidden" name="season" value={catalogSeason} />
                  <Button type="submit" variant="outline" disabled={catalogPending}><RefreshCw className={catalogPending ? "animate-spin" : ""} />{catalogPending ? "Refreshing…" : "Refresh live field"}</Button>
                </form>
                {catalogState.refreshedAt ? <p className="pb-2 text-sm text-muted-foreground">Refreshed {formatCatalogTime(catalogState.refreshedAt)}.</p> : null}
              </div>
              {catalogState.message ? <p role="alert" className="text-sm font-medium text-destructive">{catalogState.message}</p> : null}
              {catalogEvents.length ? <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"><div className="space-y-2"><Label htmlFor="nba-catalog-event">Available snapshot</Label><select id="nba-catalog-event" className="flex h-11 w-full border border-border bg-background px-3 text-sm" value={selectedCatalogEvent?.externalId ?? ""} onChange={(event) => setSelectedCatalogId(event.target.value)}>{catalogEvents.map((event) => <option key={event.externalId} value={event.externalId}>{event.displayName} · {event.teams?.length ?? 0} teams · {event.freshness}</option>)}</select></div><Button type="button" variant="primaryGreen" className="self-end" disabled={selectedCatalogEvent?.freshness !== "ready" || selectedCatalogEvent?.readiness !== "ready"} onClick={() => { try { if (!selectedCatalogEvent) return; setSettings((current) => createNbaSettingsFromCatalogEvent(selectedCatalogEvent, { commissionerName: current.basics.commissionerName, poolName: current.basics.poolName === "NBA Playoff Bracket" ? undefined : current.basics.poolName, timezone: current.basics.timezone })); setCatalogMessage("Confirmed live field applied. Review the name and invite plan, then publish."); } catch (error) { setCatalogMessage(error instanceof Error ? error.message : "This event could not be applied."); } }}>Use confirmed field</Button></div> : <p className="text-sm text-muted-foreground">No NBA snapshot is stored yet. Refresh the season when the postseason field is available.</p>}
              {selectedCatalogEvent ? <p className="text-sm text-muted-foreground">{selectedCatalogEvent.readinessReason} First tip: {formatCatalogTime(selectedCatalogEvent.startsAt)}. {selectedCatalogEvent.series?.length ?? 0} provider series captured.</p> : null}
              {catalogMessage ? <p className="text-sm font-medium text-brand-ink" role="status">{catalogMessage}</p> : null}
            </div>
          </LedgerPanel>
          <LedgerPanel title="Pool basics" description="This bracket uses series winners and exact 4–0 through 4–3 score picks.">
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Pool name"><Input value={settings.basics.poolName} onChange={(event) => setSettings((current) => ({ ...current, basics: { ...current.basics, poolName: event.target.value } }))} /></Field>
              <Field label="Commissioner name"><Input value={settings.basics.commissionerName} onChange={(event) => setSettings((current) => ({ ...current, basics: { ...current.basics, commissionerName: event.target.value } }))} /></Field>
              <Field label="Pick deadline"><Input type="datetime-local" value={settings.basics.picksLockAt} onChange={(event) => setSettings((current) => ({ ...current, basics: { ...current.basics, picksLockAt: event.target.value } }))} /></Field>
              <Field label="Prize pool"><Input value={settings.scoring.prizePoolLabel} placeholder="$100" onChange={(event) => setSettings((current) => ({ ...current, scoring: { ...current.scoring, prizePoolLabel: event.target.value } }))} /></Field>
              <div className="sm:col-span-2"><Field label="Description"><Textarea value={settings.basics.description} onChange={(event) => setSettings((current) => ({ ...current, basics: { ...current.basics, description: event.target.value } }))} /></Field></div>
            </div>
          </LedgerPanel>
          <LedgerPanel title="Playoff field" description={settings.sourceSnapshot ? `Captured from ${settings.sourceSnapshot.provider} at ${formatCatalogTime(settings.sourceSnapshot.fetchedAt)}. Seeds determine first-round matchups.` : "Seeds determine the first-round matchups. You can replace these placeholder teams with the confirmed field."}>
            <div className="grid gap-5 p-5 lg:grid-cols-2">
              {(["east", "west"] as const).map((conference) => <div key={conference} className="space-y-3"><h3 className="font-semibold text-brand-ink">{conference === "east" ? "Eastern Conference" : "Western Conference"}</h3><LedgerRows className="overflow-hidden rounded-lg border">{settings.teams.filter((team) => team.conference === conference).sort((a,b) => a.seed-b.seed).map((team) => <LedgerRow key={team.id} className="grid grid-cols-[2rem_1fr] items-center gap-3"><span className="text-sm font-bold text-muted-foreground">{team.seed}</span><Input aria-label={`${conference} seed ${team.seed}`} value={team.name} onChange={(event) => updateTeam(team.id, event.target.value)} /></LedgerRow>)}</LedgerRows></div>)}
            </div>
          </LedgerPanel>
          <LedgerPanel title="Scoring" description="A correct winner is scored independently from an exact series score."><div className="grid gap-4 p-5 sm:grid-cols-2"><Field label="Winner points"><Input type="number" min="0" value={settings.scoring.winnerPoints} onChange={(event) => setSettings((current) => ({ ...current, scoring: { ...current.scoring, winnerPoints: Number(event.target.value) || 0 } }))} /></Field><Field label="Exact-score points"><Input type="number" min="0" value={settings.scoring.exactScorePoints} onChange={(event) => setSettings((current) => ({ ...current, scoring: { ...current.scoring, exactScorePoints: Number(event.target.value) || 0 } }))} /></Field></div></LedgerPanel>
          <LedgerPanel title="Invite plan" description="Participant links are created when you publish."><div className="grid gap-3 p-5">{participants.map((invite) => <div key={invite.id} className="grid gap-3 sm:grid-cols-2"><Input placeholder="Name" value={invite.displayName} onChange={(event) => updateInvite(invite.id, { displayName: event.target.value })} /><Input type="email" placeholder="email@example.com" value={invite.email} onChange={(event) => updateInvite(invite.id, { email: event.target.value })} /></div>)}</div></LedgerPanel>
        </div>
        <LedgerPanel title="Ready to publish" description="Players can update picks until the pool deadline."><div className="space-y-4 p-5"><Badge variant={validation ? "outline" : "secondary"}>{validation ? "Needs info" : "Ready"}</Badge><p className="text-sm leading-6 text-muted-foreground">{validation ?? "The commissioner simulator will unlock after publishing so you can test every series result before connecting live data."}</p>{state.message ? <p role="alert" className="text-sm font-medium text-destructive">{state.message}</p> : null}<Button type="submit" className="w-full" variant="primaryGreen" disabled={Boolean(validation) || pending}>{pending ? "Publishing…" : "Publish NBA pool"} <ArrowRight /></Button></div></LedgerPanel>
      </form>
    </PageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div>; }
function NbaPublishedPanel({ published }: { published: NonNullable<PublishNbaSeriesState["published"]> }) { return <PageShell eyebrow="NBA Playoffs" title="Your NBA pool is live" description="Share the signup link, collect picks, then simulate series from the commissioner edit page." showHeader={false}><LedgerPanel><div className="space-y-5 p-6"><div className="flex items-center gap-3"><Trophy className="size-8 text-brand-success" /><div><h2 className="text-xl font-bold text-brand-ink">{published.poolName}</h2><p className="text-sm text-muted-foreground">Series bracket ready for entrants.</p></div></div><div className="flex flex-wrap gap-3"><Button asChild variant="primaryGreen"><Link href={`/dashboard/pools/${published.poolId}/edit`}>Open simulator <Trophy /></Link></Button><Button asChild variant="outline"><Link href={published.poolHref}>View pool</Link></Button><Button asChild variant="outline"><Link href={published.signupInviteLink.href}>Make picks</Link></Button></div><LedgerRows className="rounded-lg border"><LedgerRow className="flex items-center justify-between gap-3"><div><p className="font-semibold text-brand-ink">Signup link</p><p className="text-sm text-muted-foreground">{published.signupInviteLink.href}</p></div><Copy className="size-4 text-muted-foreground" /></LedgerRow>{published.inviteLinks.map((invite) => <LedgerRow key={invite.email}><p className="font-semibold text-brand-ink">{invite.displayName}</p><p className="text-sm text-muted-foreground">{invite.href}</p></LedgerRow>)}</LedgerRows></div></LedgerPanel></PageShell>; }

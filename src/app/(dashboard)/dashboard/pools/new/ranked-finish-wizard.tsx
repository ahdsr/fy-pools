"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { ArrowRight, Copy, RefreshCw, Trophy } from "lucide-react";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { PageShell } from "@/components/app/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CatalogEventSnapshot } from "@/lib/events/types";
import { rankedFinishDeadlineHasPassed, validateRankedFinishSettings } from "@/lib/ranked-finish/engine";
import type { RankedFinishInvite } from "@/lib/ranked-finish/persistence";
import type { RankedFinishSettings } from "@/lib/ranked-finish/types";

export type RankedFinishPublished = {
  poolId: string;
  poolSlug: string;
  poolName: string;
  poolHref: string;
  signupInviteLink: { code: string; href: string };
  inviteLinks: { email: string; displayName: string; href: string }[];
};
export type RankedFinishPublishState = { message?: string; published?: RankedFinishPublished };
export type RankedFinishCatalogState = { message?: string; refreshedAt?: string; eventCount?: number };

export type RankedFinishWizardCopy = {
  eyebrow: string;
  title: string;
  description: string;
  catalogTitle: string;
  catalogDescription: string;
  seasonLabel: string;
  refreshLabel: string;
  eventLabel: string;
  noEventsMessage: string;
  useEventLabel: string;
  rosterTitle: string;
  participantNoun: string;
  rosterReviewLabel: string;
  lockDescription: string;
  publishLabel: string;
  publishedTitle: string;
  publishedDescription: string;
  lockAt: (event: CatalogEventSnapshot) => string | undefined;
};

const EMPTY_INVITES: RankedFinishInvite[] = Array.from({ length: 5 }, (_, index) => ({ id: `invite-${index + 1}`, email: "", displayName: "" }));

function formatTime(value: string | undefined) {
  return value ? new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Toronto" }).format(new Date(value)) : "Not scheduled";
}

export function RankedFinishWizard({
  catalogEvents,
  createDefaultSettings,
  createSettingsFromCatalogEvent,
  publishAction,
  refreshCatalogAction,
  copy,
}: {
  catalogEvents: CatalogEventSnapshot[];
  createDefaultSettings: () => RankedFinishSettings;
  createSettingsFromCatalogEvent: (event: CatalogEventSnapshot, options?: { commissionerName?: string; poolName?: string; timezone?: string }) => RankedFinishSettings;
  publishAction: (state: RankedFinishPublishState, formData: FormData) => Promise<RankedFinishPublishState>;
  refreshCatalogAction: (state: RankedFinishCatalogState, formData: FormData) => Promise<RankedFinishCatalogState>;
  copy: RankedFinishWizardCopy;
}) {
  const router = useRouter();
  const [settings, setSettings] = React.useState<RankedFinishSettings>(createDefaultSettings);
  const [participants, setParticipants] = React.useState<RankedFinishInvite[]>(EMPTY_INVITES);
  const [state, action, pending] = React.useActionState(publishAction, {});
  const [catalogState, catalogAction, catalogPending] = React.useActionState(refreshCatalogAction, {});
  const [season, setSeason] = React.useState(String(new Date().getUTCFullYear()));
  const [selectedId, setSelectedId] = React.useState(catalogEvents[0]?.externalId ?? "");
  const [catalogMessage, setCatalogMessage] = React.useState("");
  const selected = catalogEvents.find((event) => event.externalId === selectedId) ?? catalogEvents[0];
  const validation = validateRankedFinishSettings(settings) ?? (!settings.sourceSnapshot ? `Select and review a live ${copy.eventLabel.toLowerCase()}.` : !settings.sourceSnapshot.rosterReviewed ? `Confirm the captured ${copy.participantNoun} roster.` : rankedFinishDeadlineHasPassed(settings) ? "The selected event is already locked." : null);

  React.useEffect(() => {
    if (catalogState.refreshedAt) router.refresh();
  }, [catalogState.refreshedAt, router]);

  const updateInvite = (id: string, patch: Partial<RankedFinishInvite>) => setParticipants((current) => current.map((invite) => invite.id === id ? { ...invite, ...patch } : invite));
  if (state.published) return <RankedFinishPublishedPanel published={state.published} copy={copy} />;

  return <PageShell eyebrow={copy.eyebrow} title={copy.title} description={copy.description} showHeader={false}>
    <div className="grid gap-5">
      <LedgerPanel title={copy.catalogTitle} description={copy.catalogDescription}>
        <div className="space-y-4 p-5"><form action={catalogAction} className="flex flex-wrap items-end gap-3"><div className="space-y-2"><Label>{copy.seasonLabel}</Label><Input className="w-28" inputMode="numeric" value={season} onChange={(event) => setSeason(event.target.value)} /></div><input type="hidden" name="season" value={season} /><Button type="submit" variant="outline" disabled={catalogPending}><RefreshCw className={catalogPending ? "animate-spin" : ""} />{catalogPending ? "Refreshing…" : copy.refreshLabel}</Button>{catalogState.refreshedAt ? <p className="pb-2 text-sm text-muted-foreground">Refreshed {formatTime(catalogState.refreshedAt)}.</p> : null}</form>
          {catalogState.message ? <p role="alert" className="text-sm font-medium text-destructive">{catalogState.message}</p> : null}
          {catalogEvents.length ? <div className="space-y-2"><Label htmlFor="ranked-finish-catalog-event">{copy.eventLabel}</Label><select id="ranked-finish-catalog-event" className="flex h-11 w-full border border-border bg-background px-3 text-sm" value={selected?.externalId ?? ""} onChange={(event) => setSelectedId(event.target.value)}>{catalogEvents.map((event) => <option key={event.externalId} value={event.externalId}>{event.displayName} · {formatTime(copy.lockAt(event))} · {event.freshness}</option>)}</select></div> : <p className="text-sm text-muted-foreground">{copy.noEventsMessage}</p>}
          {selected ? <><p className="text-sm text-muted-foreground">{selected.readinessReason} {selected.participants.length} {copy.participantNoun}s captured. Pick lock will be {formatTime(copy.lockAt(selected))}.</p><Button type="button" variant="primaryGreen" disabled={selected.freshness === "stale" || selected.readiness === "unavailable"} onClick={() => { try { setSettings((current) => createSettingsFromCatalogEvent(selected, { commissionerName: current.basics.commissionerName, poolName: current.basics.poolName === createDefaultSettings().basics.poolName ? undefined : current.basics.poolName, timezone: current.basics.timezone })); setCatalogMessage(`Live event applied. Review the ${copy.participantNoun} roster and confirm it before publishing.`); } catch (error) { setCatalogMessage(error instanceof Error ? error.message : "This event could not be applied."); } }}>{copy.useEventLabel}</Button></> : null}
          {catalogMessage ? <p role="status" className="text-sm font-medium text-brand-ink">{catalogMessage}</p> : null}
        </div>
      </LedgerPanel>
      <form action={action} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start"><input type="hidden" name="settings" value={JSON.stringify(settings)} /><input type="hidden" name="participants" value={JSON.stringify(participants)} />
        <div className="grid gap-5">
          <LedgerPanel title="Pool basics" description={copy.lockDescription}><div className="grid gap-4 p-5 sm:grid-cols-2"><Field label="Pool name"><Input value={settings.basics.poolName} onChange={(event) => setSettings((current) => ({ ...current, basics: { ...current.basics, poolName: event.target.value } }))} /></Field><Field label="Commissioner name"><Input value={settings.basics.commissionerName} onChange={(event) => setSettings((current) => ({ ...current, basics: { ...current.basics, commissionerName: event.target.value } }))} /></Field><div className="sm:col-span-2"><Field label="Description"><Textarea value={settings.basics.description} onChange={(event) => setSettings((current) => ({ ...current, basics: { ...current.basics, description: event.target.value } }))} /></Field></div></div></LedgerPanel>
          <LedgerPanel title={copy.rosterTitle} description={settings.sourceSnapshot ? `Snapshot: ${settings.sourceSnapshot.provider}, captured ${formatTime(settings.sourceSnapshot.fetchedAt)}.` : `Select a live ${copy.eventLabel.toLowerCase()} to capture its roster.`}><div className="space-y-4 p-5"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{settings.competitors.map((competitor, index) => <div key={competitor.id} className="border border-border px-3 py-2 text-sm"><span className="mr-2 text-muted-foreground">{index + 1}</span>{competitor.name}</div>)}</div>{settings.sourceSnapshot ? <label className="flex items-start gap-3 border-t pt-4 text-sm"><Checkbox checked={settings.sourceSnapshot.rosterReviewed} onCheckedChange={(checked) => setSettings((current) => current.sourceSnapshot ? { ...current, sourceSnapshot: { ...current.sourceSnapshot, rosterReviewed: checked === true } } : current)} /><span>{copy.rosterReviewLabel}</span></label> : null}</div></LedgerPanel>
          <LedgerPanel title="Scoring" description="Exact position scoring is reusable across ranked-finish templates."><div className="grid gap-4 p-5 sm:grid-cols-2">{settings.markets.map((market) => <div key={market.id} className="border border-border p-4"><p className="font-semibold text-brand-ink">{market.label} Top {market.positions}</p><p className="mt-1 text-sm text-muted-foreground">{market.pointsPerExactPosition} points for each exact finishing position.</p></div>)}</div></LedgerPanel>
          <LedgerPanel title="Invite plan" description="Participant links are created when you publish."><div className="grid gap-3 p-5">{participants.map((invite) => <div key={invite.id} className="grid gap-3 sm:grid-cols-2"><Input placeholder="Name" value={invite.displayName} onChange={(event) => updateInvite(invite.id, { displayName: event.target.value })} /><Input type="email" placeholder="email@example.com" value={invite.email} onChange={(event) => updateInvite(invite.id, { email: event.target.value })} /></div>)}</div></LedgerPanel>
        </div>
        <LedgerPanel title="Ready to publish" description="Players can update their picks until the saved event lock."><div className="space-y-4 p-5"><Badge variant={validation ? "outline" : "secondary"}>{validation ? "Needs review" : "Ready"}</Badge><p className="text-sm leading-6 text-muted-foreground">{validation ?? "Results can be entered or replayed after publishing to verify the leaderboard."}</p>{state.message ? <p role="alert" className="text-sm font-medium text-destructive">{state.message}</p> : null}<Button type="submit" className="w-full" variant="primaryGreen" disabled={Boolean(validation) || pending}>{pending ? "Publishing…" : copy.publishLabel}<ArrowRight /></Button></div></LedgerPanel>
      </form>
    </div>
  </PageShell>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div>; }

function RankedFinishPublishedPanel({ published, copy }: { published: RankedFinishPublished; copy: RankedFinishWizardCopy }) {
  return <PageShell eyebrow={copy.eyebrow} title={copy.publishedTitle} description={copy.publishedDescription} showHeader={false}><LedgerPanel><div className="space-y-5 p-6"><div className="flex items-center gap-3"><Trophy className="size-8 text-brand-success" /><div><h2 className="text-xl font-bold text-brand-ink">{published.poolName}</h2><p className="text-sm text-muted-foreground">Prediction pool ready for entrants.</p></div></div><div className="flex flex-wrap gap-3"><Button asChild variant="primaryGreen"><Link href={`/dashboard/pools/${published.poolId}/edit`}>Enter results <Trophy /></Link></Button><Button asChild variant="outline"><Link href={published.poolHref}>View pool</Link></Button><Button asChild variant="outline"><Link href={published.signupInviteLink.href}>Make picks</Link></Button></div><LedgerRows className="rounded-lg border"><LedgerRow><p className="font-semibold text-brand-ink">Signup link</p><p className="text-sm text-muted-foreground">{published.signupInviteLink.href}</p><Copy className="size-4 text-muted-foreground" /></LedgerRow>{published.inviteLinks.map((invite) => <LedgerRow key={invite.email}><p className="font-semibold text-brand-ink">{invite.displayName}</p><p className="text-sm text-muted-foreground">{invite.href}</p></LedgerRow>)}</LedgerRows></div></LedgerPanel></PageShell>;
}

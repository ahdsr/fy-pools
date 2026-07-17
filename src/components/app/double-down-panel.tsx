"use client";

import * as React from "react";
import { Clock3, Coins, LockKeyhole, Target, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LedgerPanel } from "@/components/app/ledger";
import type { DoubleDownCallState } from "@/app/pools/[poolSlug]/double-down-actions";
import type { DoubleDownPublicSnapshot } from "@/lib/double-down/persistence";

type DoubleDownPanelProps = {
  snapshot: DoubleDownPublicSnapshot;
  placeCallAction: (state: DoubleDownCallState, formData: FormData) => Promise<DoubleDownCallState>;
};

const outcomeLabel = {
  home: "Home win",
  draw: "Draw",
  away: "Away win",
} as const;

export function DoubleDownPanel({ snapshot, placeCallAction }: DoubleDownPanelProps) {
  const [state, action, pending] = React.useActionState(placeCallAction, {});
  const [now, setNow] = React.useState(() => Date.now());
  const recordedEvents = React.useRef(new Set<string>());
  const { market, viewer } = snapshot;
  const locksAt = new Date(market.locksAt).getTime();
  const opensAt = new Date(market.opensAt).getTime();

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  React.useEffect(() => {
    const record = (eventType: "market_viewed" | "eligible_prompt_viewed" | "reveal_viewed") => {
      const key = `${snapshot.market.id}:${eventType}`;
      if (recordedEvents.current.has(key)) return;
      recordedEvents.current.add(key);
      void fetch("/api/double-down/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ marketId: snapshot.market.id, eventType }),
        keepalive: true,
      });
    };
    record("market_viewed");
    if (snapshot.viewer?.eligible && snapshot.market.status === "open") record("eligible_prompt_viewed");
    if (snapshot.market.status === "locked" || snapshot.market.status === "settled") record("reveal_viewed");
  }, [snapshot.market.id, snapshot.market.status, snapshot.viewer?.eligible]);

  const phase = market.status === "scheduled" ? "Opens" : market.status === "open" ? "Locks" : market.status === "locked" ? "Locked" : "Final";
  const time = market.status === "scheduled" ? opensAt : locksAt;

  return (
    <LedgerPanel
      id="double-down"
      className="scroll-mt-24 border-brand-mark/35"
      title={<span className="inline-flex items-center gap-2"><Target className="size-5 text-brand-mark" /> Double Down <Badge variant="secondary">Pool Credits</Badge></span>}
      description="A non-cash late-race call for players still alive for a payout. It never changes the main pool standings."
      action={<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Clock3 className="size-3.5" />{phase} {formatCountdown(time, now)}</span>}
    >
      <div className="grid border-b bg-surface-ledger/40 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">The next decider</p>
          <h2 className="mt-1 text-xl font-semibold text-brand-ink">{market.homeTeam} vs {market.awayTeam}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{market.detail} · {formatDate(market.locksAt)}</p>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-5 text-brand-ink">{market.impactSummary}</p>
        </div>
        <div className="flex min-w-52 items-center border-t px-5 py-4 md:border-l md:border-t-0">
          {viewer ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">Your chips</p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-semibold text-brand-ink"><Coins className="size-5 text-brand-mark" />{Math.max(0, 3 - viewer.account.chipsSpent)} <span className="text-sm font-medium text-muted-foreground">of 3 left</span></p>
              <p className="mt-1 text-xs text-muted-foreground">{viewer.account.credits} credits · {viewer.account.correctCalls} correct</p>
            </div>
          ) : <p className="text-sm leading-5 text-muted-foreground">Sign in as a pool member to make your call.</p>}
        </div>
      </div>

      <div className="px-5 py-5">
        {market.status === "scheduled" ? <p className="text-sm text-muted-foreground">This market will open 24 hours before kickoff.</p> : null}
        {market.status === "open" ? <CallControls viewer={viewer} market={market} action={action} pending={pending} state={state} /> : null}
        {market.status === "locked" ? <Reveal calls={snapshot.revealedCalls} /> : null}
        {market.status === "settled" ? <Settlement calls={snapshot.revealedCalls} outcome={market.settledOutcome} /> : null}
      </div>

      {snapshot.leaderboard.length ? <DoubleDownBoard snapshot={snapshot} /> : null}
    </LedgerPanel>
  );
}

function CallControls({ viewer, market, action, pending, state }: { viewer: DoubleDownPublicSnapshot["viewer"]; market: DoubleDownPublicSnapshot["market"]; action: (payload: FormData) => void; pending: boolean; state: DoubleDownCallState }) {
  if (!viewer) return <p className="text-sm text-muted-foreground">Sign in as a pool member to use a Double Down chip.</p>;
  if (!viewer.eligible) return <p className="text-sm text-muted-foreground">Double Down is reserved for members still mathematically alive for a payout.</p>;
  if (viewer.call) return <div className="flex items-start gap-3 border-l-2 border-brand-mark bg-cta-green-soft px-4 py-3"><LockKeyhole className="mt-0.5 size-4 shrink-0 text-brand-mark" /><p className="text-sm leading-5 text-brand-ink">You are locked in for <strong>{outcomeLabel[viewer.call.outcome]}</strong>. All calls reveal at kickoff.</p></div>;
  if (viewer.account.chipsSpent >= 3) return <p className="text-sm text-muted-foreground">You have used all three Double Down chips.</p>;

  return (
    <form action={action} onSubmit={(event) => {
      if (!window.confirm("Commit this Double Down call? This uses one chip and cannot be changed.")) event.preventDefault();
    }}>
      <input type="hidden" name="marketId" value={market.id} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-base font-semibold text-brand-ink">Spend one chip on the official result</p><p className="mt-1 text-sm text-muted-foreground">Correct calls earn 2 Pool Credits. Picks stay hidden until lock.</p></div>
        <div className="flex flex-wrap gap-2">
          {market.availableOutcomes.map((outcome) => <Button key={outcome} type="submit" name="outcome" value={outcome} variant="secondaryGreen" disabled={pending}>{pending ? "Committing…" : outcome === "home" ? `${market.homeTeam} win` : outcome === "away" ? `${market.awayTeam} win` : "Draw"}</Button>)}
        </div>
      </div>
      {state.message ? <p className="mt-3 text-sm text-destructive" role="alert">{state.message}</p> : null}
      {state.committed ? <p className="mt-3 text-sm text-brand-mark" role="status">Your call is committed.</p> : null}
    </form>
  );
}

function Reveal({ calls }: { calls: DoubleDownPublicSnapshot["revealedCalls"] }) {
  return <div><p className="text-base font-semibold text-brand-ink">Calls are in</p><p className="mt-1 text-sm text-muted-foreground">The market is locked; official results will award credits.</p><CallList calls={calls} /></div>;
}

function Settlement({ calls, outcome }: { calls: DoubleDownPublicSnapshot["revealedCalls"]; outcome: DoubleDownPublicSnapshot["market"]["settledOutcome"] }) {
  return <div><p className="text-base font-semibold text-brand-ink">Official result: {outcome ? outcomeLabel[outcome] : "Pending"}</p><p className="mt-1 text-sm text-muted-foreground">Correct calls earned two Pool Credits. The main leaderboard is unchanged.</p><CallList calls={calls} /></div>;
}

function CallList({ calls }: { calls: DoubleDownPublicSnapshot["revealedCalls"] }) {
  if (!calls.length) return <p className="mt-4 text-sm text-muted-foreground">No Double Down calls were placed.</p>;
  return <div className="mt-4 divide-y border-y">{calls.map((call) => <div key={call.memberId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm"><span className="font-medium text-brand-ink">{call.memberName}</span><span className="text-muted-foreground">{outcomeLabel[call.outcome]}{call.creditsAwarded ? " · +2 credits" : ""}</span></div>)}</div>;
}

function DoubleDownBoard({ snapshot }: { snapshot: DoubleDownPublicSnapshot }) {
  const leaders = new Set(snapshot.clutchCallerMemberIds);
  return <div className="border-t"><div className="flex items-center justify-between gap-3 bg-surface-ledger/40 px-5 py-3"><div><p className="text-sm font-semibold text-brand-ink">Double Down board</p><p className="text-xs text-muted-foreground">Separate from pool points and prizes</p></div><Trophy className="size-4 text-brand-mark" /></div><div className="divide-y">{snapshot.leaderboard.map((account) => <div key={account.memberId} className="flex items-center justify-between gap-4 px-5 py-3 text-sm"><span className="font-medium text-brand-ink">{account.name}{leaders.has(account.memberId) ? <span className="ml-2 text-xs font-semibold text-brand-mark">Clutch Caller</span> : null}</span><span className="text-muted-foreground">{account.credits} credits · {account.correctCalls} correct · {account.chipsRemaining} chips left</span></div>)}</div></div>;
}

function formatDate(value: string) { return new Intl.DateTimeFormat("en-CA", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(value)); }
function formatCountdown(target: number, now: number) { const remaining = Math.max(0, target - now); if (remaining === 0) return "now"; const minutes = Math.ceil(remaining / 60_000); if (minutes >= 60) return `in ${Math.floor(minutes / 60)}h ${minutes % 60}m`; return `in ${minutes}m`; }

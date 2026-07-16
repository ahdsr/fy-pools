"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PlayCircle } from "lucide-react";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createNbaSimulation } from "@/lib/nba-series/draft";
import type { NbaSeriesSettings } from "@/lib/nba-series/types";
import {
  getNextPlayableSeries,
  resolveBracketSimulation,
} from "@/lib/templates/bracket-simulation";
import {
  resetNbaSeriesSimulationAction,
  simulateNbaSeriesAction,
  type SimulateNbaSeriesState,
} from "./nba-actions";

export function NbaSeriesCommissioner({
  poolId,
  poolName,
  settings,
}: {
  poolId: string;
  poolName: string;
  settings: NbaSeriesSettings;
}) {
  const router = useRouter();
  const [state, action, pending] = React.useActionState<
    SimulateNbaSeriesState,
    FormData
  >(simulateNbaSeriesAction, {});
  const [resetState, resetAction, resetPending] = React.useActionState<
    SimulateNbaSeriesState,
    FormData
  >(resetNbaSeriesSimulationAction, {});
  const simulation = createNbaSimulation(settings);
  const next = getNextPlayableSeries(simulation);
  const [winner, setWinner] = React.useState("");
  const [loserWins, setLoserWins] = React.useState("0");

  React.useEffect(() => {
    if (state.completed || resetState.completed) router.refresh();
  }, [resetState.completed, router, state.completed]);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
      <LedgerPanel
        title={`${poolName} simulator`}
        description="Enter one completed best-of-seven series at a time. The next matchup unlocks only after its feeder series are resolved."
      >
        <LedgerRows>
          {resolveBracketSimulation(simulation).map((series) => (
            <LedgerRow
              key={series.id}
              className="grid gap-2 sm:grid-cols-[10rem_1fr_auto] sm:items-center"
            >
              <p className="font-semibold text-brand-ink">{series.label}</p>
              <p className="text-sm text-muted-foreground">
                {series.homeTeam && series.awayTeam
                  ? `${series.homeTeam} vs ${series.awayTeam}`
                  : "Awaiting feeder series"}
              </p>
              {series.result ? (
                <Badge variant="secondary">
                  {series.result.winner} {series.result.winnerWins}–
                  {series.result.loserWins}
                </Badge>
              ) : (
                <Badge variant="outline">Pending</Badge>
              )}
            </LedgerRow>
          ))}
        </LedgerRows>
      </LedgerPanel>

      <LedgerPanel
        title="Simulate next series"
        description="This updates the saved bracket and recalculates standings."
      >
        <form action={action} className="space-y-4 p-5">
          <input type="hidden" name="poolId" value={poolId} />
          <input
            type="hidden"
            name="result"
            value={JSON.stringify(
              next && winner
                ? {
                    seriesId: next.id,
                    winner,
                    winnerWins: 4,
                    loserWins: Number(loserWins),
                  }
                : {},
            )}
          />
          {next ? (
            <>
              <p className="font-semibold text-brand-ink">{next.label}</p>
              <p className="text-sm text-muted-foreground">
                {next.homeTeam} vs {next.awayTeam}
              </p>
              <Select value={winner} onValueChange={setWinner}>
                <SelectTrigger>
                  <SelectValue placeholder="Winning team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={next.homeTeam!}>{next.homeTeam}</SelectItem>
                  <SelectItem value={next.awayTeam!}>{next.awayTeam}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={loserWins} onValueChange={setLoserWins}>
                <SelectTrigger>
                  <SelectValue placeholder="Losing games" />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3].map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      Winner 4–{value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" variant="primaryGreen" disabled={!winner || pending}>
                {pending ? "Saving…" : "Record series result"} <PlayCircle />
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              The NBA champion has been decided.
            </p>
          )}
          {state.message ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {state.message}
            </p>
          ) : null}
        </form>

        <form action={resetAction} className="border-t p-5">
          <input type="hidden" name="poolId" value={poolId} />
          <p className="mb-3 text-sm leading-6 text-muted-foreground">
            Clear all simulated outcomes and rebuild the standings from zero.
          </p>
          <Button
            type="submit"
            variant="outline"
            disabled={Object.keys(settings.results).length === 0 || resetPending}
          >
            {resetPending ? "Resetting…" : "Reset simulation"}
          </Button>
          {resetState.message ? (
            <p role="alert" className="mt-3 text-sm font-medium text-destructive">
              {resetState.message}
            </p>
          ) : null}
        </form>
      </LedgerPanel>
    </div>
  );
}

"use client";

import { CheckCircle2 } from "lucide-react";
import * as React from "react";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  getEnabledRoundOf16BonusProps,
  type RoundOf16PickPayload,
  type RoundOf16PoolSettings,
  type RoundOf16MatchupDraft,
} from "@/lib/templates/round-of-16-draft";
import { submitRoundOf16PicksAction } from "./actions";

type RoundOf16PickFormProps = {
  inviteCode: string;
  poolName: string;
  settings: RoundOf16PoolSettings;
  initialPayload?: RoundOf16PickPayload;
  existingSubmittedAt?: string;
};

function formatPickDeadline(settings: RoundOf16PoolSettings) {
  const deadline = settings.basics.picksLockAt;
  if (!deadline) return "before the round starts";

  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) return deadline;

  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function matchupSide(index: number) {
  return index < 4 ? "left" : "right";
}

function BracketTeamButton({
  team,
  selected,
  onSelect,
}: {
  team: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex min-h-10 w-full items-center justify-between gap-3 border-t px-3 py-2 text-left text-sm font-semibold text-brand-ink transition first:border-t-0 hover:bg-cta-green-soft",
        selected && "bg-cta-green-soft text-brand-ink",
      )}
    >
      <span className="min-w-0 truncate">{team}</span>
      {selected ? (
        <CheckCircle2 className="size-4 shrink-0 text-brand-success" />
      ) : null}
    </button>
  );
}

function BracketMatchCard({
  matchup,
  index,
  winner,
  onWinnerChange,
}: {
  matchup: RoundOf16MatchupDraft;
  index: number;
  winner?: string;
  onWinnerChange: (winner: string) => void;
}) {
  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-1/2 hidden h-px w-4 -translate-y-px border-t border-brand-rule/70 lg:block",
          matchupSide(index) === "left"
            ? "left-full"
            : "right-full",
        )}
      />
      <article
        className={cn(
          "overflow-hidden rounded-lg border bg-background shadow-sm",
          winner && "border-primary/45 ring-1 ring-primary/15",
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b bg-surface-ledger/60 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            Match {index + 1}
          </p>
          {winner ? (
            <span className="text-xs font-semibold text-brand-success">
              Picked
            </span>
          ) : null}
        </div>
        <BracketTeamButton
          team={matchup.teamOne}
          selected={winner === matchup.teamOne}
          onSelect={() => onWinnerChange(matchup.teamOne)}
        />
        <BracketTeamButton
          team={matchup.teamTwo}
          selected={winner === matchup.teamTwo}
          onSelect={() => onWinnerChange(matchup.teamTwo)}
        />
      </article>
    </div>
  );
}

function WinnerColumn({
  matchups,
  winners,
}: {
  matchups: RoundOf16MatchupDraft[];
  winners: Record<string, string>;
}) {
  return (
    <div className="rounded-lg border bg-background shadow-sm">
      <div className="border-b bg-surface-ledger/60 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          Your Round of 16 winners
        </p>
      </div>
      <div className="grid divide-y">
        {matchups.map((matchup, index) => {
          const winner = winners[matchup.id];

          return (
            <div key={matchup.id} className="min-h-11 px-3 py-2">
              <p className="text-[0.68rem] font-medium uppercase tracking-normal text-muted-foreground">
                Match {index + 1}
              </p>
              <p
                className={cn(
                  "mt-0.5 truncate text-sm font-semibold",
                  winner ? "text-brand-ink" : "text-muted-foreground",
                )}
              >
                {winner || "No pick yet"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoundOf16BracketPicker({
  matchups,
  winners,
  onWinnerChange,
}: {
  matchups: RoundOf16MatchupDraft[];
  winners: Record<string, string>;
  onWinnerChange: (matchupId: string, winner: string) => void;
}) {
  const leftMatchups = matchups.slice(0, 4);
  const rightMatchups = matchups.slice(4);

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[58rem] gap-5 p-1 lg:grid-cols-[minmax(0,1fr)_17rem_minmax(0,1fr)] lg:items-center">
        <div className="grid gap-4">
          {leftMatchups.map((matchup, index) => (
            <BracketMatchCard
              key={matchup.id}
              matchup={matchup}
              index={index}
              winner={winners[matchup.id]}
              onWinnerChange={(winner) => onWinnerChange(matchup.id, winner)}
            />
          ))}
        </div>
        <WinnerColumn matchups={matchups} winners={winners} />
        <div className="grid gap-4">
          {rightMatchups.map((matchup, index) => {
            const matchIndex = index + 4;

            return (
              <BracketMatchCard
                key={matchup.id}
                matchup={matchup}
                index={matchIndex}
                winner={winners[matchup.id]}
                onWinnerChange={(winner) => onWinnerChange(matchup.id, winner)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function RoundOf16PickForm({
  inviteCode,
  poolName,
  settings,
  initialPayload,
  existingSubmittedAt,
}: RoundOf16PickFormProps) {
  const [state, formAction, pending] = React.useActionState(
    submitRoundOf16PicksAction,
    {},
  );
  const [winners, setWinners] = React.useState<Record<string, string>>(
    () => initialPayload?.winners ?? {},
  );
  const [bonusAnswers, setBonusAnswers] = React.useState<Record<string, string>>(
    () => initialPayload?.bonusAnswers ?? {},
  );
  const enabledBonusProps = getEnabledRoundOf16BonusProps(settings);
  const hasExistingSubmission = Boolean(existingSubmittedAt || state.submitted);
  const payload: RoundOf16PickPayload = {
    winners,
    bonusAnswers,
  };
  const complete =
    settings.matchups.every((matchup) => winners[matchup.id]) &&
    enabledBonusProps.every((prop) =>
      String(bonusAnswers[prop.id] ?? "").trim(),
    );

  return (
    <div className="space-y-5">
      {state.submitted ? (
        <LedgerPanel
          title="Picks submitted"
          description={`You can resubmit changes until ${formatPickDeadline(settings)}.`}
          action={<CheckCircle2 className="size-5 text-brand-success" />}
        >
          <LedgerRow>
            <p className="font-semibold text-brand-ink">{poolName}</p>
            <p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">
              Submitted at {new Date(state.submitted.submittedAt).toLocaleString()}.
            </p>
          </LedgerRow>
        </LedgerPanel>
      ) : existingSubmittedAt ? (
        <LedgerPanel
          title="Editing submitted picks"
          description={`Your saved picks are loaded. Changes are open until ${formatPickDeadline(settings)}.`}
          action={<CheckCircle2 className="size-5 text-brand-success" />}
        >
          <LedgerRow>
            <p className="font-semibold text-brand-ink">{poolName}</p>
            <p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">
              Last submitted at {new Date(existingSubmittedAt).toLocaleString()}.
            </p>
          </LedgerRow>
        </LedgerPanel>
      ) : null}

      <form action={formAction} className="space-y-5">
        <input type="hidden" name="inviteCode" value={inviteCode} />
        <input type="hidden" name="payload" value={JSON.stringify(payload)} />

        <LedgerPanel
          title="Bracket picks"
          description={`Choose one winner from each matchup. Picks lock ${formatPickDeadline(settings)}.`}
        >
          <div className="p-4">
            <RoundOf16BracketPicker
              matchups={settings.matchups}
              winners={winners}
              onWinnerChange={(matchupId, winner) =>
                setWinners((current) => ({
                  ...current,
                  [matchupId]: winner,
                }))
              }
            />
          </div>
        </LedgerPanel>

        <LedgerPanel
          title="Bonus props"
          description="Answer each enabled prop before submitting."
        >
          <LedgerRows>
            {enabledBonusProps.map((prop) => (
              <LedgerRow key={prop.id} className="grid gap-2 md:grid-cols-[1fr_16rem] md:items-center">
                <div>
                  <Label htmlFor={`bonus-${prop.id}`}>{prop.label}</Label>
                  <p className="mt-1 text-xs font-normal text-muted-foreground">
                    {prop.points} points
                  </p>
                </div>
                <Input
                  id={`bonus-${prop.id}`}
                  type={prop.id === "penalty-decisions" ? "number" : "text"}
                  min={0}
                  value={bonusAnswers[prop.id] ?? ""}
                  onChange={(event) =>
                    setBonusAnswers((current) => ({
                      ...current,
                      [prop.id]: event.target.value,
                    }))
                  }
                  required
                />
              </LedgerRow>
            ))}
          </LedgerRows>
        </LedgerPanel>

        {state.message ? (
          <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {state.message}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primaryGreen"
            disabled={!complete || pending}
          >
            {pending
              ? "Submitting..."
              : hasExistingSubmission
                ? "Update picks"
                : "Submit picks"}{" "}
            <CheckCircle2 />
          </Button>
        </div>
      </form>
    </div>
  );
}

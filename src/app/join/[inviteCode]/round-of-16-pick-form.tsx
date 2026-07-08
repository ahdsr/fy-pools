"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import * as React from "react";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { TeamPill } from "@/components/app/pool-public-widgets";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { signInPathFor, signUpPathFor } from "@/lib/auth/paths";
import { normalizeEmailAddress } from "@/lib/email";
import { cn } from "@/lib/utils";
import {
  getEnabledRoundOf16BonusProps,
  type RoundOf16PickPayload,
  type RoundOf16PoolSettings,
  type RoundOf16MatchupDraft,
} from "@/lib/templates/round-of-16-draft";
import {
  submitRoundOf16PicksAction,
  submitRoundOf16TestPicksAction,
} from "./actions";

type RoundOf16PickFormProps = {
  inviteCode: string;
  poolName: string;
  poolSlug: string;
  settings: RoundOf16PoolSettings;
  initialPayload?: RoundOf16PickPayload;
  existingSubmittedAt?: string;
  testGuestMode?: boolean;
};

const TEAM_BONUS_PROP_IDS = new Set([
  "most-goals-team",
  "biggest-upset",
  "most-clean-sheets",
]);

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

function roundOf16Teams(settings: RoundOf16PoolSettings) {
  return Array.from(
    new Set(
      settings.matchups.flatMap((matchup) =>
        [matchup.teamOne, matchup.teamTwo].filter(Boolean),
      ),
    ),
  );
}

function matchupSide(index: number) {
  return index < 4 ? "left" : "right";
}

function BracketTeamButton({
  id,
  name,
  team,
  selected,
  onSelect,
}: {
  id: string;
  name: string;
  team: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex min-h-10 w-full cursor-pointer items-center justify-between gap-3 border-t px-3 py-2 text-left text-sm font-semibold text-brand-ink transition first:border-t-0 hover:bg-cta-green-soft focus-within:outline-none focus-within:ring-3 focus-within:ring-ring/25",
        selected && "bg-cta-green-soft text-brand-ink",
      )}
    >
      <input
        id={id}
        type="radio"
        name={name}
        value={team}
        checked={selected}
        onChange={onSelect}
        className="sr-only"
      />
      <span className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded-full border border-muted-foreground/55 bg-background",
            selected && "border-brand-success",
          )}
        >
          {selected ? (
            <span className="size-2 rounded-full bg-brand-success" />
          ) : null}
        </span>
        <TeamPill
          team={team}
          className={cn(
            "max-w-full",
            selected ? "font-bold" : "text-brand-ink",
          )}
        />
      </span>
      {selected ? (
        <CheckCircle2 className="size-4 shrink-0 text-brand-success" />
      ) : null}
    </label>
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
        <div role="radiogroup" aria-label={`Match ${index + 1} winner`}>
          <BracketTeamButton
            id={`${matchup.id}-team-one`}
            name={`winner-${matchup.id}`}
            team={matchup.teamOne}
            selected={winner === matchup.teamOne}
            onSelect={() => onWinnerChange(matchup.teamOne)}
          />
          <BracketTeamButton
            id={`${matchup.id}-team-two`}
            name={`winner-${matchup.id}`}
            team={matchup.teamTwo}
            selected={winner === matchup.teamTwo}
            onSelect={() => onWinnerChange(matchup.teamTwo)}
          />
        </div>
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
              {winner ? (
                <TeamPill team={winner} className="mt-0.5 max-w-full text-sm" />
              ) : (
                <p className="mt-0.5 truncate text-sm font-semibold text-muted-foreground">
                  No pick yet
                </p>
              )}
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
  const pickedCount = matchups.filter((matchup) => winners[matchup.id]).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 rounded-lg border bg-surface-ledger/60 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-brand-ink">
          {pickedCount} of {matchups.length} winners picked
        </p>
        <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
          Tap a team to change your pick
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_17rem_minmax(0,1fr)] lg:items-center">
        <div className="grid min-w-0 gap-4">
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
        <div className="order-last lg:order-none">
          <WinnerColumn matchups={matchups} winners={winners} />
        </div>
        <div className="grid min-w-0 gap-4">
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
  poolSlug,
  settings,
  initialPayload,
  existingSubmittedAt,
  testGuestMode = false,
}: RoundOf16PickFormProps) {
  const [state, formAction, pending] = React.useActionState(
    testGuestMode ? submitRoundOf16TestPicksAction : submitRoundOf16PicksAction,
    {},
  );
  const [displayName, setDisplayName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [dismissedSubmissionAt, setDismissedSubmissionAt] = React.useState("");
  const [winners, setWinners] = React.useState<Record<string, string>>(
    () => initialPayload?.winners ?? {},
  );
  const [bonusAnswers, setBonusAnswers] = React.useState<Record<string, string>>(
    () => initialPayload?.bonusAnswers ?? {},
  );
  const enabledBonusProps = getEnabledRoundOf16BonusProps(settings);
  const teamOptions = React.useMemo(() => roundOf16Teams(settings), [settings]);
  const hasExistingSubmission = Boolean(existingSubmittedAt || state.submitted);
  const joinPath = `/join/${encodeURIComponent(inviteCode)}`;
  const publicPoolPath = `/pools/${poolSlug}`;
  const submittedAt = state.submitted?.submittedAt ?? "";
  const successOpen = Boolean(
    submittedAt && dismissedSubmissionAt !== submittedAt,
  );
  const duplicateEmail = state.duplicateEmail ?? "";
  const duplicateEmailActive =
    testGuestMode &&
    duplicateEmail &&
    normalizeEmailAddress(email) === normalizeEmailAddress(duplicateEmail);
  const payload: RoundOf16PickPayload = {
    winners,
    bonusAnswers,
  };
  const complete =
    settings.matchups.every((matchup) => winners[matchup.id]) &&
    enabledBonusProps.every((prop) =>
      String(bonusAnswers[prop.id] ?? "").trim(),
    ) &&
    !duplicateEmailActive &&
    (!testGuestMode ||
      (displayName.trim().length > 0 && email.trim().length > 0));

  return (
    <div className="space-y-5">
      <Dialog
        open={successOpen}
        onOpenChange={(open) => {
          if (!open && submittedAt) setDismissedSubmissionAt(submittedAt);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Picks submitted</DialogTitle>
            <DialogDescription>
              {testGuestMode
                ? "Your picks are tied to the email you entered. Create or sign in with that same email to claim and update them later."
                : `Your picks for ${poolName} were saved. You can update them until ${formatPickDeadline(settings)}.`}
            </DialogDescription>
          </DialogHeader>
          {state.submitted ? (
            <p className="rounded-lg border bg-surface-ledger/70 px-3 py-2 text-sm font-medium text-brand-ink">
              Submitted {new Date(state.submitted.submittedAt).toLocaleString()}
            </p>
          ) : null}
          <DialogFooter>
            {testGuestMode ? (
              <>
                <Button asChild variant="ghost">
                  <Link href={publicPoolPath}>View pool</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={signInPathFor(joinPath)}>Sign in</Link>
                </Button>
                <Button asChild variant="primaryGreen">
                  <Link href={signUpPathFor(joinPath)}>Create account to claim</Link>
                </Button>
              </>
            ) : (
              <>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Keep editing
                  </Button>
                </DialogClose>
                <Button asChild variant="primaryGreen">
                  <Link href={publicPoolPath}>View pool</Link>
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

        {testGuestMode ? (
          <LedgerPanel
            title="Entry details"
            description="Use one email per entry. If that email already has picks, sign in or create an account with it to claim them."
          >
            <LedgerRow className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="test-display-name">Display name</Label>
                <Input
                  id="test-display-name"
                  name="displayName"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Lucas"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-email">Email</Label>
                <Input
                  id="test-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </LedgerRow>
            {duplicateEmailActive ? (
              <LedgerRow className="border-t bg-destructive/5" role="alert">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-destructive">
                      This email already has picks
                    </p>
                    <p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">
                      {state.duplicateEmailClaimed
                        ? "Sign in with this email to update the existing entry."
                        : "Create an account or sign in with this email to claim and update the existing entry."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline">
                      <Link href={signInPathFor(joinPath)}>Sign in</Link>
                    </Button>
                    {!state.duplicateEmailClaimed ? (
                      <Button asChild variant="primaryGreen">
                        <Link href={signUpPathFor(joinPath)}>
                          Create account to claim
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </LedgerRow>
            ) : null}
          </LedgerPanel>
        ) : null}

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
                {TEAM_BONUS_PROP_IDS.has(prop.id) ? (
                  <Select
                    value={bonusAnswers[prop.id] ?? ""}
                    onValueChange={(value) =>
                      setBonusAnswers((current) => ({
                        ...current,
                        [prop.id]: value,
                      }))
                    }
                  >
                    <SelectTrigger id={`bonus-${prop.id}`} className="w-full">
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamOptions.map((team) => (
                        <SelectItem key={team} value={team}>
                          <TeamPill team={team} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
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
                )}
              </LedgerRow>
            ))}
          </LedgerRows>
        </LedgerPanel>

        {state.message && !duplicateEmailActive ? (
          <p
            className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
            role="alert"
          >
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
              : testGuestMode
                ? "Submit test picks"
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

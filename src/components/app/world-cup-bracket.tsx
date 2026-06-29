import type { CSSProperties } from "react";

import {
  TeamPill,
  StatusBadge,
} from "@/components/app/pool-public-widgets";
import type {
  BracketMatch,
  BracketRound,
} from "@/lib/world-cup-pool/bracket";
import { displayTeamName } from "@/lib/world-cup-pool/scoring";
import type { EntryPicks } from "@/lib/world-cup-pool/types";
import { cn } from "@/lib/utils";

type WorldCupBracketProps = {
  rounds: BracketRound[];
  thirdPlace?: BracketMatch;
  picks?: EntryPicks;
};

const ROUND_SPANS = [2, 4, 8, 16, 32] as const;

function gridRowFor(
  roundIndex: number,
  matchIndex: number,
  options: { hasThirdPlace?: boolean; isFinal?: boolean } = {},
) {
  if (options.hasThirdPlace && options.isFinal) {
    return "9 / span 16";
  }

  const span = ROUND_SPANS[roundIndex] ?? 2;
  return `${matchIndex * span + 1} / span ${span}`;
}

function hasKnownWinner(match: BracketMatch) {
  return match.teams.some((team) => team.winner);
}

function bracketPlaceholder(roundLabel: string, matchLabel: string, index: number) {
  const parsedIndex = matchLabel.match(/^(\d+)\./)?.[1] ?? String(index + 1);

  if (/quarter/i.test(roundLabel)) {
    return `Quarterfinal ${parsedIndex} Winner`;
  }

  if (/semi/i.test(roundLabel)) {
    return `Semifinal ${parsedIndex} Winner`;
  }

  return `${roundLabel} ${parsedIndex} Winner`;
}

function normalizeBracketText(value: string) {
  return value.trim().replaceAll("-", "").replace(/\s+/g, " ").toLowerCase();
}

function matchFeedsTarget({
  match,
  roundLabel,
  matchIndex,
  target,
}: {
  match: BracketMatch;
  roundLabel: string;
  matchIndex: number;
  target: string;
}) {
  const normalizedTarget = normalizeBracketText(target);
  const placeholder = bracketPlaceholder(roundLabel, match.label, matchIndex);
  const winner = match.teams.find((team) => team.winner)?.name;

  return [
    placeholder,
    winner,
    ...match.teams.map((team) => team.name),
  ].some((value) => value && normalizeBracketText(value) === normalizedTarget);
}

function orderRoundByNextRound(
  round: BracketRound,
  nextRound: BracketRound,
): BracketRound {
  const remaining = round.matches.map((match, index) => ({ match, index }));
  const ordered: BracketMatch[] = [];

  for (const target of nextRound.matches.flatMap((match) => match.teams)) {
    const matchIndex = remaining.findIndex(({ match, index }) =>
      matchFeedsTarget({
        match,
        roundLabel: round.label,
        matchIndex: index,
        target: target.name,
      }),
    );

    if (matchIndex === -1) {
      continue;
    }

    ordered.push(remaining[matchIndex].match);
    remaining.splice(matchIndex, 1);
  }

  return {
    ...round,
    matches: [...ordered, ...remaining.map(({ match }) => match)],
  };
}

function orderRoundsForBracket(rounds: BracketRound[]) {
  const ordered = rounds.slice();

  for (let index = ordered.length - 2; index >= 0; index -= 1) {
    ordered[index] = orderRoundByNextRound(ordered[index], ordered[index + 1]);
  }

  return ordered;
}

function BracketConnectors({
  hasInput,
  hasOutput,
  isUpperBranch,
  active,
}: {
  hasInput?: boolean;
  hasOutput?: boolean;
  isUpperBranch?: boolean;
  active?: boolean;
}) {
  const lineClass = active
    ? "border-cta-green"
    : "border-brand-rule/70";

  return (
    <>
      {hasInput ? (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute right-full top-1/2 z-0 h-px w-5 -translate-y-px border-t",
            lineClass,
          )}
        />
      ) : null}
      {hasOutput ? (
        <>
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute left-full top-1/2 z-0 h-px w-5 -translate-y-px border-t",
              lineClass,
            )}
          />
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute left-[calc(100%+1.25rem)] z-0 h-full border-l",
              isUpperBranch ? "top-1/2" : "bottom-1/2",
              lineClass,
            )}
          />
        </>
      ) : null}
    </>
  );
}

function MatchSlot({
  match,
  picks,
  isFinal,
  style,
  hasInput,
  hasOutput,
  matchIndex,
}: {
  match: BracketMatch;
  picks?: EntryPicks;
  isFinal?: boolean;
  style?: CSSProperties;
  hasInput?: boolean;
  hasOutput?: boolean;
  matchIndex: number;
}) {
  return (
    <div
      style={style}
      className="relative flex min-h-24 items-center overflow-visible"
    >
      <BracketConnectors
        hasInput={hasInput}
        hasOutput={hasOutput}
        isUpperBranch={matchIndex % 2 === 0}
        active={hasKnownWinner(match)}
      />
      <MatchCard match={match} picks={picks} isFinal={isFinal} />
    </div>
  );
}

function MatchCard({
  match,
  picks,
  isFinal,
}: {
  match: BracketMatch;
  picks?: EntryPicks;
  isFinal?: boolean;
}) {
  const winnerKnown = hasKnownWinner(match);
  const showPendingStatus = !winnerKnown;
  const showChampion = isFinal && winnerKnown;

  return (
    <article
      className={cn(
        "relative z-10 w-full rounded-lg border bg-background shadow-sm",
        isFinal && "border-primary/35 bg-cta-green-soft",
      )}
    >
      <div className="divide-y">
        {match.teams.map((team, index) => (
          <div
            key={`${match.id}-${team.name}-${index}`}
            className={cn(
              "flex min-h-10 items-center justify-between gap-3 px-3 py-2 text-sm",
              team.winner && "bg-cta-green-soft/75",
            )}
          >
            <TeamPill
              team={team.name}
              picks={picks}
              className={cn(
                "max-w-[11rem]",
                team.winner ? "font-bold" : "text-muted-foreground",
              )}
            />
            {team.score !== undefined ? (
              <span
                className={cn(
                  "shrink-0 tabular-nums text-muted-foreground",
                  team.winner && "font-bold text-brand-ink",
                )}
              >
                {team.score ?? "-"}
              </span>
            ) : null}
          </div>
        ))}
      </div>
      {showPendingStatus || showChampion ? (
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          {showPendingStatus ? (
            <StatusBadge
              label={match.detail ?? "TBD"}
              tone="neutral"
              className="max-w-full"
            />
          ) : null}
          {showChampion ? (
            <span className="truncate text-xs font-semibold text-brand-ink">
              {displayTeamName(
                match.teams.find((team) => team.winner)?.name ?? "Champion",
              )}
            </span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function WorldCupBracket({
  rounds,
  thirdPlace,
  picks,
}: WorldCupBracketProps) {
  const displayRounds = orderRoundsForBracket(rounds);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[106rem] p-8">
        <div
          className="grid grid-cols-5 gap-x-10"
          style={{ gridTemplateRows: "repeat(32, minmax(3.5rem, auto))" }}
        >
          {displayRounds.flatMap((round, roundIndex) =>
            round.matches.map((match, matchIndex) => (
              <MatchSlot
                key={match.id}
                match={match}
                picks={picks}
                isFinal={round.key === "final"}
                hasInput={roundIndex > 0}
                hasOutput={round.key !== "final"}
                matchIndex={matchIndex}
                style={{
                  gridColumn: roundIndex + 1,
                  gridRow: gridRowFor(roundIndex, matchIndex, {
                    hasThirdPlace: Boolean(thirdPlace),
                    isFinal: round.key === "final",
                  }),
                }}
              />
            )),
          )}
          {thirdPlace ? (
            <MatchSlot
              match={thirdPlace}
              picks={picks}
              matchIndex={0}
              style={{
                gridColumn: displayRounds.length,
                gridRow: "25 / span 8",
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

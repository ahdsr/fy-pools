import { Trophy } from "lucide-react";
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
    return "1 / span 16";
  }

  const span = ROUND_SPANS[roundIndex] ?? 2;
  return `${matchIndex * span + 1} / span ${span}`;
}

function hasKnownWinner(match: BracketMatch) {
  return match.teams.some((team) => team.winner);
}

function MatchCard({
  match,
  picks,
  isFinal,
  style,
}: {
  match: BracketMatch;
  picks?: EntryPicks;
  isFinal?: boolean;
  style?: CSSProperties;
}) {
  return (
    <article
      style={style}
      className={cn(
        "relative self-center rounded-lg border bg-background shadow-sm",
        isFinal && "border-primary/35 bg-cta-green-soft",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          {match.label}
        </p>
        {isFinal ? (
          <Trophy className="size-4 shrink-0 text-brand-mark" aria-hidden />
        ) : null}
      </div>
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
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <StatusBadge
          label={hasKnownWinner(match) ? "Winner set" : match.detail ?? "TBD"}
          tone={hasKnownWinner(match) ? "helpful" : "neutral"}
          className="max-w-full"
        />
        {isFinal && hasKnownWinner(match) ? (
          <span className="truncate text-xs font-semibold text-brand-ink">
            {displayTeamName(
              match.teams.find((team) => team.winner)?.name ?? "Champion",
            )}
          </span>
        ) : null}
      </div>
    </article>
  );
}

export function WorldCupBracket({
  rounds,
  thirdPlace,
  picks,
}: WorldCupBracketProps) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[88rem] p-5">
        <div className="mb-4 grid grid-cols-5 gap-4">
          {rounds.map((round) => (
            <div
              key={round.key}
              className="rounded-lg border bg-surface-ledger px-3 py-2"
            >
              <p className="text-sm font-semibold text-brand-ink">
                {round.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {round.matches.length}{" "}
                {round.matches.length === 1 ? "match" : "matches"}
              </p>
            </div>
          ))}
        </div>

        <div
          className="grid grid-cols-5 gap-x-4"
          style={{ gridTemplateRows: "repeat(32, minmax(2.75rem, auto))" }}
        >
          {rounds.flatMap((round, roundIndex) =>
            round.matches.map((match, matchIndex) => (
              <MatchCard
                key={match.id}
                match={match}
                picks={picks}
                isFinal={round.key === "final"}
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
            <MatchCard
              match={thirdPlace}
              picks={picks}
              style={{
                gridColumn: rounds.length,
                gridRow: "17 / span 16",
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

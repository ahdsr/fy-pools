"use client";

import { useCallback, useMemo, useState } from "react";
import { Flag, RotateCcw } from "lucide-react";

import { LedgerPanel } from "@/components/app/ledger";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  buildTournamentRaceModel,
  type TournamentRaceCheckpoint,
  type TournamentRaceEntry,
  type TournamentRaceMatch,
  type TournamentRaceSelections,
} from "@/lib/world-cup-pool/tournament-race";
import type {
  EntriesConfig,
  EntryPicks,
  PoolResults,
} from "@/lib/world-cup-pool/types";
import { cn } from "@/lib/utils";

const RACE_COLORS = [
  "#0d6b5d",
  "#d65a31",
  "#4059ad",
  "#9b3a7a",
  "#90721c",
  "#2074a0",
  "#7b4f2b",
  "#5e527f",
  "#3e7d46",
  "#a14747",
] as const;

const STAGE_ORDER = ["quarterFinal", "semiFinal", "thirdPlace", "final", "knockout"] as const;

type TournamentRaceProps = {
  entriesConfig: EntriesConfig;
  picksByPath: [string, EntryPicks][];
  results: PoolResults;
  referencePicks: EntryPicks;
};

export function TournamentRace({
  entriesConfig,
  picksByPath,
  results,
  referencePicks,
}: TournamentRaceProps) {
  const [selections, setSelections] = useState<TournamentRaceSelections>({});
  const picks = useMemo(() => new Map(picksByPath), [picksByPath]);
  const model = useMemo(
    () =>
      buildTournamentRaceModel({
        entriesConfig,
        picksByPath: picks,
        results,
        referencePicks,
        selections,
      }),
    [entriesConfig, picks, referencePicks, results, selections],
  );

  const chooseWinner = useCallback(
    (matchId: string, winner: string) => {
      setSelections((current) => {
        const next = buildTournamentRaceModel({
          entriesConfig,
          picksByPath: picks,
          results,
          referencePicks,
          selections: { ...current, [matchId]: winner },
        });
        return next?.normalizedSelections ?? {};
      });
    },
    [entriesConfig, picks, referencePicks, results],
  );

  if (!model) return null;

  return (
    <LedgerPanel
      id="tournament-race"
      className="scroll-mt-24"
      title={
        <span className="inline-flex items-center gap-2">
          Tournament race
          <Badge variant="secondary">What if?</Badge>
        </span>
      }
      description="Choose the remaining winners, then watch the live top 10 race toward first place. These picks stay only in this browser tab."
      action={
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!model.selectionCount}
          onClick={() => setSelections({})}
        >
          <RotateCcw />
          Reset race
        </Button>
      }
    >
      <div className="border-b bg-background/65 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Pick the knockout path
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {model.selectionCount} of {model.totalSelectableMatches} remaining results chosen
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border bg-surface-paper px-3 py-1.5 text-xs font-semibold text-brand-ink">
            <Flag className="size-3.5 text-brand-mark" />
            Official results stay locked
          </div>
        </div>
      </div>

      <BracketPicker matches={model.matches} onChooseWinner={chooseWinner} />

      <div className="border-t bg-surface-ledger/35 px-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Race to #1
            </p>
            <h3 className="mt-1 text-lg font-semibold text-brand-ink">
              The projected photo finish
            </h3>
          </div>
          <p className="max-w-lg text-sm leading-5 text-muted-foreground">
            Each checkpoint is scored across every entry. The ten racers are fixed from the current standings, even if another player breaks into the top 10.
          </p>
        </div>
      </div>

      <RaceChart checkpoints={model.checkpoints} entries={model.trackedEntries} />
    </LedgerPanel>
  );
}

function BracketPicker({
  matches,
  onChooseWinner,
}: {
  matches: TournamentRaceMatch[];
  onChooseWinner: (matchId: string, winner: string) => void;
}) {
  const groups = STAGE_ORDER.map((stage) => ({
    stage,
    matches: matches.filter((match) => match.stage === stage),
  })).filter((group) => group.matches.length);

  return (
    <div className="relative overflow-x-auto overscroll-x-contain border-b bg-surface-paper pb-2 [scrollbar-width:thin]">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-surface-paper to-transparent md:hidden"
      />
      <div className="grid min-w-[58rem] grid-flow-col auto-cols-[14rem] gap-4 p-5">
        {groups.map((group) => (
          <section key={group.stage} className="relative space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              {group.matches[0]?.label}
            </h3>
            <div className="space-y-3">
              {group.matches.map((match) => (
                <BracketMatchCard
                  key={match.id}
                  match={match}
                  onChooseWinner={onChooseWinner}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function BracketMatchCard({
  match,
  onChooseWinner,
}: {
  match: TournamentRaceMatch;
  onChooseWinner: (matchId: string, winner: string) => void;
}) {
  const teams = [match.homeTeam, match.awayTeam];
  const waitingForTeams = !teams.every(Boolean);

  return (
    <article className="rounded-lg border bg-background shadow-sm">
      <div className="border-b bg-surface-ledger/55 px-3 py-2">
        <p className="text-xs font-medium text-muted-foreground">{formatMatchDate(match.date)}</p>
      </div>
      <div className="divide-y">
        {teams.map((team, index) => {
          const selected = Boolean(team) && sameTeam(match.winner, team);
          const canChoose = match.selectable && Boolean(team);

          return canChoose ? (
            <button
              key={`${match.id}-${index}`}
              type="button"
              aria-pressed={selected}
              className={cn(
                "flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25",
                selected && "bg-cta-green-soft font-bold text-brand-ink",
              )}
              onClick={() => onChooseWinner(match.id, team)}
            >
              <span className="truncate">{team}</span>
              {selected ? <span className="text-xs text-brand-mark">Winner</span> : null}
            </button>
          ) : (
            <div
              key={`${match.id}-${index}`}
              className={cn(
                "flex min-h-11 items-center justify-between gap-2 px-3 py-2 text-sm",
                selected && "bg-cta-green-soft font-bold text-brand-ink",
                !team && "text-muted-foreground",
              )}
            >
              <span className="truncate">{team || "Awaiting winner"}</span>
              {selected ? <span className="text-xs text-brand-mark">Official</span> : null}
            </div>
          );
        })}
      </div>
      {!match.completed && waitingForTeams ? (
        <p className="border-t px-3 py-2 text-xs leading-4 text-muted-foreground">
          Pick the upstream winner to unlock this match.
        </p>
      ) : null}
    </article>
  );
}

function RaceChart({
  checkpoints,
  entries,
}: {
  checkpoints: TournamentRaceCheckpoint[];
  entries: TournamentRaceEntry[];
}) {
  const maxRank = Math.max(10, ...checkpoints.flatMap((checkpoint) => checkpoint.entries.map((entry) => entry.rank)));
  const participantLabelGutter = Math.min(
    240,
    Math.max(152, Math.max(...entries.map((entry) => entry.name.length), 0) * 9 + 20),
  );
  const finishLineGutter = Math.min(
    300,
    Math.max(180, Math.max(...entries.map((entry) => entry.name.length), 0) * 8 + 82),
  );
  const width = Math.max(
    720,
    150 +
      Math.max(0, checkpoints.length - 1) * 160 +
      (participantLabelGutter - 58) +
      (finishLineGutter - 98),
  );
  const height = Math.max(320, 104 + maxRank * 24);
  const chart = { left: participantLabelGutter, right: finishLineGutter, top: 54, bottom: 52 };
  const plotWidth = width - chart.left - chart.right;
  const plotHeight = height - chart.top - chart.bottom;
  const pointFor = (checkpointIndex: number, rank: number, tieOffset = 0) => ({
    x:
      chart.left +
      (checkpoints.length <= 1
        ? 0
        : (checkpointIndex / (checkpoints.length - 1)) * plotWidth),
    y: chart.top + ((rank - 1) / Math.max(1, maxRank - 1)) * plotHeight + tieOffset,
  });
  const tieOffsetFor = (checkpoint: TournamentRaceCheckpoint, racer: TournamentRaceEntry) => {
    const tiedRacers = checkpoint.entries
      .filter((entry) => entry.rank === racer.rank)
      .sort((left, right) => left.id.localeCompare(right.id));
    const tieIndex = tiedRacers.findIndex((entry) => entry.id === racer.id);

    return tieIndex === -1 ? 0 : (tieIndex - (tiedRacers.length - 1) / 2) * 16;
  };

  return (
    <>
      <div className="hidden overflow-x-auto bg-background p-5 md:block">
        <svg
          role="img"
          aria-label="Projected standings race chart. Rank one is the finish line at the top."
          className="min-w-[45rem]"
          viewBox={`0 0 ${width} ${height}`}
        >
          <rect x="0" y="0" width={width} height={height} fill="transparent" />
          {[1, 2, 3, 5, 10, maxRank]
            .filter((rank, index, ranks) => rank <= maxRank && ranks.indexOf(rank) === index)
            .map((rank) => {
              const point = pointFor(0, rank);
              return (
                <g key={rank}>
                  <line
                    x1={chart.left}
                    x2={width - chart.right}
                    y1={point.y}
                    y2={point.y}
                    stroke={rank === 1 ? "#0d6b5d" : "#d8d5cd"}
                    strokeDasharray={rank === 1 ? "0" : "3 5"}
                    strokeWidth={rank === 1 ? 2 : 1}
                  />
                  <text x="8" y={point.y + 4} className="fill-muted-foreground text-[11px] font-semibold">
                    #{rank}{rank === 1 ? " finish" : ""}
                  </text>
                </g>
              );
            })}

          {checkpoints.map((checkpoint, index) => {
            const x = pointFor(index, 1).x;
            return (
              <g key={checkpoint.id}>
                <line
                  x1={x}
                  x2={x}
                  y1={chart.top}
                  y2={height - chart.bottom}
                  stroke="#e4e0d7"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={chart.top - 18}
                  textAnchor="middle"
                  className="fill-brand-ink"
                  fontFamily="Arial, Helvetica, sans-serif"
                  fontSize="12"
                  fontWeight="600"
                >
                  {checkpoint.label}
                </text>
              </g>
            );
          })}

          {entries.map((entry, entryIndex) => {
            const points = checkpoints.map((checkpoint, checkpointIndex) => {
              const racer = checkpoint.entries.find((item) => item.id === entry.id) ?? entry;
              const point = pointFor(
                checkpointIndex,
                racer.rank,
                tieOffsetFor(checkpoint, racer),
              );
              return { ...point, racer };
            });
            const color = RACE_COLORS[entryIndex % RACE_COLORS.length];
            const last = points.at(-1);

            return (
              <g key={entry.id}>
                <polyline
                  fill="none"
                  points={points.map((point) => `${point.x},${point.y}`).join(" ")}
                  stroke={color}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                  className="transition-all duration-500 ease-out"
                />
                {points.map((point, pointIndex) => (
                  <circle
                    key={`${entry.id}-${pointIndex}`}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill="#fffdf8"
                    stroke={color}
                    strokeWidth="2.5"
                    className="transition-all duration-500 ease-out"
                  />
                ))}
                <text
                  x={chart.left - 10}
                  y={points[0].y + 5}
                  textAnchor="end"
                  className="fill-brand-ink"
                  fontFamily="Arial, Helvetica, sans-serif"
                  fontSize="13"
                  fontWeight="600"
                >
                  {entry.name}
                </text>
                {last ? (
                  <text
                    x={last.x + 10}
                    y={last.y + 5}
                    className="fill-brand-ink"
                    fontFamily="Arial, Helvetica, sans-serif"
                    fontSize="12"
                    fontWeight="600"
                  >
                    {entry.name} · #{last.racer.rank} · {last.racer.total}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="relative md:hidden">
        <p className="border-b bg-background/70 px-4 py-2 text-xs leading-5 text-muted-foreground">
          Swipe horizontally to compare each projected checkpoint.
        </p>
        <div className="overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
          <div className="min-w-max divide-y">
            <div className="grid grid-cols-[10rem_repeat(var(--checkpoint-count),7rem)] border-b bg-background/70" style={{ "--checkpoint-count": checkpoints.length } as React.CSSProperties}>
              <div className="px-4 py-3 text-xs font-semibold uppercase tracking-normal text-muted-foreground">Racer</div>
              {checkpoints.map((checkpoint) => (
                <div key={checkpoint.id} className="border-l px-3 py-3 text-xs font-semibold text-muted-foreground">
                  {checkpoint.label}
                </div>
              ))}
            </div>
            {entries.map((entry, index) => (
              <div key={entry.id} className="grid grid-cols-[10rem_repeat(var(--checkpoint-count),7rem)]" style={{ "--checkpoint-count": checkpoints.length } as React.CSSProperties}>
                <div className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-brand-ink">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: RACE_COLORS[index % RACE_COLORS.length] }} />
                  <span className="truncate">{entry.name}</span>
                </div>
                {checkpoints.map((checkpoint) => {
                  const racer = checkpoint.entries.find((item) => item.id === entry.id) ?? entry;
                  return (
                    <div key={checkpoint.id} className="border-l px-3 py-3 text-sm text-brand-ink">
                      <span className="font-semibold">#{racer.rank}</span>
                      <span className="ml-1 text-xs text-muted-foreground">{racer.total} pts</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-0 top-8 z-10 w-9 bg-gradient-to-l from-surface-paper to-transparent"
        />
      </div>
    </>
  );
}

function formatMatchDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Scheduled";
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function sameTeam(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

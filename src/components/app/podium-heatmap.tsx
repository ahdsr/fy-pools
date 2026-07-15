import Link from "next/link";

import type { PodiumSummary } from "@/lib/world-cup-pool/heatmap";

type PodiumHeatmapEntry = {
  id: string;
  name: string;
  rank: number;
  points: number;
  podium: {
    champion: string;
    runnerUp: string;
    thirdPlace: string;
  };
  eliminated: Record<"champion" | "runnerUp" | "thirdPlace", boolean>;
};

type PodiumHeatmapProps = {
  entries: PodiumHeatmapEntry[];
  poolSlug: string;
  summaries: PodiumSummary[];
};

const PODIUM_COLUMNS = [
  {
    key: "champion",
    label: "Champion",
    position: "Champion",
    color: "var(--brand-lime)",
  },
  {
    key: "runnerUp",
    label: "Runner-up",
    position: "Runner-up",
    color: "var(--brand-sky)",
  },
  {
    key: "thirdPlace",
    label: "Third place",
    position: "Third place",
    color: "var(--brand-coral)",
  },
] as const;

function pickCount(
  summaries: PodiumSummary[],
  position: PodiumSummary["position"],
  team: string,
) {
  return summaries
    .find((summary) => summary.position === position)
    ?.rows.find((row) => row.team === team)?.cell.count ?? 0;
}

function HeatCell({
  team,
  count,
  totalEntries,
  label,
  color,
  eliminated,
}: {
  team: string;
  count: number;
  totalEntries: number;
  label: string;
  color: string;
  eliminated: boolean;
}) {
  const share = totalEntries ? count / totalEntries : 0;
  const intensity = Math.round(14 + share * 64);

  return (
    <td
      className="border-b border-l border-border/80 p-0 text-center"
      title={`${count} ${count === 1 ? "entry" : "entries"} selected ${team} for ${label}${eliminated ? "; eliminated" : ""}`}
    >
      <span
        className={`flex items-center justify-center px-3 py-2.5 text-sm font-semibold leading-tight sm:px-2 sm:py-2 ${
          eliminated ? "bg-muted text-muted-foreground line-through decoration-2" : "text-brand-ink"
        }`}
        style={{
          backgroundColor: eliminated
            ? undefined
            : `color-mix(in oklch, var(--surface-paper), ${color} ${intensity}%)`,
        }}
      >
        {team}
      </span>
    </td>
  );
}

export function PodiumHeatmap({
  entries,
  poolSlug,
  summaries,
}: PodiumHeatmapProps) {
  return (
    <div className="relative">
      <p className="border-b bg-surface-ledger/55 px-4 py-2 text-xs leading-5 text-muted-foreground sm:hidden">
        Swipe horizontally to compare each podium prediction.
      </p>
      <div className="overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
        <table className="min-w-[46rem] w-full border-collapse text-[0.9375rem] sm:text-sm">
        <caption className="sr-only">
          World Cup podium predictions ranked by current pool points. Darker cells
          show selections shared by more entries.
        </caption>
        <thead>
          <tr className="bg-surface-ledger">
            <th className="h-10 border-b px-3 text-left align-middle text-xs font-semibold uppercase tracking-normal text-muted-foreground first:pl-4 sm:px-2 sm:first:pl-5">
              Rank
            </th>
            <th className="h-10 border-b border-l border-border/80 px-3 text-left align-middle text-xs font-semibold uppercase tracking-normal text-muted-foreground sm:px-2">
              Entry
            </th>
            <th className="h-10 border-b border-l border-border/80 px-3 text-right align-middle text-xs font-semibold uppercase tracking-normal text-muted-foreground sm:px-2">
              Points
            </th>
            <th
              className="h-10 border-b border-l border-border/80 bg-cta-green px-3 text-center align-middle text-sm font-bold uppercase tracking-wide text-cta-green-foreground sm:px-2"
              colSpan={PODIUM_COLUMNS.length}
            >
              World Cup predictions
            </th>
          </tr>
          <tr className="bg-background/65">
            <th className="h-10 border-b px-3 first:pl-4 sm:px-2 sm:first:pl-5" />
            <th className="h-10 border-b border-l border-border/80 px-3 sm:px-2" />
            <th className="h-10 border-b border-l border-border/80 px-3 sm:px-2" />
            {PODIUM_COLUMNS.map((column) => (
              <th
                key={column.key}
                className="h-10 border-b border-l border-border/80 px-3 text-center align-middle text-xs font-bold uppercase tracking-normal text-brand-ink sm:px-2"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="bg-surface-paper/70 hover:bg-background">
              <td className="border-b px-3 py-2.5 font-semibold tabular-nums text-muted-foreground first:pl-4 sm:p-2 sm:first:pl-5">
                {entry.rank}
              </td>
              <td className="border-b border-l border-border/80 px-3 py-2.5 sm:p-2">
                <Link
                  href={`/pools/${poolSlug}/entry/${entry.id}`}
                  className="font-semibold text-brand-ink transition hover:text-brand-hot focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {entry.name}
                </Link>
              </td>
              <td className="border-b border-l border-border/80 px-3 py-2.5 text-right font-bold tabular-nums text-brand-ink sm:p-2">
                {entry.points}
              </td>
              {PODIUM_COLUMNS.map((column) => {
                const team = entry.podium[column.key];

                return (
                  <HeatCell
                    key={column.key}
                    team={team}
                    count={pickCount(summaries, column.position, team)}
                    totalEntries={entries.length}
                    label={column.label}
                    color={column.color}
                    eliminated={entry.eliminated[column.key]}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
        </table>
      </div>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-10 right-0 top-8 z-10 w-9 bg-gradient-to-l from-surface-paper to-transparent sm:hidden"
      />
      <p className="border-t bg-background/55 px-3 py-2.5 text-xs leading-5 text-muted-foreground sm:px-2 sm:py-2">
        Green marks Champion calls, blue marks Runner-up calls, and coral marks
        Third-place calls. More shared picks are more saturated; crossed-out
        teams can no longer finish in that position. Select an entry name to
        open its full submission.
      </p>
    </div>
  );
}

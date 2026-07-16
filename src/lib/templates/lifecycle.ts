import type { NbaSeriesSettings } from "@/lib/nba-series/types";
import type { RoundOf16PoolSettings } from "@/lib/templates/round-of-16-draft";

export type PoolTemplateRuntime = "round-of-16" | "nba-series";

export type PoolSettingsEnvelope = {
  roundOf16?: RoundOf16PoolSettings;
  nbaSeries?: NbaSeriesSettings;
};

export function getPoolTemplateRuntime(
  value: unknown,
): PoolTemplateRuntime | null {
  if (!value || typeof value !== "object") return null;
  const settings = value as PoolSettingsEnvelope;
  if (settings.roundOf16) return "round-of-16";
  if (settings.nbaSeries) return "nba-series";
  return null;
}

export function getNbaSeriesSettings(value: unknown) {
  if (getPoolTemplateRuntime(value) !== "nba-series") return undefined;
  return (value as PoolSettingsEnvelope).nbaSeries;
}

export type UnrankedStandingRow<Line> = {
  entryId: string;
  entryName: string;
  total: number;
  maxPoints: number;
  submittedAt: string;
  lines: Line[];
};

export type RankedStandingRow<Line> = UnrankedStandingRow<Line> & {
  rank: number;
};

/** A deterministic shared tie policy for every template leaderboard. */
export function rankStandings<Line>(
  rows: UnrankedStandingRow<Line>[],
): RankedStandingRow<Line>[] {
  let lastTotal: number | undefined;
  let lastRank = 0;

  return rows
    .slice()
    .sort(
      (left, right) =>
        right.total - left.total || left.entryName.localeCompare(right.entryName),
    )
    .map((row, index) => {
      if (row.total !== lastTotal) lastRank = index + 1;
      lastTotal = row.total;
      return { ...row, rank: lastRank };
    });
}

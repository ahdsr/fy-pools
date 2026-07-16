import type { SeriesResult } from "@/lib/templates/bracket-simulation";

export type NbaTeam = { id: string; name: string; conference: "east" | "west"; seed: number };

export type NbaSeriesBasics = {
  poolName: string;
  commissionerName: string;
  eventLabel: string;
  picksLockAt: string;
  timezone: string;
  description: string;
};

export type NbaSeriesScoring = {
  winnerPoints: number;
  exactScorePoints: number;
  prizePoolLabel: string;
};

export type NbaSeriesPayout = { id: string; place: string; amount: string };
export type NbaSeriesInvite = { id: string; email: string; displayName: string };

export type NbaSeriesSettings = {
  basics: NbaSeriesBasics;
  teams: NbaTeam[];
  scoring: NbaSeriesScoring;
  payouts: NbaSeriesPayout[];
  expectedEntries: number;
  inviteNote: string;
  /** Commissioner-entered, fixture-driven series outcomes. */
  results: Record<string, SeriesResult>;
};

export type NbaSeriesPick = SeriesResult;
export type NbaSeriesPickPayload = { series: Record<string, NbaSeriesPick> };

export type NbaSeriesScoreLine = {
  key: string;
  label: string;
  pick: string;
  result: string;
  pointsAwarded: number;
  maxPoints: number;
  reason: string;
};

export type NbaSeriesScoreResult = {
  total: number;
  maxPoints: number;
  lines: NbaSeriesScoreLine[];
};

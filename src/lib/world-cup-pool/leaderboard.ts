import { scorePool } from "@/lib/world-cup-pool/scoring";
import type {
  EntriesConfig,
  EntryPicks,
  LeaderboardRow,
  PoolEntry,
  PoolResults,
  PoolScore,
  ScoreSubtotals,
} from "@/lib/world-cup-pool/types";

const EMPTY_SUBTOTALS: ScoreSubtotals = {
  group: 0,
  knockout: 0,
  finals: 0,
  bonus: 0,
};

export type PoolAnalyticsRow = {
  id: string;
  name: string;
  rank: number;
  currentTotal: number;
  currentGapToLeader: number;
  remaining: ScoreSubtotals & { total: number };
  maxPossible: number;
  canWin: boolean;
  canReachPayout: boolean;
  payoutPlaces: number;
  ceilingRank: number;
};

export type PoolAnalytics = {
  payoutPlaces: number;
  leaderTotal: number;
  payoutCutoff: number;
  leaderNames: string[];
  topCeiling?: PoolAnalyticsRow;
  leaderClinched: boolean;
  aliveCount: number;
  payoutAliveCount: number;
  rows: PoolAnalyticsRow[];
};

function emptyScore(): PoolScore {
  return {
    total: 0,
    subtotals: EMPTY_SUBTOTALS,
    groups: [],
    knockout: [],
    finals: [],
    bonus: [],
  };
}

function cleanScore(score?: Partial<PoolScore>): PoolScore {
  const subtotals = {
    ...EMPTY_SUBTOTALS,
    ...(score?.subtotals ?? {}),
  };
  const total =
    Number.isFinite(score?.total)
      ? Number(score?.total)
      : subtotals.group + subtotals.knockout + subtotals.finals + subtotals.bonus;

  return {
    ...emptyScore(),
    ...score,
    total,
    subtotals,
  };
}

export function scoreEntry(
  entry: PoolEntry,
  picksByPath: Map<string, EntryPicks>,
  results: PoolResults,
) {
  if (entry.sample) {
    return cleanScore(entry.score);
  }

  const picks = entry.picksPath ? picksByPath.get(entry.picksPath) : undefined;
  if (!picks) return cleanScore();

  return scorePool(picks, results);
}

export function buildLeaderboardRows(
  entriesConfig: EntriesConfig,
  picksByPath: Map<string, EntryPicks>,
  results: PoolResults,
): LeaderboardRow[] {
  let lastScore: number | null = null;
  let lastRank = 0;

  return (entriesConfig.entries ?? [])
    .map((entry) => ({
      ...entry,
      score: scoreEntry(entry, picksByPath, results),
    }))
    .sort((a, b) => {
      if (b.score.total !== a.score.total) return b.score.total - a.score.total;
      return a.name.localeCompare(b.name);
    })
    .map((entry, index) => {
      const rank = entry.score.total === lastScore ? lastRank : index + 1;
      lastScore = entry.score.total;
      lastRank = rank;
      return {
        ...entry,
        rank,
      };
    });
}

const KNOCKOUT_CEILING_STAGES = [
  { key: "roundOf16", label: "Round of 16" },
  { key: "quarterFinalists", label: "Quarter-finals" },
  { key: "semifinalists", label: "Semi-finals" },
  { key: "thirdPlaceMatch", label: "3rd-place match" },
  { key: "finalists", label: "Final" },
] as const;

const FINAL_CEILING_STAGES = [
  { key: "champion", label: "Champion" },
  { key: "runnerUp", label: "Runner-up" },
  { key: "thirdPlace", label: "Third place" },
] as const;

function stageRemaining(maxPoints: number, currentPoints: number, settled: boolean) {
  if (settled) return 0;
  return Math.max(0, maxPoints - currentPoints);
}

function groupRemaining(
  groupPick: EntryPicks["groups"][string],
  groupScore: PoolScore["groups"][number] | undefined,
  groupResult: NonNullable<PoolResults["groups"]>[string] | undefined,
  rules: EntryPicks["scoringRules"],
) {
  if (groupResult?.status === "final") return 0;

  const maxAdvancement = groupPick.predictedAdvancers.length * rules.groupAdvancement;
  const maxRankBonus = rules.exactTopFourBonus;
  return stageRemaining(maxAdvancement + maxRankBonus, groupScore?.points ?? 0, false);
}

function knockoutRemaining(
  picks: EntryPicks,
  score: PoolScore,
  results: PoolResults,
  rules: EntryPicks["scoringRules"],
) {
  return KNOCKOUT_CEILING_STAGES.reduce((sum, stage) => {
    const predictedCount = picks.advancement[stage.key].length;
    const actualCount = results[stage.key]?.length ?? 0;
    const stageScore = score.knockout.find((item) => item.stageKey === stage.key);
    const maxPoints = predictedCount * rules[stage.key];
    const settled = predictedCount > 0 && actualCount >= predictedCount;
    return sum + stageRemaining(maxPoints, stageScore?.points ?? 0, settled);
  }, 0);
}

function finalsRemaining(
  score: PoolScore,
  results: PoolResults,
  rules: EntryPicks["scoringRules"],
) {
  return FINAL_CEILING_STAGES.reduce((sum, stage) => {
    const finalScore = score.finals.find((item) => item.label === stage.label);
    const settled = Boolean(results.finals?.[stage.key]);
    return sum + stageRemaining(rules[stage.key], finalScore?.points ?? 0, settled);
  }, 0);
}

function bonusRemaining(picks: EntryPicks, score: PoolScore, rules: EntryPicks["scoringRules"]) {
  return picks.bonus.reduce((sum, item) => {
    const bonusScore = score.bonus.find((scored) => scored.id === item.id);
    return sum + stageRemaining(rules.bonus, bonusScore?.points ?? 0, false);
  }, 0);
}

function remainingBreakdown(
  picks: EntryPicks,
  score: PoolScore,
  results: PoolResults,
): ScoreSubtotals & { total: number } {
  const rules = picks.scoringRules;
  const group = Object.entries(picks.groups).reduce((sum, [groupId, groupPick]) => {
    const groupScore = score.groups.find((item) => item.groupId === groupId);
    return sum + groupRemaining(groupPick, groupScore, results.groups?.[groupId], rules);
  }, 0);
  const knockout = knockoutRemaining(picks, score, results, rules);
  const finals = finalsRemaining(score, results, rules);
  const bonus = bonusRemaining(picks, score, rules);

  return {
    group,
    knockout,
    finals,
    bonus,
    total: group + knockout + finals + bonus,
  };
}

function rankByValue(rows: PoolAnalyticsRow[], valueKey: "maxPossible") {
  let lastValue: number | null = null;
  let lastRank = 0;
  return rows
    .slice()
    .sort((a, b) => {
      if (b[valueKey] !== a[valueKey]) return b[valueKey] - a[valueKey];
      return a.name.localeCompare(b.name);
    })
    .map((row, index) => {
      const rank = row[valueKey] === lastValue ? lastRank : index + 1;
      lastValue = row[valueKey];
      lastRank = rank;
      return [row.id, rank] as const;
    });
}

export function buildPoolAnalytics(
  entriesConfig: EntriesConfig,
  picksByPath: Map<string, EntryPicks>,
  results: PoolResults,
  rows?: LeaderboardRow[],
): PoolAnalytics {
  const leaderboardRows = rows ?? buildLeaderboardRows(entriesConfig, picksByPath, results);
  const payoutPlaces = Math.max(1, entriesConfig.payouts?.length ?? 4);
  const leaderTotal = leaderboardRows[0]?.score.total ?? 0;
  const payoutCutoff =
    leaderboardRows[Math.min(payoutPlaces, leaderboardRows.length) - 1]?.score.total ?? 0;

  const analyticsRows = leaderboardRows.map((row) => {
    const picks = row.picksPath ? picksByPath.get(row.picksPath) : undefined;
    const remaining = picks
      ? remainingBreakdown(picks, row.score, results)
      : { ...EMPTY_SUBTOTALS, total: 0 };
    const maxPossible = row.score.total + remaining.total;

    return {
      id: row.id,
      name: row.name,
      rank: row.rank,
      currentTotal: row.score.total,
      currentGapToLeader: Math.max(0, leaderTotal - row.score.total),
      remaining,
      maxPossible,
      canWin: maxPossible >= leaderTotal,
      canReachPayout: maxPossible >= payoutCutoff,
      payoutPlaces,
      ceilingRank: row.rank,
    };
  });

  const ceilingRanks = new Map(rankByValue(analyticsRows, "maxPossible"));
  const maxChaserScore = Math.max(
    ...analyticsRows.filter((row) => row.rank !== 1).map((row) => row.maxPossible),
    0,
  );
  const leaders = analyticsRows.filter((row) => row.rank === 1);
  const topCeiling = analyticsRows
    .slice()
    .sort((a, b) => {
      if (b.maxPossible !== a.maxPossible) return b.maxPossible - a.maxPossible;
      return a.name.localeCompare(b.name);
    })[0];

  return {
    payoutPlaces,
    leaderTotal,
    payoutCutoff,
    leaderNames: leaders.map((row) => row.name),
    topCeiling,
    leaderClinched: leaders.some((leader) => leader.currentTotal > maxChaserScore),
    aliveCount: analyticsRows.filter((row) => row.canWin).length,
    payoutAliveCount: analyticsRows.filter((row) => row.canReachPayout).length,
    rows: analyticsRows.map((row) => ({
      ...row,
      ceilingRank: ceilingRanks.get(row.id) ?? row.rank,
    })),
  };
}

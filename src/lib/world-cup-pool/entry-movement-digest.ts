import type { FutureLeverageReport } from "@/lib/world-cup-pool/future-leverage";
import type { OpponentPathsReport } from "@/lib/world-cup-pool/opponent-paths";
import type { TodaysResultsReport } from "@/lib/world-cup-pool/todays-results";
import type { LeaderboardRow } from "@/lib/world-cup-pool/types";

export type MovementDirection = "up" | "down" | "mixed" | "neutral";

export type MovementDecider = {
  id: string;
  matchId?: string;
  date?: string;
  title: string;
  desiredOutcome: string;
  impact: string;
  direction: MovementDirection;
  rankChange: number;
  pointChange: number;
  projectedRank?: number;
  projectedTotal?: number;
  proximityScore: number;
  tags: string[];
};

export type CloseRival = {
  id: string;
  name: string;
  rank: number;
  total: number;
  relation: "ahead" | "chaser" | "tied";
  gap: number;
  neededSwing: number;
  routeSummary: string;
  riskSummary: string;
  events: {
    title: string;
    points: number;
    category: string;
  }[];
};

export type EntryMovementDigest = {
  target: {
    id: string;
    name: string;
    rank: number;
    total: number;
    totalEntries: number;
  };
  raceSnapshot: {
    closestAhead?: CloseRival;
    closestChaser?: CloseRival;
    bestReachableRank: number;
    bestReachableTotal: number;
    biggestDownside?: string;
    pathsUp: number;
    impactfulMatchCount: number;
  };
  deciders: MovementDecider[];
  closeRivals: CloseRival[];
  emptyState: string;
};

type BuildDigestInput = {
  entryId: string;
  leaderboardRows: LeaderboardRow[];
  todaysResults: TodaysResultsReport | null;
  futureLeverage: FutureLeverageReport | null;
  opponentPaths: OpponentPathsReport | null;
};

const MAX_DECIDERS = 5;
const MAX_RIVALS_EACH_SIDE = 2;

function points(row: LeaderboardRow) {
  return row.score.total;
}

function matchTitle(match: {
  homeTeam: string;
  awayTeam: string;
  detail?: string;
}) {
  return `${match.homeTeam} vs ${match.awayTeam}${match.detail ? ` - ${match.detail}` : ""}`;
}

function uniqueItems<T>(items: T[], keyFor: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyFor(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sentenceList(items: string[], fallback: string) {
  const clean = uniqueItems(items.filter(Boolean), (item) => item);
  if (!clean.length) return fallback;
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")}, and ${clean.at(-1)}`;
}

function movementDirection({
  rankChange,
  chasersPassing,
}: {
  rankChange: number;
  chasersPassing: number;
}): MovementDirection {
  if (rankChange > 0 && chasersPassing > 0) return "mixed";
  if (rankChange > 0) return "up";
  if (rankChange < 0 || chasersPassing > 0) return "down";
  return "neutral";
}

function movementTags({
  rankChange,
  pointChange,
  chasersPassing,
  source,
}: {
  rankChange: number;
  pointChange: number;
  chasersPassing: number;
  source: string;
}) {
  const tags = [source];
  if (rankChange > 0) tags.push(`+${rankChange} rank`);
  if (rankChange < 0) tags.push(`${rankChange} rank`);
  if (pointChange > 0) tags.push(`+${pointChange} pts`);
  if (chasersPassing > 0) tags.push(`${chasersPassing} chaser${chasersPassing === 1 ? "" : "s"}`);
  return tags;
}

function deciderSort(a: MovementDecider, b: MovementDecider) {
  const rankDelta = Math.abs(b.rankChange) - Math.abs(a.rankChange);
  if (rankDelta !== 0) return rankDelta;

  const pointDelta = Math.abs(b.pointChange) - Math.abs(a.pointChange);
  if (pointDelta !== 0) return pointDelta;

  if (b.proximityScore !== a.proximityScore) {
    return b.proximityScore - a.proximityScore;
  }

  const aTime = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
  const bTime = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
  const safeATime = Number.isFinite(aTime) ? aTime : Number.MAX_SAFE_INTEGER;
  const safeBTime = Number.isFinite(bTime) ? bTime : Number.MAX_SAFE_INTEGER;

  return safeATime - safeBTime;
}

function impactCopy({
  targetName,
  outcomeLabel,
  projectedRank,
  projectedTotal,
  rankChange,
  pointChange,
  passed,
  chasers,
}: {
  targetName: string;
  outcomeLabel: string;
  projectedRank: number;
  projectedTotal: number;
  rankChange: number;
  pointChange: number;
  passed: string[];
  chasers: string[];
}) {
  const outcome = outcomeLabel.toLowerCase();

  if (rankChange > 0) {
    const passText = passed.length
      ? ` and pass ${sentenceList(passed.slice(0, 2), "")}`
      : "";
    return `If ${outcome}, ${targetName} can move to #${projectedRank}${passText}.`;
  }

  if (chasers.length) {
    return `If ${outcome}, ${sentenceList(chasers.slice(0, 2), "a chaser")} can pass ${targetName}.`;
  }

  if (pointChange > 0) {
    return `If ${outcome}, ${targetName} gains ${pointChange} pts and stays around #${projectedRank}.`;
  }

  return `If ${outcome}, ${targetName} stays at #${projectedRank} with ${projectedTotal} pts.`;
}

function todaysDeciders({
  targetName,
  report,
}: {
  targetName: string;
  report: TodaysResultsReport | null;
}): MovementDecider[] {
  if (!report) return [];

  return report.matches.flatMap((item) =>
    item.outcomes
      .filter(
        (outcome) =>
          outcome.rankChange !== 0 ||
          outcome.pointChange !== 0 ||
          outcome.playersAboveAlsoHelped > 0 ||
          outcome.chasersCanRiseAbove > 0,
      )
      .map((outcome) => {
        const direction = movementDirection({
          rankChange: outcome.rankChange,
          chasersPassing: outcome.chasersCanRiseAbove,
        });

        return {
          id: `today:${item.match.id}:${outcome.outcome}`,
          matchId: item.match.id,
          date: item.match.date,
          title: matchTitle(item.match),
          desiredOutcome: outcome.label,
          impact: impactCopy({
            targetName,
            outcomeLabel: outcome.label,
            projectedRank: outcome.rank,
            projectedTotal: outcome.total,
            rankChange: outcome.rankChange,
            pointChange: outcome.pointChange,
            passed: [],
            chasers: outcome.chasersCanRiseAbove
              ? [`${outcome.chasersCanRiseAbove} chaser${outcome.chasersCanRiseAbove === 1 ? "" : "s"}`]
              : [],
          }),
          direction,
          rankChange: outcome.rankChange,
          pointChange: outcome.pointChange,
          projectedRank: outcome.rank,
          projectedTotal: outcome.total,
          proximityScore:
            outcome.playersAboveAlsoHelped + outcome.chasersCanRiseAbove,
          tags: movementTags({
            rankChange: outcome.rankChange,
            pointChange: outcome.pointChange,
            chasersPassing: outcome.chasersCanRiseAbove,
            source: "Today",
          }),
        };
      }),
  );
}

function futureDeciders({
  targetName,
  report,
}: {
  targetName: string;
  report: FutureLeverageReport | null;
}): MovementDecider[] {
  if (!report) return [];

  return report.matches.flatMap((match) => {
    const selectedOutcomes = uniqueItems(
      [match.bestOutcome, match.worstOutcome].filter(
        (outcome) =>
          outcome.rankChange !== 0 ||
          outcome.pointChange !== 0 ||
          outcome.entriesPassed.length > 0 ||
          outcome.chasersPassing.length > 0,
      ),
      (outcome) => outcome.outcome,
    );

    return selectedOutcomes.map((outcome) => {
      const direction = movementDirection({
        rankChange: outcome.rankChange,
        chasersPassing: outcome.chasersPassing.length,
      });

      return {
        id: `future:${match.id}:${outcome.outcome}`,
        matchId: match.id,
        date: match.date,
        title: matchTitle(match),
        desiredOutcome: outcome.label,
        impact: impactCopy({
          targetName,
          outcomeLabel: outcome.label,
          projectedRank: outcome.rank,
          projectedTotal: outcome.total,
          rankChange: outcome.rankChange,
          pointChange: outcome.pointChange,
          passed: outcome.entriesPassed,
          chasers: outcome.chasersPassing,
        }),
        direction,
        rankChange: outcome.rankChange,
        pointChange: outcome.pointChange,
        projectedRank: outcome.rank,
        projectedTotal: outcome.total,
        proximityScore:
          outcome.entriesPassed.length + outcome.chasersPassing.length,
        tags: uniqueItems(
          [
            ...movementTags({
              rankChange: outcome.rankChange,
              pointChange: outcome.pointChange,
              chasersPassing: outcome.chasersPassing.length,
              source: "Future",
            }),
            ...match.pathNotes.slice(0, 2),
          ],
          (tag) => tag,
        ),
      };
    });
  });
}

function relationFor(row: LeaderboardRow, target: LeaderboardRow) {
  if (row.rank === target.rank || points(row) === points(target)) return "tied";
  return row.rank < target.rank ? "ahead" : "chaser";
}

function fallbackNeededSwing(row: LeaderboardRow, target: LeaderboardRow) {
  if (row.rank < target.rank) return Math.max(0, points(row) - points(target) + 1);
  if (row.rank > target.rank) return Math.max(0, points(target) - points(row) + 1);
  return 1;
}

function buildCloseRival({
  row,
  target,
  opponentPaths,
}: {
  row: LeaderboardRow;
  target: LeaderboardRow;
  opponentPaths: OpponentPathsReport | null;
}): CloseRival {
  const relation = relationFor(row, target);
  const path = opponentPaths?.opponents.find((opponent) => opponent.id === row.id);
  const gap =
    relation === "ahead"
      ? points(row) - points(target)
      : relation === "chaser"
        ? points(target) - points(row)
        : 0;
  const neededSwing = path?.neededSwing ?? fallbackNeededSwing(row, target);
  const events = (path?.routeEvents ?? []).slice(0, 3).map((event) => ({
    title: event.title,
    points: event.points,
    category: event.category,
  }));
  const firstEvent = events[0];
  const routeSummary = firstEvent
    ? `${neededSwing} pt swing starts with ${firstEvent.title}.`
    : relation === "ahead"
      ? `Needs a ${neededSwing} pt swing to pass.`
      : relation === "chaser"
        ? `${row.name} needs a ${neededSwing} pt swing to pass.`
        : "Tied on points; the next unique result matters.";
  const riskSummary =
    relation === "ahead"
      ? path?.routeComplete
        ? "There is still a live path to catch them."
        : "No complete catch route is visible yet."
      : relation === "chaser"
        ? path?.routeComplete
          ? `${row.name} has a live route to pass.`
          : `${row.name} needs more help than the visible route covers.`
        : "Tie-break movement depends on the next scoring swing.";

  return {
    id: row.id,
    name: row.name,
    rank: row.rank,
    total: points(row),
    relation,
    gap,
    neededSwing,
    routeSummary,
    riskSummary,
    events,
  };
}

function closeRivals({
  target,
  leaderboardRows,
  opponentPaths,
}: {
  target: LeaderboardRow;
  leaderboardRows: LeaderboardRow[];
  opponentPaths: OpponentPathsReport | null;
}) {
  const others = leaderboardRows.filter((row) => row.id !== target.id);
  const ahead = others
    .filter((row) => row.rank < target.rank)
    .sort((a, b) => {
      const gapDelta = points(a) - points(target) - (points(b) - points(target));
      if (gapDelta !== 0) return gapDelta;
      return b.rank - a.rank;
    })
    .slice(0, MAX_RIVALS_EACH_SIDE);
  const chasers = others
    .filter((row) => row.rank >= target.rank || points(row) <= points(target))
    .sort((a, b) => {
      const gapDelta =
        Math.abs(points(a) - points(target)) -
        Math.abs(points(b) - points(target));
      if (gapDelta !== 0) return gapDelta;
      return a.rank - b.rank;
    })
    .slice(0, MAX_RIVALS_EACH_SIDE);

  return uniqueItems([...ahead, ...chasers], (row) => row.id).map((row) =>
    buildCloseRival({ row, target, opponentPaths }),
  );
}

function biggestDownside({
  deciders,
  futureLeverage,
}: {
  deciders: MovementDecider[];
  futureLeverage: FutureLeverageReport | null;
}) {
  const risk = deciders.find(
    (decider) => decider.direction === "down" || decider.direction === "mixed",
  );
  if (risk) return risk.impact;

  const chaser = futureLeverage?.chasers[0];
  if (!chaser) return undefined;

  const route = chaser.routeEvents[0]?.title;
  return route
    ? `${chaser.name} can pass with a ${chaser.neededSwing} pt swing, starting with ${route}.`
    : `${chaser.name} can still pass with a ${chaser.neededSwing} pt swing.`;
}

export function buildEntryMovementDigest({
  entryId,
  leaderboardRows,
  todaysResults,
  futureLeverage,
  opponentPaths,
}: BuildDigestInput): EntryMovementDigest | null {
  const target = leaderboardRows.find((row) => row.id === entryId);
  if (!target) return null;

  const targetName = target.name;
  const rivals = closeRivals({ target, leaderboardRows, opponentPaths });
  const deciders = uniqueItems(
    [
      ...todaysDeciders({ targetName, report: todaysResults }),
      ...futureDeciders({ targetName, report: futureLeverage }),
    ].sort(deciderSort),
    (decider) => `${decider.matchId ?? decider.id}:${decider.desiredOutcome}:${decider.direction}`,
  ).slice(0, MAX_DECIDERS);
  const bestRankFromDeciders = deciders.reduce(
    (best, decider) =>
      decider.projectedRank ? Math.min(best, decider.projectedRank) : best,
    target.rank,
  );
  const bestReachableRank = Math.min(
    target.rank,
    todaysResults?.bestRank ?? target.rank,
    bestRankFromDeciders,
  );
  const bestReachableTotal = Math.max(
    points(target),
    todaysResults?.bestTotal ?? points(target),
    ...deciders.map((decider) => decider.projectedTotal ?? points(target)),
  );
  const matchIds = new Set(deciders.map((decider) => decider.matchId).filter(Boolean));
  const closestAhead = rivals.find((rival) => rival.relation === "ahead");
  const closestChaser = rivals.find(
    (rival) => rival.relation === "chaser" || rival.relation === "tied",
  );

  return {
    target: {
      id: target.id,
      name: target.name,
      rank: target.rank,
      total: points(target),
      totalEntries: leaderboardRows.length,
    },
    raceSnapshot: {
      closestAhead,
      closestChaser,
      bestReachableRank,
      bestReachableTotal,
      biggestDownside: biggestDownside({ deciders, futureLeverage }),
      pathsUp: deciders.filter((decider) => decider.rankChange > 0).length,
      impactfulMatchCount: matchIds.size,
    },
    deciders,
    closeRivals: rivals,
    emptyState:
      "No upcoming match currently changes this entry's rank. Check back after the next score refresh.",
  };
}

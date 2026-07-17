import type { MatchResult } from "@/lib/world-cup-pool/types";

export const DOUBLE_DOWN_CHIP_COUNT = 3;
export const DOUBLE_DOWN_CORRECT_CREDITS = 2;
export const DOUBLE_DOWN_OPEN_WINDOW_MS = 24 * 60 * 60 * 1000;

export type DoubleDownOutcome = "home" | "draw" | "away";
export type DoubleDownMarketStatus =
  | "scheduled"
  | "open"
  | "locked"
  | "settled"
  | "cancelled";

export type DoubleDownParticipant = {
  memberId: string;
  name: string;
  representativeEntryId: string;
  representativeEntryName: string;
  rank: number;
  canReachPayout: boolean;
};

export type DoubleDownOutcomeImpact = {
  outcome: DoubleDownOutcome;
  rankDelta: number;
  pointDelta: number;
  reachesPayout?: boolean;
};

export type DoubleDownMatchImpact = {
  memberId: string;
  matchId: string;
  outcomes: DoubleDownOutcomeImpact[];
};

export type DoubleDownCandidate = {
  match: Pick<MatchResult, "id" | "date" | "homeTeam" | "awayTeam" | "detail">;
  availableOutcomes: DoubleDownOutcome[];
  openAt: string;
  locksAt: string;
  participantCount: number;
  impactScore: number;
  impactSummary: string;
};

export type DoubleDownAccount = {
  memberId: string;
  chipsSpent: number;
  credits: number;
  correctCalls: number;
};

export type DoubleDownCall = {
  id: string;
  marketId: string;
  memberId: string;
  memberName: string;
  outcome: DoubleDownOutcome;
  placedAt: string;
  settledOutcome?: DoubleDownOutcome | null;
  creditsAwarded: number;
};

export type DoubleDownMarket = {
  id: string;
  poolId: string;
  matchId: string;
  status: DoubleDownMarketStatus;
  homeTeam: string;
  awayTeam: string;
  detail: string;
  opensAt: string;
  locksAt: string;
  availableOutcomes: DoubleDownOutcome[];
  impactSummary: string;
  representativeEntries: Record<string, string>;
  settledOutcome?: DoubleDownOutcome | null;
};

function startsAt(match: Pick<MatchResult, "date">) {
  return new Date(match.date).getTime();
}

export function outcomesForMatch(match: Pick<MatchResult, "homeTeam" | "awayTeam" | "group">) {
  return match.group ? (["home", "draw", "away"] as const) : (["home", "away"] as const);
}

function hasMaterialImpact(impact: DoubleDownOutcomeImpact) {
  return (
    impact.rankDelta !== 0 ||
    impact.pointDelta !== 0 ||
    impact.reachesPayout === true
  );
}

function marketImpactScore(impacts: DoubleDownMatchImpact[]) {
  return impacts.reduce(
    (total, member) =>
      total +
      member.outcomes.reduce(
        (memberTotal, outcome) =>
          memberTotal +
          Math.abs(outcome.rankDelta) * 10 +
          Math.abs(outcome.pointDelta) +
          (outcome.reachesPayout ? 25 : 0),
        0,
      ),
    0,
  );
}

/**
 * Chooses the first upcoming fixture that meaningfully moves at least two
 * payout-live members. Chronological priority keeps the experience focused on
 * the next moment of tension instead of a distant final.
 */
export function selectDoubleDownCandidate({
  matches,
  participants,
  impacts,
  now = new Date(),
}: {
  matches: Pick<MatchResult, "id" | "date" | "homeTeam" | "awayTeam" | "detail" | "group" | "completed" | "state">[];
  participants: DoubleDownParticipant[];
  impacts: DoubleDownMatchImpact[];
  now?: Date;
}): DoubleDownCandidate | null {
  const eligibleById = new Map(
    participants.filter((participant) => participant.canReachPayout).map((participant) => [participant.memberId, participant]),
  );
  const nowMs = now.getTime();

  const candidates = matches
    .filter((match) => !match.completed && match.state !== "post" && startsAt(match) > nowMs)
    .sort((left, right) => startsAt(left) - startsAt(right));

  for (const match of candidates) {
    const matchImpacts = impacts.filter((impact) =>
      impact.matchId === match.id &&
      eligibleById.has(impact.memberId) &&
      impact.outcomes.some(hasMaterialImpact),
    );
    const distinctMembers = new Set(matchImpacts.map((impact) => impact.memberId));
    if (distinctMembers.size < 2) continue;

    const start = startsAt(match);
    if (!Number.isFinite(start)) continue;
    const outcomeNames = new Set(
      matchImpacts.flatMap((impact) =>
        impact.outcomes.filter(hasMaterialImpact).map((outcome) => outcome.outcome),
      ),
    );
    if (outcomeNames.size < 2) continue;

    return {
      match,
      availableOutcomes: [...outcomesForMatch(match)],
      openAt: new Date(Math.max(nowMs, start - DOUBLE_DOWN_OPEN_WINDOW_MS)).toISOString(),
      locksAt: new Date(start).toISOString(),
      participantCount: distinctMembers.size,
      impactScore: marketImpactScore(matchImpacts),
      impactSummary: `${distinctMembers.size} payout-live players can move on this result.`,
    };
  }

  return null;
}

export function marketStatusAt(
  market: Pick<DoubleDownMarket, "opensAt" | "locksAt" | "status">,
  now = new Date(),
): DoubleDownMarketStatus {
  if (market.status === "settled" || market.status === "cancelled") return market.status;
  const current = now.getTime();
  if (current < new Date(market.opensAt).getTime()) return "scheduled";
  return current < new Date(market.locksAt).getTime() ? "open" : "locked";
}

export function canPlaceDoubleDownCall({
  market,
  account,
  outcome,
  now = new Date(),
}: {
  market: DoubleDownMarket;
  account: DoubleDownAccount | null | undefined;
  outcome: string;
  now?: Date;
}) {
  if (marketStatusAt(market, now) !== "open") return "This Double Down market is no longer open.";
  if (!account) return "You are not eligible for this Double Down market.";
  if (account.chipsSpent >= DOUBLE_DOWN_CHIP_COUNT) return "You have used all three Double Down chips.";
  if (!market.availableOutcomes.includes(outcome as DoubleDownOutcome)) return "Choose a valid match outcome.";
  return null;
}

export function settleDoubleDownCalls({
  calls,
  accounts,
  outcome,
}: {
  calls: DoubleDownCall[];
  accounts: DoubleDownAccount[];
  outcome: DoubleDownOutcome;
}) {
  const accountsByMember = new Map(accounts.map((account) => [account.memberId, { ...account }]));
  const settledCalls = calls.map((call) => {
    const wasCorrect = call.outcome === outcome;
    const creditsAwarded = wasCorrect ? DOUBLE_DOWN_CORRECT_CREDITS : 0;
    const account = accountsByMember.get(call.memberId);

    if (account) {
      // Recalculate from this market's stored award so result corrections are
      // reversible and repeated settlement is idempotent.
      account.credits += creditsAwarded - call.creditsAwarded;
      account.correctCalls += (wasCorrect ? 1 : 0) - (call.creditsAwarded > 0 ? 1 : 0);
    }

    return { ...call, settledOutcome: outcome, creditsAwarded };
  });

  return { calls: settledCalls, accounts: [...accountsByMember.values()] };
}

export function doubleDownLeaders(accounts: DoubleDownAccount[]) {
  const topCredits = Math.max(0, ...accounts.map((account) => account.credits));
  if (topCredits === 0) return [];
  return accounts.filter((account) => account.credits === topCredits).map((account) => account.memberId);
}

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  DOUBLE_DOWN_CHIP_COUNT,
  canPlaceDoubleDownCall,
  doubleDownLeaders,
  marketStatusAt,
  outcomesForMatch,
  selectDoubleDownCandidate,
  settleDoubleDownCalls,
  type DoubleDownMarket,
} from "@/lib/double-down/engine";
import { buildLeaderboardRows } from "@/lib/world-cup-pool/leaderboard";
import type { EntriesConfig, EntryPicks, PoolResults } from "@/lib/world-cup-pool/types";

const now = new Date("2026-07-01T12:00:00.000Z");
const participants = [
  { memberId: "a", name: "Alex", representativeEntryId: "entry-a", representativeEntryName: "Alex (1)", rank: 1, canReachPayout: true },
  { memberId: "b", name: "Bea", representativeEntryId: "entry-b", representativeEntryName: "Bea", rank: 2, canReachPayout: true },
  { memberId: "out", name: "Out", representativeEntryId: "entry-out", representativeEntryName: "Out", rank: 8, canReachPayout: false },
];

const market: DoubleDownMarket = {
  id: "market-1", poolId: "pool-1", matchId: "match-1", status: "open",
  homeTeam: "Spain", awayTeam: "France", detail: "Semi-final",
  opensAt: "2026-07-01T10:00:00.000Z", locksAt: "2026-07-02T12:00:00.000Z",
  availableOutcomes: ["home", "away"], impactSummary: "A close race.", representativeEntries: {},
};

describe("Double Down market selection", () => {
  it("uses group outcomes and chooses the earliest match that matters to two payout-live members", () => {
    const candidate = selectDoubleDownCandidate({
      now,
      participants,
      matches: [
        { id: "quiet", date: "2026-07-01T13:00:00.000Z", homeTeam: "A", awayTeam: "B", detail: "", group: "A", completed: false, state: "pre" },
        { id: "live", date: "2026-07-01T14:00:00.000Z", homeTeam: "C", awayTeam: "D", detail: "", group: "B", completed: false, state: "pre" },
      ],
      impacts: [
        { memberId: "a", matchId: "quiet", outcomes: [{ outcome: "home", rankDelta: 1, pointDelta: 0 }] },
        { memberId: "a", matchId: "live", outcomes: [{ outcome: "home", rankDelta: 1, pointDelta: 0 }] },
        { memberId: "b", matchId: "live", outcomes: [{ outcome: "away", rankDelta: 1, pointDelta: 2 }] },
        { memberId: "out", matchId: "live", outcomes: [{ outcome: "draw", rankDelta: 3, pointDelta: 4 }] },
      ],
    });

    expect(candidate).toMatchObject({ match: { id: "live" }, participantCount: 2 });
    expect(candidate?.availableOutcomes).toEqual(["home", "draw", "away"]);
    expect(outcomesForMatch({ homeTeam: "A", awayTeam: "B" })).toEqual(["home", "away"]);
  });

  it("does not manufacture a market without two affected eligible members", () => {
    expect(selectDoubleDownCandidate({
      now,
      participants,
      matches: [{ id: "m", date: "2026-07-02T12:00:00.000Z", homeTeam: "A", awayTeam: "B", detail: "", completed: false, state: "pre" }],
      impacts: [{ memberId: "a", matchId: "m", outcomes: [{ outcome: "home", rankDelta: 1, pointDelta: 0 }] }],
    })).toBeNull();
  });
});

describe("Double Down calls", () => {
  it("enforces the server-side market window, chip cap, and match outcomes", () => {
    expect(marketStatusAt(market, now)).toBe("open");
    expect(canPlaceDoubleDownCall({ market, account: { memberId: "a", chipsSpent: DOUBLE_DOWN_CHIP_COUNT, credits: 0, correctCalls: 0 }, outcome: "home", now })).toMatch(/all three/);
    expect(canPlaceDoubleDownCall({ market, account: { memberId: "a", chipsSpent: 0, credits: 0, correctCalls: 0 }, outcome: "draw", now })).toMatch(/valid/);
    expect(canPlaceDoubleDownCall({ market, account: { memberId: "a", chipsSpent: 0, credits: 0, correctCalls: 0 }, outcome: "home", now })).toBeNull();
    expect(canPlaceDoubleDownCall({ market, account: { memberId: "a", chipsSpent: 0, credits: 0, correctCalls: 0 }, outcome: "home", now: new Date("2026-07-02T12:00:00.000Z") })).toMatch(/no longer open/);
  });

  it("settles idempotently and reverses credits when an official result is corrected", () => {
    const calls = [{ id: "call-a", marketId: "market-1", memberId: "a", memberName: "Alex", outcome: "home" as const, placedAt: now.toISOString(), creditsAwarded: 0 }];
    const accounts = [{ memberId: "a", chipsSpent: 1, credits: 0, correctCalls: 0 }];
    const first = settleDoubleDownCalls({ calls, accounts, outcome: "home" });
    const repeated = settleDoubleDownCalls({ calls: first.calls, accounts: first.accounts, outcome: "home" });
    const corrected = settleDoubleDownCalls({ calls: repeated.calls, accounts: repeated.accounts, outcome: "away" });

    expect(first.accounts[0]).toMatchObject({ credits: 2, correctCalls: 1 });
    expect(repeated.accounts[0]).toMatchObject({ credits: 2, correctCalls: 1 });
    expect(corrected.accounts[0]).toMatchObject({ credits: 0, correctCalls: 0 });
    expect(doubleDownLeaders(first.accounts)).toEqual(["a"]);
  });

  it("cannot change any main-pool score or rank", () => {
    const dataDirectory = path.join(process.cwd(), "src", "data", "marcins-world-cup-2026");
    const entriesConfig = JSON.parse(readFileSync(path.join(dataDirectory, "entries.json"), "utf8")) as EntriesConfig;
    const results = JSON.parse(readFileSync(path.join(dataDirectory, "results.json"), "utf8")) as PoolResults;
    const picksByPath = new Map<string, EntryPicks>(entriesConfig.entries.flatMap((entry) => {
      if (!entry.picksPath) return [];
      return [[entry.picksPath, JSON.parse(readFileSync(path.join(dataDirectory, path.basename(entry.picksPath)), "utf8")) as EntryPicks] as const];
    }));
    const before = buildLeaderboardRows(entriesConfig, picksByPath, results).map((row) => [row.id, row.rank, row.score.total]);

    settleDoubleDownCalls({
      calls: [{ id: "call", marketId: "market", memberId: "a", memberName: "Alex", outcome: "home", placedAt: now.toISOString(), creditsAwarded: 0 }],
      accounts: [{ memberId: "a", chipsSpent: 1, credits: 0, correctCalls: 0 }],
      outcome: "home",
    });

    expect(buildLeaderboardRows(entriesConfig, picksByPath, results).map((row) => [row.id, row.rank, row.score.total])).toEqual(before);
  });
});

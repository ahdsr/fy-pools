import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import entriesJson from "@/data/marcins-world-cup-2026/entries.json";
import picksJson from "@/data/marcins-world-cup-2026/picks.json";
import picksVarunJson from "@/data/marcins-world-cup-2026/picks-varun.json";
import resultsJson from "@/data/marcins-world-cup-2026/results.json";
import {
  buildLeaderboardRows,
  buildPoolAnalytics,
} from "@/lib/world-cup-pool/leaderboard";
import { buildOpponentPathsReport } from "@/lib/world-cup-pool/opponent-paths";
import {
  teamCanStillEarnFinalPosition,
  teamIsStillAlive,
} from "@/lib/world-cup-pool/team-eligibility";
import type {
  EntriesConfig,
  EntryPicks,
  PoolResults,
} from "@/lib/world-cup-pool/types";

const lucasEntry = entriesJson.entries.find(
  (entry) => entry.id === "lucas-sokolowski",
);
const varunEntry = entriesJson.entries.find((entry) => entry.id === "varun");

function fixture() {
  if (!lucasEntry || !varunEntry) {
    throw new Error("Expected Lucas and Varun fixture entries.");
  }

  const entriesConfig: EntriesConfig = {
    poolName: entriesJson.poolName,
    prizePoolLabel: entriesJson.prizePoolLabel,
    payouts: entriesJson.payouts,
    entries: [lucasEntry, varunEntry],
  };
  const picksByPath = new Map<string, EntryPicks>([
    [lucasEntry.picksPath ?? "", picksJson as EntryPicks],
    [varunEntry.picksPath ?? "", picksVarunJson as EntryPicks],
  ]);

  return {
    entriesConfig,
    picksByPath,
    results: resultsJson as PoolResults,
  };
}

function fullFixture() {
  const dataDir = path.join(
    process.cwd(),
    "src",
    "data",
    "marcins-world-cup-2026",
  );
  const entriesConfig = entriesJson as EntriesConfig;
  const picksByPath = new Map<string, EntryPicks>();

  for (const entry of entriesConfig.entries) {
    if (!entry.picksPath) continue;

    const fileName = path.basename(entry.picksPath);
    const picks = JSON.parse(
      readFileSync(path.join(dataDir, fileName), "utf8"),
    ) as EntryPicks;
    picksByPath.set(entry.picksPath, picks);
  }

  return {
    entriesConfig,
    picksByPath,
    results: resultsJson as PoolResults,
  };
}

describe("World Cup projection eligibility", () => {
  it("does not use eliminated teams in leader route events", () => {
    const { entriesConfig, picksByPath, results } = fixture();
    const report = buildOpponentPathsReport({
      entriesConfig,
      picksByPath,
      results,
      entryId: "varun",
    });
    const leaderPath = report?.opponents.find(
      (opponent) => opponent.id === "lucas-sokolowski",
    );
    const eventText = leaderPath?.routeEvents
      .map((event) => `${event.title} ${event.teams.join(" ")}`)
      .join("\n");

    expect(eventText).toBeDefined();
    expect(eventText).not.toMatch(/Netherlands/i);
  });

  it("does not count eliminated champion picks in max possible points", () => {
    const { entriesConfig, picksByPath, results } = fixture();
    const varunPicks = picksVarunJson as EntryPicks;
    const rows = buildLeaderboardRows(entriesConfig, picksByPath, results);
    const analytics = buildPoolAnalytics(
      entriesConfig,
      picksByPath,
      results,
      rows,
    );
    const varun = analytics.rows.find((row) => row.id === "varun");

    expect(varun).toBeDefined();
    expect(
      teamCanStillEarnFinalPosition({
        results,
        picks: varunPicks,
        positionKey: "champion",
        team: "Netherlands",
      }),
    ).toBe(false);
    expect(varun?.remaining.finals).toBe(
      varunPicks.scoringRules.runnerUp + varunPicks.scoringRules.thirdPlace,
    );
  });

  it("does not surface eliminated knockout teams in any leader route", () => {
    const { entriesConfig, picksByPath, results } = fullFixture();
    const rows = buildLeaderboardRows(entriesConfig, picksByPath, results);
    const leader = rows[0];

    expect(leader).toBeDefined();

    for (const row of rows) {
      if (row.id === leader?.id) continue;

      const report = buildOpponentPathsReport({
        entriesConfig,
        picksByPath,
        results,
        entryId: row.id,
      });
      const leaderPath = report?.opponents.find(
        (opponent) => opponent.id === leader?.id,
      );
      const picks = row.picksPath ? picksByPath.get(row.picksPath) : undefined;
      if (!leaderPath?.routeEvents.length || !picks) continue;

      for (const event of leaderPath.routeEvents) {
        if (event.category !== "Knockout" && event.category !== "Final") {
          continue;
        }

        for (const team of event.teams) {
          expect(
            teamIsStillAlive(results, picks, team),
            `${row.name}: ${event.title}`,
          ).toBe(true);
        }
      }
    }
  });
});

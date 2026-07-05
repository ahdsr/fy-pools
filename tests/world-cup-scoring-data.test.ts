import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import entriesJson from "@/data/marcins-world-cup-2026/entries.json";
import resultsJson from "@/data/marcins-world-cup-2026/results.json";
import { scorePool } from "@/lib/world-cup-pool/scoring";
import type {
  EntriesConfig,
  EntryPicks,
  PoolResults,
} from "@/lib/world-cup-pool/types";

const dataDir = path.join(
  process.cwd(),
  "src",
  "data",
  "marcins-world-cup-2026",
);

function loadPicks() {
  const entriesConfig = entriesJson as EntriesConfig;

  return entriesConfig.entries
    .filter((entry) => entry.picksPath)
    .map((entry) => {
      const picksPath = entry.picksPath ?? "";
      const picks = JSON.parse(
        readFileSync(path.join(dataDir, path.basename(picksPath)), "utf8"),
      ) as EntryPicks;

      return { entry, picks };
    });
}

function includesTeam(teams: string[], team: string) {
  return teams.some((item) => item === team);
}

function countMatchingPicks(
  rows: ReturnType<typeof loadPicks>,
  picker: (picks: EntryPicks) => string,
  team: string,
) {
  return rows.filter(({ picks }) => picker(picks) === team).length;
}

describe("World Cup scoring data", () => {
  it("has complete, internally consistent podium picks for every entry", () => {
    const rows = loadPicks();
    const issues: string[] = [];

    for (const { entry, picks } of rows) {
      const { champion, runnerUp, thirdPlace } = picks.podium;

      if (!champion) issues.push(`${entry.name}: missing champion`);
      if (!runnerUp) issues.push(`${entry.name}: missing runner-up`);
      if (!thirdPlace) issues.push(`${entry.name}: missing third place`);
      if (champion !== picks.knockout.final.winner) {
        issues.push(`${entry.name}: champion does not match final winner`);
      }
      if (!includesTeam(picks.advancement.finalists, champion)) {
        issues.push(`${entry.name}: champion is not a finalist`);
      }
      if (!includesTeam(picks.advancement.finalists, runnerUp)) {
        issues.push(`${entry.name}: runner-up is not a finalist`);
      }
      if (!includesTeam(picks.advancement.thirdPlaceMatch, thirdPlace)) {
        issues.push(`${entry.name}: third place is not in third-place match`);
      }
    }

    expect(rows).toHaveLength(30);
    expect(issues).toEqual([]);
  });

  it("awards podium points from the latest finals result fields", () => {
    const rows = loadPicks();
    const results: PoolResults = {
      ...(resultsJson as PoolResults),
      finals: {
        champion: "Spain",
        runnerUp: "Portugal",
        thirdPlace: "France",
      },
    };
    const firstRules = rows[0]?.picks.scoringRules;

    expect(firstRules).toBeDefined();

    const expectedAggregate =
      countMatchingPicks(rows, (picks) => picks.podium.champion, "Spain") *
        (firstRules?.champion ?? 0) +
      countMatchingPicks(rows, (picks) => picks.podium.runnerUp, "Portugal") *
        (firstRules?.runnerUp ?? 0) +
      countMatchingPicks(rows, (picks) => picks.podium.thirdPlace, "France") *
        (firstRules?.thirdPlace ?? 0);
    const actualAggregate = rows.reduce(
      (sum, { picks }) => sum + scorePool(picks, results).subtotals.finals,
      0,
    );

    expect(actualAggregate).toBe(expectedAggregate);
  });

  it("keeps bonus result keys and bonus subtotal math aligned", () => {
    const rows = loadPicks();
    const results = resultsJson as PoolResults;
    const resultBonusIds = new Set(Object.keys(results.bonus ?? {}));
    const issues: string[] = [];

    for (const { entry, picks } of rows) {
      const pickBonusIds = new Set(picks.bonus.map((bonus) => bonus.id));

      for (const bonusId of pickBonusIds) {
        if (!resultBonusIds.has(bonusId)) {
          issues.push(`${entry.name}: missing bonus result ${bonusId}`);
        }
      }

      const score = scorePool(picks, results);
      const expectedBonus = score.bonus.reduce(
        (sum, bonus) => sum + bonus.points,
        0,
      );
      const expectedTotal =
        score.subtotals.group +
        score.subtotals.knockout +
        score.subtotals.finals +
        score.subtotals.bonus;

      if (score.subtotals.bonus !== expectedBonus) {
        issues.push(`${entry.name}: bonus subtotal mismatch`);
      }
      if (score.total !== expectedTotal) {
        issues.push(`${entry.name}: total/subtotal mismatch`);
      }
    }

    expect(issues).toEqual([]);
  });
});

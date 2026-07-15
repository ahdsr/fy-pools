import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import entriesJson from "@/data/marcins-world-cup-2026/entries.json";
import picksJson from "@/data/marcins-world-cup-2026/picks.json";
import resultsJson from "@/data/marcins-world-cup-2026/results.json";
import { buildLeaderboardRows } from "@/lib/world-cup-pool/leaderboard";
import { buildTournamentRaceModel } from "@/lib/world-cup-pool/tournament-race";
import type {
  EntriesConfig,
  EntryPicks,
  PoolResults,
} from "@/lib/world-cup-pool/types";

function fixture() {
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
    picksByPath.set(
      entry.picksPath,
      JSON.parse(readFileSync(path.join(dataDir, fileName), "utf8")) as EntryPicks,
    );
  }

  return {
    entriesConfig,
    picksByPath,
    results: resultsJson as PoolResults,
    referencePicks: picksJson as EntryPicks,
  };
}

describe("tournament race projections", () => {
  it("starts from the live top ten without changing standings", () => {
    const { entriesConfig, picksByPath, results, referencePicks } = fixture();
    const model = buildTournamentRaceModel({
      entriesConfig,
      picksByPath,
      results,
      referencePicks,
    });
    const liveTopTen = buildLeaderboardRows(entriesConfig, picksByPath, results)
      .slice(0, 10)
      .map((row) => ({
        id: row.id,
        name: row.name,
        rank: row.rank,
        total: row.score.total,
      }));

    expect(model?.trackedEntries).toEqual(liveTopTen);
    expect(model?.checkpoints).toEqual([
      { id: "current", label: "Now", entries: liveTopTen },
    ]);
    expect(model?.matches).toHaveLength(8);
  });

  it("unlocks the later bracket rounds and carries winners and losers through them", () => {
    const { entriesConfig, picksByPath, results, referencePicks } = fixture();
    const model = buildTournamentRaceModel({
      entriesConfig,
      picksByPath,
      results,
      referencePicks,
      selections: {
        "400021536": "France",
        "400021538": "Spain",
        "400021539": "England",
        "400021537": "Argentina",
        "400021541": "France",
        "400021540": "Argentina",
        "400021542": "England",
        "400021543": "France",
      },
    });

    const semiFinal = model?.matches.find((match) => match.id === "400021541");
    const thirdPlace = model?.matches.find((match) => match.id === "400021542");
    const final = model?.matches.find((match) => match.id === "400021543");

    expect(semiFinal).toMatchObject({
      homeTeam: "France",
      awayTeam: "Spain",
      winner: "France",
    });
    expect(thirdPlace).toMatchObject({
      stage: "thirdPlace",
      label: "3rd-place match",
      homeTeam: "Spain",
      awayTeam: "England",
      winner: "England",
    });
    expect(final).toMatchObject({
      homeTeam: "France",
      awayTeam: "Argentina",
      winner: "France",
    });
    expect(model?.selectionCount).toBe(8);
    expect(model?.checkpoints).toHaveLength(9);
    expect(model?.checkpoints.slice(1).map((checkpoint) => checkpoint.label)).toEqual([
      "France",
      "Spain",
      "England",
      "Argentina",
      "France",
      "Argentina",
      "England",
      "France",
    ]);
  });

  it("drops impossible downstream selections until their teams are known", () => {
    const { entriesConfig, picksByPath, results, referencePicks } = fixture();
    const model = buildTournamentRaceModel({
      entriesConfig,
      picksByPath,
      results,
      referencePicks,
      selections: { "400021541": "France" },
    });

    expect(model?.normalizedSelections).toEqual({});
    expect(model?.matches.find((match) => match.id === "400021541")).toMatchObject({
      homeTeam: "",
      awayTeam: "",
      selectable: false,
    });
  });
});

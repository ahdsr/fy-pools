import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { createDefaultNbaSeriesSettings, createNbaSimulation, validateNbaSeriesSettings } from "@/lib/nba-series/draft";
import { scoreNbaSeriesEntry } from "@/lib/nba-series/scoring";
import { recordSeriesResult, resolveBracketSimulation } from "@/lib/templates/bracket-simulation";
import { getPoolTemplateRuntime, rankStandings } from "@/lib/templates/lifecycle";

describe("NBA Series Bracket", () => {
  it("creates a valid seeded 16-team playoff field after commissioner details are supplied", () => {
    const settings = createDefaultNbaSeriesSettings();
    settings.basics.commissionerName = "Commissioner";

    expect(validateNbaSeriesSettings(settings)).toBeNull();
    expect(settings.teams.filter((team) => team.conference === "east")).toHaveLength(8);
    expect(settings.teams.filter((team) => team.conference === "west")).toHaveLength(8);
  });

  it("simulates all 15 series in order and scores winner plus exact score line items", () => {
    const settings = createDefaultNbaSeriesSettings();
    settings.basics.commissionerName = "Commissioner";
    let simulation = createNbaSimulation(settings);
    const picks: Record<string, { winner: string; winnerWins: number; loserWins: number }> = {};

    for (const template of simulation.series) {
      const series = resolveBracketSimulation(simulation).find((item) => item.id === template.id)!;
      const result = { winner: series.homeTeam!, winnerWins: 4, loserWins: 2 };
      picks[series.id] = result;
      simulation = recordSeriesResult({ simulation, seriesId: series.id, result });
    }

    settings.results = simulation.results;
    const score = scoreNbaSeriesEntry({ settings, picks: { series: picks } });

    expect(Object.keys(simulation.results)).toHaveLength(15);
    expect(simulation.results["nba-finals"]?.winner).toBe("Celtics");
    expect(score.total).toBe(45);
    expect(score.maxPoints).toBe(45);
    expect(score.lines).toHaveLength(30);
  });

  it("ships a database lock dispatcher and a dedicated NBA submission transaction", () => {
    const migration = readFileSync(
      join(process.cwd(), "supabase/migrations/20260716001000_nba_series_runtime.sql"),
      "utf8",
    );

    expect(migration).toContain("nba_series_effective_pick_lock_at");
    expect(migration).toContain("assert_template_pick_write_is_open");
    expect(migration).toContain("submit_nba_series_picks_transaction");
    expect(migration).toContain("replace_template_score_snapshot");
  });

  it("qualifies the entry-pick table column so NBA submissions cannot collide with the RPC output field", () => {
    const migration = readFileSync(
      join(process.cwd(), "supabase/migrations/20260716003000_fix_nba_submission_entry_id_ambiguity.sql"),
      "utf8",
    );

    expect(migration).toContain("existing_pick.entry_id = v_entry_id");
    expect(migration).not.toContain("where entry_id=v_entry_id");
    const conflictFix = readFileSync(join(process.cwd(), "supabase/migrations/20260716005000_fix_template_submission_conflict_ambiguity.sql"), "utf8");
    expect(conflictFix).toContain("on conflict on constraint entry_picks_entry_id_template_version_id_key");
  });

  it("can replay or reset simulation scoring from the stored result payload", () => {
    const settings = createDefaultNbaSeriesSettings();
    settings.basics.commissionerName = "Commissioner";
    const firstSeries = createNbaSimulation(settings).series[0]!;
    const picks = {
      series: {
        [firstSeries.id]: { winner: "Celtics", winnerWins: 4, loserWins: 1 },
      },
    };

    settings.results = { [firstSeries.id]: picks.series[firstSeries.id]! };
    expect(scoreNbaSeriesEntry({ settings, picks }).total).toBe(3);

    settings.results = {};
    expect(scoreNbaSeriesEntry({ settings, picks }).total).toBe(0);
    expect(scoreNbaSeriesEntry({ settings, picks }).maxPoints).toBe(45);
  });

  it("uses the shared runtime detector and deterministic leaderboard tie policy", () => {
    expect(getPoolTemplateRuntime({ nbaSeries: createDefaultNbaSeriesSettings() })).toBe(
      "nba-series",
    );
    expect(
      rankStandings([
        { entryId: "b", entryName: "Bea", total: 4, maxPoints: 5, submittedAt: "", lines: [] },
        { entryId: "a", entryName: "Alex", total: 4, maxPoints: 5, submittedAt: "", lines: [] },
        { entryId: "c", entryName: "Chris", total: 2, maxPoints: 5, submittedAt: "", lines: [] },
      ]).map((row) => [row.entryName, row.rank]),
    ).toEqual([
      ["Alex", 1],
      ["Bea", 1],
      ["Chris", 3],
    ]);
  });
});

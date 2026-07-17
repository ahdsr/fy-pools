import { describe, expect, it } from "vitest";

import { createDefaultF1GrandPrixSettings } from "@/lib/ranked-finish/f1";
import { createDefaultGolfPgaTopFiveSettings } from "@/lib/ranked-finish/golf";
import { createDefaultAtpTopFourSettings } from "@/lib/ranked-finish/tennis";
import { RANKED_FINISH_TEMPLATES } from "@/lib/ranked-finish/templates";
import {
  recordRankedFinishResult,
  resetRankedFinishResults,
  scoreRankedFinishEntry,
  validateRankedFinishPicks,
  validateRankedFinishSettings,
} from "@/lib/ranked-finish/engine";
import { getTemplateRuntimeDefinition } from "@/lib/templates/definitions";
import { getPoolTemplateRuntime } from "@/lib/templates/lifecycle";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("ranked-finish template runtime", () => {
  it("models F1 qualifying and race positions without bracket assumptions", () => {
    const settings = createDefaultF1GrandPrixSettings();
    settings.basics.commissionerName = "Commissioner";
    expect(validateRankedFinishSettings(settings)).toBeNull();
    expect(settings.markets.map((market) => market.id)).toEqual(["qualifying", "race"]);
  });

  it("records each market result sequentially, scores exact positions, and can reset", () => {
    let settings = createDefaultF1GrandPrixSettings();
    settings = recordRankedFinishResult({ settings, marketId: "qualifying", competitorId: "driver-1" });
    settings = recordRankedFinishResult({ settings, marketId: "qualifying", competitorId: "driver-2" });
    settings = recordRankedFinishResult({ settings, marketId: "qualifying", competitorId: "driver-3" });
    settings = recordRankedFinishResult({ settings, marketId: "race", competitorId: "driver-3" });
    settings = recordRankedFinishResult({ settings, marketId: "race", competitorId: "driver-2" });
    settings = recordRankedFinishResult({ settings, marketId: "race", competitorId: "driver-1" });
    const picks = { markets: { qualifying: ["driver-1", "driver-2", "driver-3"], race: ["driver-3", "driver-2", "driver-1"] } };
    expect(validateRankedFinishPicks(settings, picks)).toBeNull();
    expect(scoreRankedFinishEntry({ settings, picks }).total).toBe(15);
    expect(resetRankedFinishResults(settings).results).toEqual({});
  });

  it("registers F1 as a reusable ranked-finish runtime", () => {
    expect(getTemplateRuntimeDefinition("f1-grand-prix-predictor")).toMatchObject({ runtime: "ranked-finish", availability: "available", supportsSimulation: true });
    expect(getPoolTemplateRuntime({ rankedFinish: createDefaultF1GrandPrixSettings() })).toBe("ranked-finish");
  });

  it("keeps all ranked-finish setup differences in the shared template registry", () => {
    expect(RANKED_FINISH_TEMPLATES.map((template) => ({
      slug: template.slug,
      competitionSlug: template.competitionSlug,
      lockSession: template.setup.catalogLockSessionId,
      settingsSlug: template.createDefaultSettings().templateSlug,
    }))).toEqual([
      {
        slug: "f1-grand-prix-predictor",
        competitionSlug: "formula-1",
        lockSession: "qualifying",
        settingsSlug: "f1-grand-prix-predictor",
      },
      {
        slug: "golf-pga-top-five-predictor",
        competitionSlug: "pga-tour",
        lockSession: "first-tee",
        settingsSlug: "golf-pga-top-five-predictor",
      },
      {
        slug: "tennis-atp-top-four-predictor",
        competitionSlug: "atp-tour",
        lockSession: "first-serve",
        settingsSlug: "tennis-atp-top-four-predictor",
      },
    ]);
  });

  it("reuses ranked-finish validation and scoring for a PGA Top Five card", () => {
    let settings = createDefaultGolfPgaTopFiveSettings();
    settings.basics.commissionerName = "Commissioner";
    settings = recordRankedFinishResult({ settings, marketId: "final-standings", competitorId: "golfer-1" });
    settings = recordRankedFinishResult({ settings, marketId: "final-standings", competitorId: "golfer-2" });
    const picks = { markets: { "final-standings": ["golfer-1", "golfer-2", "golfer-3", "golfer-4", "golfer-5"] } };
    expect(validateRankedFinishSettings(settings)).toBeNull();
    expect(validateRankedFinishPicks(settings, picks)).toBeNull();
    expect(scoreRankedFinishEntry({ settings, picks }).total).toBe(6);
    expect(getTemplateRuntimeDefinition("golf-pga-top-five-predictor")).toMatchObject({ runtime: "ranked-finish", availability: "available", supportsSimulation: true });
  });

  it("reuses ranked-finish validation and scoring for an ATP Top Four card", () => {
    let settings = createDefaultAtpTopFourSettings();
    settings.basics.commissionerName = "Commissioner";
    settings = recordRankedFinishResult({ settings, marketId: "final-standings", competitorId: "player-1" });
    const picks = { markets: { "final-standings": ["player-1", "player-2", "player-3", "player-4"] } };
    expect(validateRankedFinishSettings(settings)).toBeNull();
    expect(validateRankedFinishPicks(settings, picks)).toBeNull();
    expect(scoreRankedFinishEntry({ settings, picks }).total).toBe(3);
    expect(getTemplateRuntimeDefinition("tennis-atp-top-four-predictor")).toMatchObject({ runtime: "ranked-finish", availability: "available", supportsSimulation: true });
  });

  it("ships a protected ranked-finish submission transaction and lock dispatcher", () => {
    const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260716004000_ranked_finish_runtime.sql"), "utf8");
    expect(migration).toContain("ranked_finish_effective_pick_lock_at");
    expect(migration).toContain("submit_ranked_finish_picks_transaction");
    expect(migration).toContain("v_settings ? 'rankedFinish'");
    const conflictFix = readFileSync(join(process.cwd(), "supabase/migrations/20260716005000_fix_template_submission_conflict_ambiguity.sql"), "utf8");
    expect(conflictFix).toContain("on conflict on constraint entry_pick_items_entry_pick_id_template_pick_field_id_key");
  });
});

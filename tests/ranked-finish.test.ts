import { describe, expect, it } from "vitest";

import { createDefaultF1GrandPrixSettings } from "@/lib/ranked-finish/f1";
import {
  recordRankedFinishResult,
  resetRankedFinishResults,
  scoreRankedFinishEntry,
  validateRankedFinishPicks,
  validateRankedFinishSettings,
} from "@/lib/ranked-finish/engine";
import { getTemplateRuntimeDefinition } from "@/lib/templates/definitions";

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
    expect(getTemplateRuntimeDefinition("f1-grand-prix-predictor")).toMatchObject({ runtime: "ranked-finish", supportsSimulation: true });
  });
});

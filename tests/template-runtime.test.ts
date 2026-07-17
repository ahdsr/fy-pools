import { describe, expect, it } from "vitest";

import {
  createNbaPlayoffSimulation,
  getNextPlayableSeries,
  recordSeriesResult,
  resolveBracketSimulation,
} from "@/lib/templates/bracket-simulation";
import {
  canLaunchCatalogTemplate,
  getAllTemplates,
} from "@/lib/templates/catalog";
import { getTemplateRuntimeDefinition } from "@/lib/templates/definitions";
import { createDefaultNbaSeriesSettings } from "@/lib/nba-series/draft";
import { createDefaultF1GrandPrixSettings } from "@/lib/ranked-finish/f1";
import { createDefaultGolfPgaTopFiveSettings } from "@/lib/ranked-finish/golf";
import { resolvePoolRuntimeTarget } from "@/lib/templates/runtime-dispatch";

function persistedRankedFinishTemplate({
  slug,
  name,
  description,
  eventNoun,
  competitorNoun,
  lockLabel,
}: {
  slug: string;
  name: string;
  description: string;
  eventNoun: string;
  competitorNoun: string;
  lockLabel: string;
}) {
  return {
    slug,
    name,
    description,
    config: {
      runtime: "ranked-finish",
      rankedFinish: { eventNoun, competitorNoun, lockLabel },
    },
  };
}

describe("template runtime foundation", () => {
  it("only exposes executable formats as launchable", () => {
    const templates = getAllTemplates();
    const launchableSlugs = templates
      .filter(canLaunchCatalogTemplate)
      .map((template) => template.slug);

    expect(launchableSlugs).toEqual([
      "f1-grand-prix-predictor",
      "world-cup-quarter-final-pickem",
      "world-cup-semi-final-pickem",
      "nba-series-bracket",
      "tennis-atp-top-four-predictor",
      "golf-pga-top-five-predictor",
    ]);
    expect(
      canLaunchCatalogTemplate(
        templates.find((template) => template.slug === "nba-series-bracket")!,
      ),
    ).toBe(true);
  });

  it("keeps structural NBA template fields and its simulation capability together", () => {
    const definition = getTemplateRuntimeDefinition("nba-series-bracket");

    expect(definition).toMatchObject({
      runtime: "series-bracket",
      availability: "available",
      supportsSimulation: true,
      lockPolicy: { scope: "event", defaultBufferMinutes: 15 },
    });
    expect(definition?.pickFields).toHaveLength(15);
    expect(definition?.pickFields[0]).toMatchObject({
      pickType: "series_score",
      config: { bestOf: 7 },
    });
  });

  it("simulates an NBA-style bracket strictly in played-game order", () => {
    let simulation = createNbaPlayoffSimulation();

    expect(() =>
      recordSeriesResult({
        simulation,
        seriesId: "nba-finals",
        result: { winner: "East 1", winnerWins: 4, loserWins: 1 },
      }),
    ).toThrow("not ready");

    while (getNextPlayableSeries(simulation)) {
      const series = getNextPlayableSeries(simulation)!;
      simulation = recordSeriesResult({
        simulation,
        seriesId: series.id,
        result: {
          winner: series.homeTeam!,
          winnerWins: 4,
          loserWins: 2,
        },
      });
    }

    const final = resolveBracketSimulation(simulation).find(
      (series) => series.id === "nba-finals",
    );
    expect(final?.result).toEqual({
      winner: "East 1",
      winnerWins: 4,
      loserWins: 2,
    });
    expect(Object.keys(simulation.results)).toHaveLength(15);
  });

  it("rejects impossible series scores before they can advance a bracket", () => {
    const simulation = createNbaPlayoffSimulation();

    expect(() =>
      recordSeriesResult({
        simulation,
        seriesId: "east-r1-1",
        result: { winner: "East 1", winnerWins: 4, loserWins: 4 },
      }),
    ).toThrow("not valid");
  });

  it("dispatches persisted pools to one runtime without sport-specific route probing", () => {
    expect(resolvePoolRuntimeTarget({ roundOf16: {} })).toEqual({ runtime: "round-of-16" });
    expect(resolvePoolRuntimeTarget({ nbaSeries: createDefaultNbaSeriesSettings() })).toEqual({ runtime: "nba-series" });
    expect(resolvePoolRuntimeTarget(
      { rankedFinish: createDefaultF1GrandPrixSettings() },
      persistedRankedFinishTemplate({
        slug: "f1-grand-prix-predictor",
        name: "F1 Grand Prix Predictor",
        description: "Qualifying and race exact-position predictions.",
        eventNoun: "race weekend",
        competitorNoun: "driver",
        lockLabel: "before qualifying",
      }),
    )).toMatchObject({
      runtime: "ranked-finish",
      templateSlug: "f1-grand-prix-predictor",
      competitorNoun: "driver",
    });
    expect(resolvePoolRuntimeTarget(
      { rankedFinish: createDefaultGolfPgaTopFiveSettings() },
      persistedRankedFinishTemplate({
        slug: "golf-pga-top-five-predictor",
        name: "PGA Tour Top Five Predictor",
        description: "Exact top-five finishing-position predictions.",
        eventNoun: "tournament",
        competitorNoun: "golfer",
        lockLabel: "before the first tee time",
      }),
    )).toMatchObject({
      runtime: "ranked-finish",
      templateSlug: "golf-pga-top-five-predictor",
      competitorNoun: "golfer",
    });
    expect(resolvePoolRuntimeTarget({ rankedFinish: { templateSlug: "unknown" } })).toBeNull();
  });

  it("keeps a published ranked-finish pool routable after its setup template is retired", () => {
    const settings = createDefaultF1GrandPrixSettings();
    settings.templateSlug = "retired-race-predictor";

    expect(resolvePoolRuntimeTarget(
      { rankedFinish: settings },
      persistedRankedFinishTemplate({
        slug: "retired-race-predictor",
        name: "Retired Race Predictor",
        description: "A version already in use by a published pool.",
        eventNoun: "race weekend",
        competitorNoun: "driver",
        lockLabel: "before qualifying",
      }),
    )).toMatchObject({
      runtime: "ranked-finish",
      templateSlug: "retired-race-predictor",
      templateName: "Retired Race Predictor",
    });
  });
});

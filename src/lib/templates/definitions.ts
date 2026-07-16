import type { TemplateRuntimeDefinition } from "@/lib/templates/runtime";
import { F1_GRAND_PRIX_TEMPLATE_SLUG } from "@/lib/ranked-finish/f1";
import { GOLF_PGA_TOP_FIVE_TEMPLATE_SLUG } from "@/lib/ranked-finish/golf";

const NBA_SERIES_IDS = [
  "east-r1-1",
  "east-r1-2",
  "east-r1-3",
  "east-r1-4",
  "west-r1-1",
  "west-r1-2",
  "west-r1-3",
  "west-r1-4",
  "east-sf-1",
  "east-sf-2",
  "west-sf-1",
  "west-sf-2",
  "east-final",
  "west-final",
  "nba-finals",
] as const;

function knockoutDefinition({
  slug,
  label,
  fieldPrefix,
  matchupCount,
}: {
  slug: string;
  label: string;
  fieldPrefix: string;
  matchupCount: number;
}): TemplateRuntimeDefinition {
  return {
    slug,
    version: 1,
    sport: "soccer",
    runtime: "single-elimination",
    availability: "available",
    pickFields: Array.from({ length: matchupCount }, (_, index) => ({
      key: `${fieldPrefix}_${index + 1}_winner`,
      label: `${label} match ${index + 1} winner`,
      pickType: "bracket_winner",
      required: true,
      config: { fieldKind: "match_winner", matchupIndex: index },
    })),
    scoringRules: [
      { key: "match-winner", label: "Correct match winner", points: 3 },
    ],
    lockPolicy: { scope: "event", defaultBufferMinutes: 15 },
    supportsSimulation: true,
  };
}

/**
 * This registry is deliberately structural. A pool instance supplies its
 * actual teams, calendar, enabled props, and commissioner-customised points.
 */
export const TEMPLATE_RUNTIME_DEFINITIONS: readonly TemplateRuntimeDefinition[] = [
  knockoutDefinition({
    slug: "world-cup-quarter-final-pickem",
    label: "Quarter-final",
    fieldPrefix: "qf",
    matchupCount: 3,
  }),
  knockoutDefinition({
    slug: "world-cup-semi-final-pickem",
    label: "Semi-final",
    fieldPrefix: "sf",
    matchupCount: 2,
  }),
  {
    slug: "nba-series-bracket",
    version: 1,
    sport: "basketball",
    runtime: "series-bracket",
    availability: "available",
    pickFields: NBA_SERIES_IDS.map((seriesId, index) => ({
      key: `${seriesId}_score`,
      label: `${seriesId} series score`,
      pickType: "series_score",
      required: true,
      config: { fieldKind: "series_score", seriesIndex: index, bestOf: 7 },
    })),
    scoringRules: [
      { key: "series-winner", label: "Correct series winner", points: 2 },
      { key: "exact-series-score", label: "Exact series score", points: 1 },
    ],
    lockPolicy: { scope: "event", defaultBufferMinutes: 15 },
    supportsSimulation: true,
  },
  {
    slug: F1_GRAND_PRIX_TEMPLATE_SLUG,
    version: 1,
    sport: "motorsport",
    runtime: "ranked-finish",
    availability: "available",
    pickFields: [
      ...Array.from({ length: 3 }, (_, index) => ({ key: `qualifying_p${index + 1}`, label: `Qualifying P${index + 1}`, pickType: "team_bonus" as const, required: true, config: { fieldKind: "ranked_finish", market: "qualifying", position: index + 1 } })),
      ...Array.from({ length: 3 }, (_, index) => ({ key: `race_p${index + 1}`, label: `Race P${index + 1}`, pickType: "team_bonus" as const, required: true, config: { fieldKind: "ranked_finish", market: "race", position: index + 1 } })),
    ],
    scoringRules: [
      { key: "qualifying-position", label: "Correct qualifying position", points: 2 },
      { key: "race-position", label: "Correct race position", points: 3 },
    ],
    lockPolicy: { scope: "event", defaultBufferMinutes: 15 },
    supportsSimulation: true,
  },
  {
    slug: GOLF_PGA_TOP_FIVE_TEMPLATE_SLUG,
    version: 1,
    sport: "golf",
    runtime: "ranked-finish",
    availability: "available",
    pickFields: Array.from({ length: 5 }, (_, index) => ({
      key: `final-standings_p${index + 1}`,
      label: `Final standings P${index + 1}`,
      pickType: "team_bonus" as const,
      required: true,
      config: { fieldKind: "ranked_finish", market: "final-standings", position: index + 1 },
    })),
    scoringRules: [{ key: "exact-final-position", label: "Correct final position", points: 3 }],
    lockPolicy: { scope: "event", defaultBufferMinutes: 15 },
    supportsSimulation: true,
  },
];

export function getTemplateRuntimeDefinition(slug: string) {
  return TEMPLATE_RUNTIME_DEFINITIONS.find((template) => template.slug === slug);
}

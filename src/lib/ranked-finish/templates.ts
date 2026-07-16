import type { CatalogEventSnapshot } from "@/lib/events/types";
import {
  createDefaultF1GrandPrixSettings,
  createF1SettingsFromCatalogEvent,
  F1_GRAND_PRIX_TEMPLATE_SLUG,
} from "@/lib/ranked-finish/f1";
import {
  createDefaultGolfPgaTopFiveSettings,
  createGolfSettingsFromCatalogEvent,
  GOLF_PGA_TOP_FIVE_TEMPLATE_SLUG,
} from "@/lib/ranked-finish/golf";
import type { RankedFinishSettings } from "@/lib/ranked-finish/types";

export type RankedFinishTemplate = {
  slug: string;
  name: string;
  description: string;
  sport: string;
  competitionSlug: string;
  eventNoun: string;
  competitorNoun: string;
  lockLabel: string;
  createDefaultSettings: () => RankedFinishSettings;
  createSettingsFromCatalogEvent: (
    event: CatalogEventSnapshot,
    options?: { commissionerName?: string; poolName?: string; timezone?: string },
  ) => RankedFinishSettings;
};

export const RANKED_FINISH_TEMPLATES: readonly RankedFinishTemplate[] = [
  {
    slug: F1_GRAND_PRIX_TEMPLATE_SLUG,
    name: "F1 Grand Prix Predictor",
    description: "Qualifying and race exact-position predictions.",
    sport: "motorsport",
    competitionSlug: "formula-1",
    eventNoun: "race weekend",
    competitorNoun: "driver",
    lockLabel: "before qualifying",
    createDefaultSettings: createDefaultF1GrandPrixSettings,
    createSettingsFromCatalogEvent: createF1SettingsFromCatalogEvent,
  },
  {
    slug: GOLF_PGA_TOP_FIVE_TEMPLATE_SLUG,
    name: "PGA Tour Top Five Predictor",
    description: "Exact top-five finishing-position predictions.",
    sport: "golf",
    competitionSlug: "pga-tour",
    eventNoun: "tournament",
    competitorNoun: "golfer",
    lockLabel: "before the first tee time",
    createDefaultSettings: createDefaultGolfPgaTopFiveSettings,
    createSettingsFromCatalogEvent: createGolfSettingsFromCatalogEvent,
  },
];

export function getRankedFinishTemplate(slug: string) {
  return RANKED_FINISH_TEMPLATES.find((template) => template.slug === slug);
}

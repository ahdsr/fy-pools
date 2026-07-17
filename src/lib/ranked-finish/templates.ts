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
import {
  ATP_TOP_FOUR_TEMPLATE_SLUG,
  createAtpSettingsFromCatalogEvent,
  createDefaultAtpTopFourSettings,
} from "@/lib/ranked-finish/tennis";
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
  setup: RankedFinishTemplateSetup;
};

export type RankedFinishTemplateSetup = {
  eyebrow: string;
  title: string;
  description: string;
  catalogTitle: string;
  catalogDescription: string;
  seasonLabel: string;
  refreshLabel: string;
  eventLabel: string;
  noEventsMessage: string;
  useEventLabel: string;
  rosterTitle: string;
  rosterReviewLabel: string;
  lockDescription: string;
  publishLabel: string;
  publishedTitle: string;
  publishedDescription: string;
  catalogLockSessionId: string;
};

/**
 * Presentation metadata is persisted with a template version so published
 * pools keep their runtime copy even after an active setup template changes.
 */
export type RankedFinishRuntimeMetadata = Pick<
  RankedFinishTemplate,
  "eventNoun" | "competitorNoun" | "lockLabel"
>;

export function getRankedFinishRuntimeMetadata(
  template: RankedFinishTemplate,
): RankedFinishRuntimeMetadata {
  return {
    eventNoun: template.eventNoun,
    competitorNoun: template.competitorNoun,
    lockLabel: template.lockLabel,
  };
}

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
    setup: {
      eyebrow: "F1 race weekend",
      title: "Set up a Grand Prix Predictor",
      description: "Choose a captured race weekend, review its driver field, then launch exact Top 3 qualifying and race picks.",
      catalogTitle: "Live race weekend",
      catalogDescription: "The roster is captured with the event. Jolpica provides a season roster, so a commissioner must review it before publishing.",
      seasonLabel: "F1 season",
      refreshLabel: "Refresh race weekends",
      eventLabel: "Captured event",
      noEventsMessage: "No captured F1 event is available yet. Refresh the season to load the schedule.",
      useEventLabel: "Use captured race weekend",
      rosterTitle: "Captured driver roster",
      rosterReviewLabel: "I reviewed this captured roster and understand it may change before the provider confirms an event-specific entry list.",
      lockDescription: "Qualifying locks all picks 15 minutes before the session begins.",
      publishLabel: "Publish F1 pool",
      publishedTitle: "Your F1 pool is live",
      publishedDescription: "Share the signup link, collect picks, then enter the qualifying and race results.",
      catalogLockSessionId: "qualifying",
    },
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
    setup: {
      eyebrow: "PGA Tour tournament",
      title: "Set up a PGA Tour Top Five Predictor",
      description: "Choose a published tournament field, review its golfers, then launch exact Top Five finishing-position picks.",
      catalogTitle: "Live PGA tournament field",
      catalogDescription: "The pool uses ESPN's captured tournament field. A future event remains unavailable until ESPN publishes its competitors.",
      seasonLabel: "PGA season",
      refreshLabel: "Refresh tournaments",
      eventLabel: "Captured tournament",
      noEventsMessage: "No captured PGA tournament is available yet. Refresh the season to load the schedule.",
      useEventLabel: "Use captured tournament",
      rosterTitle: "Captured golfer field",
      rosterReviewLabel: "I reviewed this captured tournament field and confirm it is the field this pool should use.",
      lockDescription: "All picks lock 15 minutes before the first scheduled tee time.",
      publishLabel: "Publish Golf pool",
      publishedTitle: "Your Golf pool is live",
      publishedDescription: "Share the signup link, collect picks, then record the final Top Five to verify standings.",
      catalogLockSessionId: "first-tee",
    },
  },
  {
    slug: ATP_TOP_FOUR_TEMPLATE_SLUG,
    name: "ATP Tour Top Four Predictor",
    description: "Exact top-four ATP tournament finishing-position predictions.",
    sport: "tennis",
    competitionSlug: "atp-tour",
    eventNoun: "tournament",
    competitorNoun: "player",
    lockLabel: "before the first main-draw serve",
    createDefaultSettings: createDefaultAtpTopFourSettings,
    createSettingsFromCatalogEvent: createAtpSettingsFromCatalogEvent,
    setup: {
      eyebrow: "ATP Tour tournament",
      title: "Set up an ATP Tour Top Four Predictor",
      description: "Choose a captured ATP tournament, review its player field, then launch exact Top Four finishing-position picks.",
      catalogTitle: "Live ATP tournament field",
      catalogDescription: "The pool uses ESPN's captured men's singles field. A future tournament stays unavailable until ESPN publishes its main-draw players.",
      seasonLabel: "ATP season",
      refreshLabel: "Refresh tournaments",
      eventLabel: "Captured tournament",
      noEventsMessage: "No captured ATP tournament is available yet. Refresh the season to load the schedule.",
      useEventLabel: "Use captured tournament",
      rosterTitle: "Captured player field",
      rosterReviewLabel: "I reviewed this captured tournament field and confirm it is the player field this pool should use.",
      lockDescription: "All picks lock 15 minutes before the first scheduled main-draw serve.",
      publishLabel: "Publish tennis pool",
      publishedTitle: "Your tennis pool is live",
      publishedDescription: "Share the signup link, collect picks, then record the final Top Four to verify standings.",
      catalogLockSessionId: "first-serve",
    },
  },
];

export function getRankedFinishTemplate(slug: string) {
  return RANKED_FINISH_TEMPLATES.find((template) => template.slug === slug);
}

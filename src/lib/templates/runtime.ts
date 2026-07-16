import type { TemplatePickType } from "@/lib/templates/pick-types";

/**
 * The stable contract shared by every pool format. Template implementations
 * can add their own setup and result payloads, but all of them describe picks,
 * scoring, locks, and simulation through this vocabulary.
 */
export const TEMPLATE_RUNTIME_KEYS = [
  "single-elimination",
  "series-bracket",
  "ranked-finish",
] as const;

export type TemplateRuntimeKey = (typeof TEMPLATE_RUNTIME_KEYS)[number];

export type TemplateAvailability = "available" | "coming-soon";

export type TemplatePickFieldDefinition = {
  key: string;
  label: string;
  pickType: TemplatePickType;
  required: boolean;
  /**
   * Structural metadata only. Per-pool teams, labels, points, and schedules
   * belong to the pool instance, never the shared template version.
   */
  config?: Record<string, string | number | boolean>;
};

export type TemplateScoringRuleDefinition = {
  key: string;
  label: string;
  points: number;
};

export type TemplateLockPolicy = {
  scope: "pool" | "event" | "field";
  /** An optional lead time before the event's scheduled start. */
  defaultBufferMinutes?: number;
};

export type TemplateRuntimeDefinition = {
  slug: string;
  version: number;
  sport: string;
  runtime: TemplateRuntimeKey;
  availability: TemplateAvailability;
  pickFields: readonly TemplatePickFieldDefinition[];
  scoringRules: readonly TemplateScoringRuleDefinition[];
  lockPolicy: TemplateLockPolicy;
  supportsSimulation: boolean;
};

export function canLaunchTemplate(
  template: Pick<TemplateRuntimeDefinition, "availability">,
) {
  return template.availability === "available";
}

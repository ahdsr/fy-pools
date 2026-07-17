export const TEMPLATE_RUNTIME_KEYS = [
  "single-elimination",
  "series-bracket",
  "ranked-finish",
] as const;

export type TemplateRuntimeKey = (typeof TEMPLATE_RUNTIME_KEYS)[number];

export type TemplateAvailability = "available" | "coming-soon";

export const DATABASE_FOUNDATION = {
  core: ["pools", "pool_members", "entries", "entry_pick_items"],
  templates: [
    "template_versions",
    "template_stages",
    "template_pick_fields",
    "template_scoring_rules",
  ],
  scoring: ["results", "score_breakdowns", "standings_snapshots"],
} as const;

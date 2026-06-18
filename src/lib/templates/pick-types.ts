export const TEMPLATE_PICK_TYPES = [
  "group_rank",
  "group_advancer",
  "bracket_winner",
  "series_score",
  "match_score",
  "champion",
  "runner_up",
  "third_place",
  "numeric_bonus",
  "team_bonus",
] as const;

export type TemplatePickType = (typeof TEMPLATE_PICK_TYPES)[number];

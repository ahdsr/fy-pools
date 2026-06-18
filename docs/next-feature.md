# Next Most Valuable Feature

Build database design plus Template Library v1 before auth polish.

## Why

The template model drives pool creation, pick entry, validation, scoring,
leaderboards, imports, and commissioner controls.

## Seed Templates

- World Cup Full Predictor: group ranks, advancers, bracket winners, final
  placement, and bonus questions.
- NBA Playoff Series Bracket: series score picks with winners derived from games
  won.

## First Implementation Slice

- Convert the migration draft into a reviewed Supabase migration.
- Add seed data for the two starter templates.
- Build TypeScript types around `template_pick_fields` and
  `entry_pick_items.value`.
- Add scoring fixtures before wiring auth or payments.

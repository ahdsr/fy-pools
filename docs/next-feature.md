# Next Most Valuable Feature

Build the template runtime before launching more template formats.

## Why

The template runtime drives pool creation, pick entry, validation, scoring,
leaderboards, imports, commissioner controls, and repeatable game simulations.

## First Templates

- World Cup Full Predictor: group ranks, advancers, bracket winners, final
  placement, and bonus questions.
- NBA Playoff Series Bracket: series score picks with winners derived from games
  won.

## Runtime Foundation

- Keep template versions structural and immutable; per-pool teams, schedules,
  labels, and point choices belong to the pool instance.
- Register every format with an explicit runtime, availability state, pick
  field contract, scoring rules, and simulation capability.
- Never link a coming-soon format into a live wizard.
- Use deterministic bracket/series simulations that accept completed games in
  order and expose the next playable matchup. Add a fixture for every new
  format before its commissioner and participant UI is built.
- Store simulation outcomes as a replayable pool payload, rebuild standings
  from that payload, and record each simulation/reset in the commissioner audit
  log. A future live provider replaces the source of those outcomes, not the
  scoring path.

## Live Event Catalog Foundation

- Persist provider-neutral event snapshots: event identity, calendar sessions,
  competitors, field certainty, source signature, freshness, and readiness.
- Start with F1/Jolpica. Its season-driver response is useful to prefill a
  commissioner setup, but it is explicitly a provisional roster rather than a
  confirmed race entry list.
- A 36-hour snapshot TTL and protected scheduled refresh make setup usable
  before an event opens without relying on an event being live during testing.
- The event-to-template mapper builds per-pool ranked-finish settings from a
  snapshot and applies the template lock buffer (15 minutes before qualifying).
- NBA and golf should add provider adapters to this same catalog contract;
  templates must consume snapshots rather than reach directly into a provider.

## First Non-Soccer Slice

- NBA Playoff Series Bracket: series score picks with winners derived from
  games won.
- Start with a seeded, provider-independent 16-team playoff simulator. Bind it
  to a live schedule/result provider only after the template lifecycle works
  against deterministic fixtures.

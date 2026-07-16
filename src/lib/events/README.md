# Event Catalog

This module is the provider-neutral boundary between live sports data and pool
setup. Providers normalize their schedules and competitors into
`CatalogEvent`; the rest of the application persists a snapshot, reports its
readiness, and maps it into an individual template's settings.

`f1-jolpica.ts` is the individual-competitor adapter. It treats a season driver
roster as provisional until an event-specific entry list is available.
`nba-espn.ts` is the team/bracket adapter: it requires all 16 seeded playoff
teams and eight first-round series before it marks the event ready. Do not
weaken either distinction when adding golf, NFL, tennis, or later providers: a
missing confirmed field should be visible to the commissioner, not silently
inferred.

Event providers are input sources only. Scoring, lock enforcement, standings,
and simulations remain template-runtime responsibilities.

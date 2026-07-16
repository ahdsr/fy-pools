# Event Catalog

This module is the provider-neutral boundary between live sports data and pool
setup. Providers normalize their schedules and competitors into
`CatalogEvent`; the rest of the application persists a snapshot, reports its
readiness, and maps it into an individual template's settings.

`f1-jolpica.ts` is the first adapter. It treats a season driver roster as
provisional until an event-specific entry list is available. Do not weaken that
distinction when adding NBA, golf, or later F1 providers: a missing confirmed
field should be visible to the commissioner, not silently inferred.

Event providers are input sources only. Scoring, lock enforcement, standings,
and simulations remain template-runtime responsibilities.

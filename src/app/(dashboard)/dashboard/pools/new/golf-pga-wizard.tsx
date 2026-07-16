import type { CatalogEventSnapshot } from "@/lib/events/types";
import { createDefaultGolfPgaTopFiveSettings, createGolfSettingsFromCatalogEvent } from "@/lib/ranked-finish/golf";
import { RankedFinishWizard } from "./ranked-finish-wizard";
import { publishGolfPoolAction, refreshGolfCatalogAction } from "./golf-actions";

export function GolfPgaWizard({ catalogEvents }: { catalogEvents: CatalogEventSnapshot[] }) {
  return <RankedFinishWizard
    catalogEvents={catalogEvents}
    createDefaultSettings={createDefaultGolfPgaTopFiveSettings}
    createSettingsFromCatalogEvent={createGolfSettingsFromCatalogEvent}
    publishAction={publishGolfPoolAction}
    refreshCatalogAction={refreshGolfCatalogAction}
    copy={{
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
      participantNoun: "golfer",
      rosterReviewLabel: "I reviewed this captured tournament field and confirm it is the field this pool should use.",
      lockDescription: "All picks lock 15 minutes before the first scheduled tee time.",
      publishLabel: "Publish Golf pool",
      publishedTitle: "Your Golf pool is live",
      publishedDescription: "Share the signup link, collect picks, then record the final Top Five to verify standings.",
      lockAt: (event) => {
        const firstTee = event.sessions.find((session) => session.id === "first-tee")?.startsAt;
        return firstTee ? new Date(Date.parse(firstTee) - 15 * 60 * 1000).toISOString() : undefined;
      },
    }}
  />;
}

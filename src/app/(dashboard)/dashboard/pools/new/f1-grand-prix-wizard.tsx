import type { CatalogEventSnapshot } from "@/lib/events/types";
import { createDefaultF1GrandPrixSettings, createF1SettingsFromCatalogEvent } from "@/lib/ranked-finish/f1";
import { RankedFinishWizard } from "./ranked-finish-wizard";
import { publishF1PoolAction, refreshF1CatalogAction } from "./f1-actions";

export function F1GrandPrixWizard({ catalogEvents }: { catalogEvents: CatalogEventSnapshot[] }) {
  return <RankedFinishWizard
    catalogEvents={catalogEvents}
    createDefaultSettings={createDefaultF1GrandPrixSettings}
    createSettingsFromCatalogEvent={createF1SettingsFromCatalogEvent}
    publishAction={publishF1PoolAction}
    refreshCatalogAction={refreshF1CatalogAction}
    copy={{
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
      participantNoun: "driver",
      rosterReviewLabel: "I reviewed this captured roster and understand it may change before the provider confirms an event-specific entry list.",
      lockDescription: "Qualifying locks all picks 15 minutes before the session begins.",
      publishLabel: "Publish F1 pool",
      publishedTitle: "Your F1 pool is live",
      publishedDescription: "Share the signup link, collect picks, then enter the qualifying and race results.",
      lockAt: (event) => {
        const qualifying = event.sessions.find((session) => session.id === "qualifying")?.startsAt;
        return qualifying ? new Date(Date.parse(qualifying) - 15 * 60 * 1000).toISOString() : undefined;
      },
    }}
  />;
}

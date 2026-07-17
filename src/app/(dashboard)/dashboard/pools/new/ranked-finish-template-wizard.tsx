import type { CatalogEventSnapshot } from "@/lib/events/types";
import { getRankedFinishTemplate } from "@/lib/ranked-finish/templates";
import {
  publishRankedFinishPoolAction,
  refreshRankedFinishCatalogAction,
} from "./ranked-finish-actions";
import { RankedFinishWizard } from "./ranked-finish-wizard";

export function RankedFinishTemplateWizard({
  templateSlug,
  catalogEvents,
}: {
  templateSlug: string;
  catalogEvents: CatalogEventSnapshot[];
}) {
  const template = getRankedFinishTemplate(templateSlug);
  if (!template) return null;

  const { setup } = template;
  return (
    <RankedFinishWizard
      catalogEvents={catalogEvents}
      createDefaultSettings={template.createDefaultSettings}
      createSettingsFromCatalogEvent={template.createSettingsFromCatalogEvent}
      publishAction={publishRankedFinishPoolAction.bind(null, template.slug)}
      refreshCatalogAction={refreshRankedFinishCatalogAction.bind(null, template.slug)}
      copy={{
        ...setup,
        participantNoun: template.competitorNoun,
        lockAt: (event) =>
          event.sessions.find((session) => session.id === setup.catalogLockSessionId)
            ?.startsAt,
      }}
    />
  );
}

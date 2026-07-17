import "server-only";

import {
  getF1EventCatalogSnapshots,
  getAtpEventCatalogSnapshots,
  getPgaEventCatalogSnapshots,
  refreshAtpEventCatalogForCommissioner,
  refreshF1EventCatalogForCommissioner,
  refreshPgaEventCatalogForCommissioner,
  selectUpcomingCatalogEvents,
} from "@/lib/events/catalog";
import { getRankedFinishTemplate } from "@/lib/ranked-finish/templates";

function templateForCatalog(templateSlug: string) {
  const template = getRankedFinishTemplate(templateSlug);
  if (!template) throw new Error("Ranked-finish template is not supported.");
  return template;
}

export async function getRankedFinishCatalogEvents(templateSlug: string) {
  const template = templateForCatalog(templateSlug);
  switch (template.competitionSlug) {
    case "formula-1":
      return selectUpcomingCatalogEvents(await getF1EventCatalogSnapshots());
    case "pga-tour":
      return selectUpcomingCatalogEvents(await getPgaEventCatalogSnapshots());
    case "atp-tour":
      return selectUpcomingCatalogEvents(await getAtpEventCatalogSnapshots());
    default:
      throw new Error(`No event catalog adapter is configured for ${template.slug}.`);
  }
}

export async function refreshRankedFinishCatalog(
  templateSlug: string,
  season?: string,
) {
  const template = templateForCatalog(templateSlug);
  switch (template.competitionSlug) {
    case "formula-1":
      return refreshF1EventCatalogForCommissioner(season);
    case "pga-tour":
      return refreshPgaEventCatalogForCommissioner(season);
    case "atp-tour":
      return refreshAtpEventCatalogForCommissioner(season);
    default:
      throw new Error(`No event catalog adapter is configured for ${template.slug}.`);
  }
}

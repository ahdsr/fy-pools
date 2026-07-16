import { PageShell } from "@/components/app/page-shell";
import { getF1EventCatalogSnapshots, selectUpcomingCatalogEvents } from "@/lib/events/catalog";
import { F1EventCatalog } from "./f1-event-catalog";

export const unstable_instant = false;

export default async function EventCatalogPage() {
  const events = selectUpcomingCatalogEvents(await getF1EventCatalogSnapshots());

  return (
    <PageShell
      eyebrow="Live setup data"
      title="Prepare event-backed pools"
      description="Keep schedules and competitor fields ready before a tournament opens, then launch from a reviewed event snapshot instead of building a field by hand."
      showHeader={false}
    >
      <F1EventCatalog events={events} />
    </PageShell>
  );
}

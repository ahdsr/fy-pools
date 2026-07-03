import { notFound } from "next/navigation";

import { PageShell } from "@/components/app/page-shell";
import { Badge } from "@/components/ui/badge";
import { getCommissionerRoundOf16AdminPool } from "@/lib/round-of-16/persistence";
import { EditPoolForm } from "./edit-pool-form";

type EditPoolPageProps = {
  params: Promise<{ poolId: string }>;
};

export const dynamic = "force-dynamic";

export default async function EditPoolPage({ params }: EditPoolPageProps) {
  const { poolId } = await params;
  const pool = await getCommissionerRoundOf16AdminPool(poolId);

  if (!pool) notFound();

  return (
    <PageShell
      eyebrow="Pool admin"
      title={`Edit ${pool.poolName}`}
      description="Manage the basic owner-facing settings for this published pool."
      showHeader={false}
      heroAction={<Badge variant="outline">{pool.status}</Badge>}
    >
      <EditPoolForm pool={pool} />
    </PageShell>
  );
}

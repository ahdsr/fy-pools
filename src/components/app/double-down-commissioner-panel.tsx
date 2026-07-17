import { Target } from "lucide-react";

import { setDoubleDownEnabledFormAction } from "@/app/(dashboard)/dashboard/pools/double-down-actions";
import { Button } from "@/components/ui/button";
import { LedgerPanel } from "@/components/app/ledger";
import { getDoubleDownCommissionerSettings } from "@/lib/double-down/persistence";

export async function DoubleDownCommissionerPanel({ poolId }: { poolId: string }) {
  const settings = await getDoubleDownCommissionerSettings(poolId);
  if (!settings) return null;

  return (
    <LedgerPanel
      title={<span className="inline-flex items-center gap-2"><Target className="size-5 text-brand-mark" />Double Down</span>}
      description="A non-cash, members-only late-race game. It does not change pool scores, prizes, or payouts."
      action={
        <form action={setDoubleDownEnabledFormAction}>
          <input type="hidden" name="poolId" value={settings.poolId} />
          <Button type="submit" name="enabled" value={settings.enabled ? "false" : "true"} variant={settings.enabled ? "outline" : "primaryGreen"} size="sm">
            {settings.enabled ? "Disable" : "Enable"}
          </Button>
        </form>
      }
    >
      <div className="px-5 py-4 text-sm text-muted-foreground">
        {settings.enabled ? "Enabled. The scorer will automatically open the next qualifying market." : "Disabled by default. Enable when the pool is ready for the late-race side game."}
      </div>
    </LedgerPanel>
  );
}

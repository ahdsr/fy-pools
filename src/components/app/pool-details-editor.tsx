"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { LedgerPanel } from "@/components/app/ledger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type PoolDetailsState = { message?: string; saved?: boolean };

type PoolBasics = {
  poolName: string;
  commissionerName: string;
  description: string;
};

export function PoolDetailsEditor({
  poolId,
  basics,
  updateAction,
}: {
  poolId: string;
  basics: PoolBasics;
  updateAction: (
    state: PoolDetailsState,
    formData: FormData,
  ) => Promise<PoolDetailsState>;
}) {
  const router = useRouter();
  const [state, action, pending] = React.useActionState(updateAction, {});

  React.useEffect(() => {
    if (state.saved) router.refresh();
  }, [router, state.saved]);

  return (
    <LedgerPanel
      title="Pool settings"
      description="Update the pool details shown to participants. Event, roster, and pick lock stay fixed after publishing."
    >
      <form action={action} className="grid gap-4 p-5 sm:grid-cols-2">
        <input type="hidden" name="poolId" value={poolId} />
        <div className="space-y-2">
          <Label htmlFor="pool-name">Pool name</Label>
          <Input id="pool-name" name="poolName" defaultValue={basics.poolName} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="commissioner-name">Commissioner name</Label>
          <Input
            id="commissioner-name"
            name="commissionerName"
            defaultValue={basics.commissionerName}
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="pool-description">Description</Label>
          <Textarea
            id="pool-description"
            name="description"
            defaultValue={basics.description}
          />
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button type="submit" variant="primaryGreen" disabled={pending}>
            {pending ? "Saving…" : "Save pool settings"}
          </Button>
          {state.saved ? <p role="status" className="text-sm text-brand-success">Saved.</p> : null}
          {state.message ? <p role="alert" className="text-sm font-medium text-destructive">{state.message}</p> : null}
        </div>
      </form>
    </LedgerPanel>
  );
}

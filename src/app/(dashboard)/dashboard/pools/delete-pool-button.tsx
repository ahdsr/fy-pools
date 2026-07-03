"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deletePoolAction } from "./actions";

export function DeletePoolButton({
  poolId,
  poolName,
}: {
  poolId: string;
  poolName: string;
}) {
  return (
    <form
      action={deletePoolAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Delete ${poolName}? This removes invites, entries, picks, and standings.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="poolId" value={poolId} />
      <Button type="submit" variant="destructive">
        Delete <Trash2 />
      </Button>
    </form>
  );
}

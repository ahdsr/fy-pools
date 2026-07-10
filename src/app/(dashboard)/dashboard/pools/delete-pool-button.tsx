"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deletePoolAction } from "./actions";

export function DeletePoolButton({
  poolId,
  poolName,
  iconOnly = false,
}: {
  poolId: string;
  poolName: string;
  iconOnly?: boolean;
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
      <Button
        type="submit"
        variant="destructive"
        size={iconOnly ? "icon-sm" : "default"}
        aria-label={`Delete ${poolName}`}
        title={`Delete ${poolName}`}
      >
        {iconOnly ? <Trash2 /> : <>Delete <Trash2 /></>}
      </Button>
    </form>
  );
}

"use client";

import * as React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { confirmDeletePoolAction } from "./delete-action";

export function DeletePoolButton({
  poolId,
  poolName,
  iconOnly = false,
}: {
  poolId: string;
  poolName: string;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [state, action, pending] = React.useActionState(confirmDeletePoolAction, {});

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>
      <Button type="button" variant="destructive" size={iconOnly ? "icon-sm" : "default"} aria-label={`Delete ${poolName}`} title={`Delete ${poolName}`}>
        {iconOnly ? <Trash2 /> : <>Delete <Trash2 /></>}
      </Button>
    </DialogTrigger>
    <DialogContent showCloseButton={!pending}>
      <DialogHeader>
        <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive"><AlertTriangle className="size-5" /></div>
        <DialogTitle>Delete {poolName}?</DialogTitle>
        <DialogDescription>This permanently deletes the pool, all invites, entries, picks, results, and standings. This action cannot be undone.</DialogDescription>
      </DialogHeader>
      {state.message ? <p role="alert" className="text-sm font-medium text-destructive">{state.message}</p> : null}
      <DialogFooter>
        <DialogClose asChild><Button type="button" variant="outline" disabled={pending}>Cancel</Button></DialogClose>
        <form action={action}>
          <input type="hidden" name="poolId" value={poolId} />
          <Button type="submit" variant="destructive" disabled={pending}>{pending ? "Deleting…" : "Delete pool"} <Trash2 /></Button>
        </form>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}

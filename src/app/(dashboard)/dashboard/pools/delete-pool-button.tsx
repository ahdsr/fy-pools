"use client";

import * as React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  entryCount,
  inviteCount,
  iconOnly = false,
}: {
  poolId: string;
  poolName: string;
  entryCount: number;
  inviteCount: number;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [confirmationPoolName, setConfirmationPoolName] = React.useState("");
  const [state, action, pending] = React.useActionState(confirmDeletePoolAction, {});

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) setConfirmationPoolName("");
  }

  return <Dialog open={open} onOpenChange={handleOpenChange}>
    <DialogTrigger asChild>
      <Button type="button" variant="destructive" size={iconOnly ? "icon-sm" : "default"} aria-label={`Delete ${poolName}`} title={`Delete ${poolName}`}>
        {iconOnly ? <Trash2 /> : <>Delete <Trash2 /></>}
      </Button>
    </DialogTrigger>
    <DialogContent showCloseButton={!pending}>
      <DialogHeader>
        <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive"><AlertTriangle className="size-5" /></div>
        <DialogTitle>Delete {poolName}?</DialogTitle>
        <DialogDescription>This permanently deletes the pool and its {inviteCount} invite{inviteCount === 1 ? "" : "s"}, {entryCount} entr{entryCount === 1 ? "y" : "ies"}, picks, results, and standings. This action cannot be undone.</DialogDescription>
      </DialogHeader>
      {state.message ? <p role="alert" className="text-sm font-medium text-destructive">{state.message}</p> : null}
      <DialogFooter>
        <DialogClose asChild><Button type="button" variant="outline" disabled={pending}>Cancel</Button></DialogClose>
        <form action={action} className="grid w-full gap-3 sm:w-auto">
          <input type="hidden" name="poolId" value={poolId} />
          <div className="grid gap-2">
            <Label htmlFor={`delete-confirmation-${poolId}`}>Type “{poolName}” to confirm</Label>
            <Input id={`delete-confirmation-${poolId}`} name="confirmationPoolName" value={confirmationPoolName} onChange={(event) => setConfirmationPoolName(event.target.value)} autoComplete="off" />
          </div>
          <Button type="submit" variant="destructive" disabled={pending || confirmationPoolName.trim() !== poolName}>{pending ? "Deleting…" : "Delete pool"} <Trash2 /></Button>
        </form>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}

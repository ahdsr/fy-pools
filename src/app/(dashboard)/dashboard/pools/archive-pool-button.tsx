"use client";

import * as React from "react";
import { Archive, RotateCcw } from "lucide-react";

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
import { archivePoolAction, restorePoolAction } from "./delete-action";

export function ArchivePoolButton({
  poolId,
  poolName,
  archived,
}: {
  poolId: string;
  poolName: string;
  archived: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [state, action, pending] = React.useActionState(
    archived ? restorePoolAction : archivePoolAction,
    {},
  );
  const label = archived ? "Restore" : "Archive";
  const Icon = archived ? RotateCcw : Archive;

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>
      <Button type="button" variant="outline" size="icon-sm" aria-label={`${label} ${poolName}`} title={`${label} ${poolName}`}><Icon /></Button>
    </DialogTrigger>
    <DialogContent showCloseButton={!pending}>
      <DialogHeader>
        <DialogTitle>{label} {poolName}?</DialogTitle>
        <DialogDescription>{archived ? "Restore this pool to its previous status. Its public and participant links will work again." : "Archive makes the pool unavailable to participants while preserving its invites, entries, picks, results, and standings."}</DialogDescription>
      </DialogHeader>
      {state.message ? <p role="alert" className="text-sm font-medium text-destructive">{state.message}</p> : null}
      <DialogFooter>
        <DialogClose asChild><Button type="button" variant="outline" disabled={pending}>Cancel</Button></DialogClose>
        <form action={action}>
          <input type="hidden" name="poolId" value={poolId} />
          <Button type="submit" variant={archived ? "primaryGreen" : "outline"} disabled={pending}>{pending ? `${label}ing…` : label} <Icon /></Button>
        </form>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}

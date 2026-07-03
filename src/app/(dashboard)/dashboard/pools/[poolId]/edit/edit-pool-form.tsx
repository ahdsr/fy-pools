"use client";

import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import * as React from "react";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CommissionerRoundOf16AdminPool } from "@/lib/round-of-16/persistence";
import { updatePoolAdminAction } from "../../actions";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

export function EditPoolForm({ pool }: { pool: CommissionerRoundOf16AdminPool }) {
  const [state, formAction, pending] = React.useActionState(
    updatePoolAdminAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="poolId" value={pool.poolId} />
      <LedgerPanel
        title="Pool basics"
        description="Update the signed-in admin details shown around this pool. The public slug stays stable."
      >
        <LedgerRows>
          <LedgerRow className="grid gap-4 md:grid-cols-2">
            <Field label="Pool name" htmlFor="pool-name">
              <Input
                id="pool-name"
                name="poolName"
                defaultValue={pool.settings.basics.poolName}
                required
              />
            </Field>
            <Field label="Status" htmlFor="pool-status">
              <select
                id="pool-status"
                name="status"
                defaultValue={pool.status}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="draft">Draft</option>
                <option value="open">Open</option>
                <option value="locked">Locked</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            <Field label="Commissioner display name" htmlFor="commissioner-name">
              <Input
                id="commissioner-name"
                name="commissionerName"
                defaultValue={pool.settings.basics.commissionerName}
                required
              />
            </Field>
            <Field label="Event label" htmlFor="event-label">
              <Input
                id="event-label"
                name="eventLabel"
                defaultValue={pool.settings.basics.eventLabel}
                required
              />
            </Field>
            <Field label="Picks lock at" htmlFor="picks-lock-at">
              <Input
                id="picks-lock-at"
                name="picksLockAt"
                type="datetime-local"
                defaultValue={pool.settings.basics.picksLockAt.slice(0, 16)}
                required
              />
            </Field>
            <Field label="Timezone" htmlFor="timezone">
              <Input
                id="timezone"
                name="timezone"
                defaultValue={pool.settings.basics.timezone}
                required
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Description" htmlFor="description">
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={pool.settings.basics.description}
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Invite note" htmlFor="invite-note">
                <Textarea
                  id="invite-note"
                  name="inviteNote"
                  defaultValue={pool.settings.inviteNote}
                />
              </Field>
            </div>
          </LedgerRow>
          <LedgerRow className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="break-all text-sm font-normal leading-6 text-muted-foreground">
              Public page: <span className="font-mono">/pools/{pool.poolSlug}</span>
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/dashboard/pools">
                  <ArrowLeft /> Back
                </Link>
              </Button>
              <Button type="submit" variant="primaryGreen" disabled={pending}>
                {pending ? "Saving..." : "Save changes"} <Save />
              </Button>
            </div>
          </LedgerRow>
        </LedgerRows>
      </LedgerPanel>
      {state.message ? (
        <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

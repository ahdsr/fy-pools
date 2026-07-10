"use client";

import Link from "next/link";
import {
  CalendarClock,
  Edit,
  ListChecks,
  Trash2,
  Users,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  ROUND_OF_16_DRAFT_STORAGE_KEY,
  getKnockoutPoolStageDetails,
  readRoundOf16Drafts,
  type RoundOf16PoolDraft,
} from "@/lib/templates/round-of-16-draft";

function subscribeToDrafts(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("poolwaffle-drafts-change", listener);

  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("poolwaffle-drafts-change", listener);
  };
}

function getDraftSnapshot() {
  return window.localStorage.getItem(ROUND_OF_16_DRAFT_STORAGE_KEY) ?? "";
}

function getServerSnapshot() {
  return "";
}

function formatDateTime(value: string) {
  if (!value) return "Not set";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString();
}

function DraftPoolRow({ draft }: { draft: RoundOf16PoolDraft }) {
  const enabledProps = draft.bonusProps.filter((prop) => prop.enabled).length;
  const stage = getKnockoutPoolStageDetails(draft.templateSlug);

  function handleDeleteDraft() {
    if (
      !window.confirm(`Delete draft ${draft.basics.poolName || "Untitled draft"}?`)
    ) {
      return;
    }

    const nextDrafts = readRoundOf16Drafts().filter(
      (existingDraft) => existingDraft.id !== draft.id,
    );

    window.localStorage.setItem(
      ROUND_OF_16_DRAFT_STORAGE_KEY,
      JSON.stringify(nextDrafts),
    );
    window.dispatchEvent(new Event("poolwaffle-drafts-change"));
  }

  return (
    <article className="flex min-h-[16rem] flex-col justify-between gap-5 px-5 py-6">
      <div className="min-w-0 space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-[0.005em] text-brand-ink">
            {draft.basics.poolName || "Untitled draft"}
          </h2>
          <p className="text-sm font-normal leading-6 text-muted-foreground">
            Mini {stage.label} Pool draft. Picks lock{" "}
            {formatDateTime(draft.basics.picksLockAt)}. Publish when setup and
            invites are ready.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3 sm:divide-x">
          <div className="sm:pr-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">
              <Users className="size-3.5" />
              Expected
            </div>
            <p className="mt-1 text-sm font-semibold text-brand-ink">
              {draft.inviteSettings.expectedEntries} entries
            </p>
          </div>
          <div className="sm:px-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">
              <ListChecks className="size-3.5" />
              Setup
            </div>
            <p className="mt-1 text-sm font-semibold text-brand-ink">
              {draft.matchups.length} matchups, {enabledProps} props
            </p>
          </div>
          <div className="sm:pl-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">
              <CalendarClock className="size-3.5" />
              Deadline
            </div>
            <p className="mt-1 text-sm font-semibold text-brand-ink">
              {formatDateTime(draft.basics.picksLockAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="primaryGreen">
          <Link href={`/dashboard/pools/new?draft=${encodeURIComponent(draft.id)}`}>
            Edit draft <Edit />
          </Link>
        </Button>
        <Button type="button" variant="destructive" onClick={handleDeleteDraft}>
          Delete draft <Trash2 />
        </Button>
      </div>
    </article>
  );
}

export function DraftPoolRows() {
  const draftSnapshot = React.useSyncExternalStore(
    subscribeToDrafts,
    getDraftSnapshot,
    getServerSnapshot,
  );
  const drafts = React.useMemo(() => {
    if (!draftSnapshot) return [];

    return readRoundOf16Drafts().sort(
      (first, second) =>
        Date.parse(second.createdAt) - Date.parse(first.createdAt),
    );
  }, [draftSnapshot]);

  if (!drafts.length) return null;

  return (
    <section>
      <h3 className="border-b bg-background/65 px-5 py-3 text-sm font-bold tracking-normal text-brand-ink">
        Saved drafts
      </h3>
      <div className="divide-y">
        {drafts.map((draft) => (
          <DraftPoolRow key={draft.id} draft={draft} />
        ))}
      </div>
    </section>
  );
}

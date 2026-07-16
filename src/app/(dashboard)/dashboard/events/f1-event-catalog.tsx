"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createF1SettingsFromCatalogEvent } from "@/lib/ranked-finish/f1";
import type { CatalogEventSnapshot } from "@/lib/events/types";
import { refreshF1CatalogAction, type RefreshF1CatalogState } from "./actions";

function formatDate(value: string | undefined) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Toronto",
  }).format(new Date(value));
}

function readinessVariant(readiness: CatalogEventSnapshot["freshness"]) {
  return readiness === "ready" ? "default" : readiness === "unavailable" || readiness === "stale" ? "destructive" : "outline";
}

export function F1EventCatalog({ events }: { events: CatalogEventSnapshot[] }) {
  const [state, action, pending] = React.useActionState<RefreshF1CatalogState, FormData>(
    refreshF1CatalogAction,
    {},
  );
  const [selectedId, setSelectedId] = React.useState(events[0]?.externalId ?? "");
  const selected = events.find((event) => event.externalId === selectedId) ?? events[0];
  let settings: ReturnType<typeof createF1SettingsFromCatalogEvent> | null = null;
  if (selected) {
    try {
      settings = createF1SettingsFromCatalogEvent(selected);
    } catch {
      // The event card still explains why this setup cannot be prepared.
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Formula 1 live event catalog</CardTitle>
          <CardDescription>
            Syncs the current season schedule and driver roster from Jolpica. A season roster is clearly marked provisional until an event-specific entry list is available.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <form action={action} className="flex items-center gap-3">
            <input type="hidden" name="season" value={String(new Date().getUTCFullYear())} />
            <Button type="submit" variant="primaryGreen" disabled={pending}>
              <RefreshCw className={pending ? "animate-spin" : ""} />
              {pending ? "Syncing…" : "Refresh F1 schedule"}
            </Button>
          </form>
          {state.refreshedAt ? <p className="text-sm text-muted-foreground">Synced {state.count} events at {formatDate(state.refreshedAt)}.</p> : null}
          {state.message ? <p className="text-sm font-medium text-destructive" role="alert">{state.message}</p> : null}
        </CardContent>
      </Card>

      {!events.length ? (
        <Card>
          <CardContent className="py-8 text-muted-foreground">
            No event snapshot is stored yet. Refresh the F1 schedule to prepare a race weekend.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
          <div className="space-y-3">
            {events.map((event) => (
              <button
                key={event.externalId}
                type="button"
                onClick={() => setSelectedId(event.externalId)}
                className="w-full border border-border bg-card p-4 text-left transition-colors hover:border-cta-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-pressed={selected?.externalId === event.externalId}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-brand-ink">{event.displayName}</span>
                  <Badge variant={readinessVariant(event.freshness)}>{event.freshness === "stale" ? "Refresh needed" : event.freshness}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{event.location ?? "Location to be confirmed"} · Race {formatDate(event.startsAt)}</p>
                <p className="mt-1 text-sm text-muted-foreground">Qualifying {formatDate(event.sessions.find((session) => session.id === "qualifying")?.startsAt)} · {event.participants.length} drivers</p>
              </button>
            ))}
          </div>

          {selected ? (
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Setup preview</CardTitle>
                <CardDescription>{selected.readinessReason}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {settings ? (
                  <>
                    <div><span className="font-medium">Pool:</span> {settings.basics.poolName}</div>
                    <div><span className="font-medium">Pick lock:</span> {formatDate(settings.basics.picksLockAt)} (15 minutes before qualifying)</div>
                    <div><span className="font-medium">Markets:</span> qualifying Top 3 and race Top 3</div>
                    <div><span className="font-medium">Roster:</span> {settings.competitors.slice(0, 5).map((driver) => driver.name).join(", ")}{settings.competitors.length > 5 ? `, and ${settings.competitors.length - 5} more` : ""}</div>
                    <p className="border-t border-border pt-4 text-muted-foreground">This captured setup can seed the F1 pool wizard when its player lifecycle is enabled. It does not publish a pool from a provisional roster.</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">This event is missing the qualifying schedule required to calculate a safe pick deadline. Refresh it before preparing a pool.</p>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}

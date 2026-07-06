import type { PoolAnalyticsRow } from "@/lib/world-cup-pool/leaderboard";

export function preferredSelectedEntryId({
  requestedEntry,
  rows,
  leaderId,
  defaultEntryId,
}: {
  requestedEntry?: string | string[];
  rows: PoolAnalyticsRow[];
  leaderId?: string;
  defaultEntryId?: string;
}) {
  const requested = Array.isArray(requestedEntry)
    ? requestedEntry[0]
    : requestedEntry;
  if (requested && rows.some((row) => row.id === requested)) return requested;

  if (defaultEntryId && rows.some((row) => row.id === defaultEntryId)) {
    return defaultEntryId;
  }

  return rows.find((row) => row.id !== leaderId)?.id ?? rows[0]?.id ?? "";
}

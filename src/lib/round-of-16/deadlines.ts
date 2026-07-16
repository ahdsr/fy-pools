import type { RoundOf16PoolSettings } from "@/lib/templates/round-of-16-draft";

const OFFSET_DATE_TIME = /(z|[+-]\d{2}:?\d{2})$/i;

function datePartsAsUtc(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
}

/**
 * Parses a persisted pool date. Legacy settings use datetime-local values, so
 * they must be interpreted in the pool's configured IANA timezone rather than
 * the server's timezone. Values with an explicit offset remain absolute.
 */
export function parsePoolDateTime(value: string, timeZone: string) {
  if (!value) return null;

  if (OFFSET_DATE_TIME.test(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parts = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!parts) return null;

  const target = Date.UTC(
    Number(parts[1]),
    Number(parts[2]) - 1,
    Number(parts[3]),
    Number(parts[4]),
    Number(parts[5]),
    Number(parts[6] ?? 0),
  );

  try {
    // Resolve the timezone offset twice so daylight-saving transitions use the
    // offset at the actual local instant, not at the initial UTC estimate.
    let instant = target - (datePartsAsUtc(new Date(target), timeZone) - target);
    instant = target - (datePartsAsUtc(new Date(instant), timeZone) - instant);
    const parsed = new Date(instant);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

export function getRoundOf16EffectiveLockAt(settings: RoundOf16PoolSettings) {
  const timeZone = settings.basics.timezone || "UTC";
  const manualCutoff = parsePoolDateTime(settings.basics.picksLockAt, timeZone);
  if (!manualCutoff) return null;

  const buffer = Number.isInteger(settings.basics.lockBeforeEventMinutes)
    ? Math.max(0, settings.basics.lockBeforeEventMinutes)
    : 0;
  const scheduledCutoffs = settings.matchups
    .map((matchup) => parsePoolDateTime(matchup.startsAt ?? "", timeZone))
    .filter((start): start is Date => Boolean(start))
    .map((start) => start.getTime() - buffer * 60 * 1000);

  const effectiveTime = Math.min(manualCutoff.getTime(), ...scheduledCutoffs);
  return new Date(effectiveTime);
}

export function pickDeadlineHasPassed(
  settings: RoundOf16PoolSettings,
  now = Date.now(),
) {
  const deadline = getRoundOf16EffectiveLockAt(settings);
  if (!deadline) return false;

  return now >= deadline.getTime();
}

export function getInviteExpiresAt(settings: RoundOf16PoolSettings) {
  return getRoundOf16EffectiveLockAt(settings)?.toISOString() ?? null;
}

import type { RoundOf16PoolSettings } from "@/lib/templates/round-of-16-draft";

export function pickDeadlineHasPassed(settings: RoundOf16PoolSettings) {
  const deadline = settings.basics.picksLockAt;
  if (!deadline) return false;

  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) return false;

  return Date.now() >= parsed.getTime();
}

export function getInviteExpiresAt(settings: RoundOf16PoolSettings) {
  const deadline = settings.basics.picksLockAt;
  if (!deadline) return null;

  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString();
}

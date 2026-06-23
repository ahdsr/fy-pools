import type { MatchResult } from "@/lib/world-cup-pool/types";

export type MatchChanceKey = "home" | "draw" | "away";

export type MatchOutcomeChances = Record<MatchChanceKey, number>;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function matchMinute(match: MatchResult) {
  const parsed = Number.parseInt(match.detail.match(/\d+/)?.[0] ?? "", 10);
  return Number.isFinite(parsed) ? clamp(parsed, 0, 90) : 0;
}

function normalize(home: number, draw: number, away: number): MatchOutcomeChances {
  const total = Math.max(1, home + draw + away);
  const rounded = {
    home: Math.round((home / total) * 100),
    draw: Math.round((draw / total) * 100),
    away: Math.round((away / total) * 100),
  };
  const drift = 100 - rounded.home - rounded.draw - rounded.away;

  if (Math.abs(drift) > 0) {
    const key = Object.entries(rounded).sort((a, b) => b[1] - a[1])[0]?.[0] as
      | MatchChanceKey
      | undefined;
    if (key) rounded[key] += drift;
  }

  return rounded;
}

export function calculateMatchChances(match: MatchResult): MatchOutcomeChances {
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;
  const diff = homeScore - awayScore;

  if (match.completed || match.state === "post") {
    if (diff > 0) return { home: 100, draw: 0, away: 0 };
    if (diff < 0) return { home: 0, draw: 0, away: 100 };
    return { home: 0, draw: 100, away: 0 };
  }

  if (match.state !== "in") {
    return { home: 34, draw: 32, away: 34 };
  }

  const progress = matchMinute(match) / 90;

  if (diff === 0) {
    const draw = clamp(36 + progress * 18, 34, 58);
    const side = (100 - draw) / 2;
    return normalize(side, draw, side);
  }

  const leader = clamp(45 + Math.abs(diff) * 18 + progress * 30, 48, 94);
  const draw = clamp(32 - Math.abs(diff) * 8 - progress * 18, 4, 28);
  const trailer = Math.max(2, 100 - leader - draw);

  return diff > 0
    ? normalize(leader, draw, trailer)
    : normalize(trailer, draw, leader);
}

export function formatChancePercent(value: number) {
  return `${value}%`;
}

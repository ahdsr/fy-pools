import type {
  RankedFinishPickPayload,
  RankedFinishScoreResult,
  RankedFinishSettings,
} from "@/lib/ranked-finish/types";

export function validateRankedFinishSettings(settings: RankedFinishSettings) {
  if (!settings.basics.poolName.trim()) return "Enter a pool name.";
  if (!settings.basics.commissionerName.trim()) return "Enter the commissioner name.";
  if (!settings.basics.picksLockAt.trim()) return "Set a pick deadline.";
  if (settings.competitors.length < 2) return "Add at least two competitors.";
  if (new Set(settings.competitors.map((competitor) => competitor.name.trim().toLowerCase())).size !== settings.competitors.length) return "Every competitor must be unique.";
  if (!settings.markets.length) return "Add at least one prediction market.";
  if (settings.markets.some((market) => market.positions < 1 || market.positions > settings.competitors.length || market.pointsPerExactPosition < 0)) return "Each market needs a valid position count and score.";
  return null;
}

export function validateRankedFinishPicks(settings: RankedFinishSettings, payload: RankedFinishPickPayload) {
  const competitorIds = new Set(settings.competitors.map((competitor) => competitor.id));
  for (const market of settings.markets) {
    const picks = payload.markets[market.id];
    if (!Array.isArray(picks) || picks.length !== market.positions) return `Complete every ${market.label.toLowerCase()} position.`;
    if (new Set(picks).size !== picks.length || picks.some((pick) => !competitorIds.has(pick))) return `${market.label} picks must use each competitor only once.`;
  }
  return null;
}

export function recordRankedFinishResult({ settings, marketId, competitorId }: { settings: RankedFinishSettings; marketId: string; competitorId: string }) {
  const market = settings.markets.find((candidate) => candidate.id === marketId);
  if (!market) throw new Error("Prediction market does not exist.");
  if (!settings.competitors.some((competitor) => competitor.id === competitorId)) throw new Error("Competitor does not exist.");
  const current = settings.results[marketId] ?? [];
  if (current.length >= market.positions) throw new Error("All results for this market have already been entered.");
  if (current.includes(competitorId)) throw new Error("A competitor can finish only once in a market.");
  return { ...settings, results: { ...settings.results, [marketId]: [...current, competitorId] } };
}

export function resetRankedFinishResults(settings: RankedFinishSettings) {
  return { ...settings, results: {} };
}

export function scoreRankedFinishEntry({ settings, picks, results = settings.results }: { settings: RankedFinishSettings; picks: RankedFinishPickPayload; results?: RankedFinishSettings["results"] }): RankedFinishScoreResult {
  const names = new Map(settings.competitors.map((competitor) => [competitor.id, competitor.name]));
  const lines = settings.markets.flatMap((market) => Array.from({ length: market.positions }, (_, index) => {
    const pick = picks.markets[market.id]?.[index] ?? "";
    const result = results[market.id]?.[index] ?? "";
    const hit = Boolean(pick && result && pick === result);
    return { key: `${market.id}:${index + 1}`, label: `${market.label} P${index + 1}`, pick: names.get(pick) ?? "", result: names.get(result) ?? "", pointsAwarded: hit ? market.pointsPerExactPosition : 0, maxPoints: market.pointsPerExactPosition, reason: result ? (hit ? "Correct finishing position." : "Finishing position did not match the result.") : "Result has not been entered." };
  }));
  return { total: lines.reduce((sum, line) => sum + line.pointsAwarded, 0), maxPoints: lines.reduce((sum, line) => sum + line.maxPoints, 0), lines };
}

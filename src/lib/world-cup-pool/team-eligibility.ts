import { actualAdvancersForGroup } from "@/lib/world-cup-pool/scoring";
import { buildTeamIndexes, normalizeKey } from "@/lib/world-cup-pool/results-updater";
import type {
  EntryPicks,
  PoolResults,
  StageScore,
} from "@/lib/world-cup-pool/types";

type FinalPositionKey = "champion" | "runnerUp" | "thirdPlace";

function sameTeam(a: unknown, b: unknown) {
  return normalizeKey(a) === normalizeKey(b);
}

function includesTeam(list: string[] | undefined, team: string) {
  return Array.isArray(list) && list.some((item) => sameTeam(item, team));
}

function matchIsGroupStage(
  match: NonNullable<PoolResults["matches"]>[number],
  teamToGroup: Map<string, string>,
) {
  const homeGroup = teamToGroup.get(normalizeKey(match.homeTeam));
  const awayGroup = teamToGroup.get(normalizeKey(match.awayTeam));
  return Boolean(homeGroup && homeGroup === awayGroup);
}

function completedKnockoutLoserKeys(results: PoolResults, picks: EntryPicks) {
  const { teamToGroup } = buildTeamIndexes(picks);
  const losers = new Set<string>();

  for (const match of results.matches ?? []) {
    if (!match.completed || !match.loser || matchIsGroupStage(match, teamToGroup)) {
      continue;
    }

    losers.add(normalizeKey(match.loser));
  }

  return losers;
}

function teamAdvancedFromGroup(
  results: PoolResults,
  picks: EntryPicks,
  team: string,
) {
  const { teamToGroup } = buildTeamIndexes(picks);
  const groupId = teamToGroup.get(normalizeKey(team));
  if (!groupId) return true;

  const groupResult = results.groups?.[groupId];
  if (groupResult?.status !== "final") return true;

  return actualAdvancersForGroup(results, groupId).some((advancer) =>
    sameTeam(advancer, team),
  );
}

export function teamIsStillAlive(
  results: PoolResults,
  picks: EntryPicks,
  team: string,
) {
  if (!team || !teamAdvancedFromGroup(results, picks, team)) return false;
  return !completedKnockoutLoserKeys(results, picks).has(normalizeKey(team));
}

export function teamCanStillEarnKnockoutStage({
  results,
  picks,
  stageKey,
  team,
  predictedCount,
}: {
  results: PoolResults;
  picks: EntryPicks;
  stageKey: StageScore["stageKey"];
  team: string;
  predictedCount: number;
}) {
  if (!team || predictedCount <= 0) return false;
  if ((results[stageKey]?.length ?? 0) >= predictedCount) return false;
  if (includesTeam(results[stageKey], team)) return false;

  return teamIsStillAlive(results, picks, team);
}

export function teamCanStillEarnFinalPosition({
  results,
  picks,
  positionKey,
  team,
}: {
  results: PoolResults;
  picks: EntryPicks;
  positionKey: FinalPositionKey;
  team: string;
}) {
  if (!team || results.finals?.[positionKey]) return false;

  if (positionKey === "thirdPlace" && includesTeam(results.thirdPlaceMatch, team)) {
    return true;
  }

  if (
    (positionKey === "champion" || positionKey === "runnerUp") &&
    includesTeam(results.finalists, team)
  ) {
    return true;
  }

  return teamIsStillAlive(results, picks, team);
}

import { buildLeaderboardRows } from "@/lib/world-cup-pool/leaderboard";
import { actualAdvancersForGroup, scorePool } from "@/lib/world-cup-pool/scoring";
import {
  teamCanStillEarnFinalPosition,
  teamCanStillEarnKnockoutStage,
} from "@/lib/world-cup-pool/team-eligibility";
import { buildTeamIndexes, normalizeKey } from "@/lib/world-cup-pool/results-updater";
import type {
  EntriesConfig,
  EntryPicks,
  LeaderboardRow,
  MatchResult,
  PoolResults,
  StageScore,
} from "@/lib/world-cup-pool/types";

type EventCategory = "Group" | "Knockout" | "Final" | "Bonus";
type FinalPositionKey = "champion" | "runnerUp" | "thirdPlace";
type ScenarioResultKind =
  | "groupAdvancer"
  | "groupOrder"
  | "knockoutStage"
  | "finalPosition"
  | "bonus";

export type OpponentPathEvent = {
  id: string;
  category: EventCategory;
  title: string;
  detail: string;
  points: number;
  teams: string[];
  groupId?: string;
  resultKind?: ScenarioResultKind;
  resultKey?: string;
};

export type OpponentPathGroup = {
  groupId: string;
  playerTeams: string[];
  opponentTeams: string[];
  playerPoints: number;
  opponentPoints: number;
};

export type OpponentPathMatch = {
  id: string;
  date: string;
  detail: string;
  homeTeam: string;
  awayTeam: string;
  groupId?: string;
  playerValue: number;
  opponentValue: number;
  netValue: number;
  preferredOutcome: string;
  reasons: string[];
};

export type OpponentPathOpponent = {
  id: string;
  name: string;
  rank: number;
  total: number;
  gap: number;
  neededSwing: number;
  playerUpside: number;
  opponentThreat: number;
  routeCovered: number;
  routeComplete: boolean;
  gainEvents: OpponentPathEvent[];
  threatEvents: OpponentPathEvent[];
  routeEvents: OpponentPathEvent[];
  groups: OpponentPathGroup[];
  matches: OpponentPathMatch[];
};

export type OpponentPathsReport = {
  target: {
    id: string;
    name: string;
    rank: number;
    total: number;
  };
  defaultOpponentIds: string[];
  opponents: OpponentPathOpponent[];
};

export type ScenarioEventScore = OpponentPathEvent & {
  selectedPoints: number;
  scorerIds: string[];
  scorerNames: string[];
};

export type ScenarioStanding = {
  id: string;
  name: string;
  currentTotal: number;
  projectedTotal: number;
  delta: number;
  rank: number;
};

export type EntryScenarioProjection = {
  entryId: string;
  entryName: string;
  currentRank: number;
  currentTotal: number;
  projectedRank: number;
  projectedTotal: number;
  routeCovered: number;
  eventCount: number;
  canFinishFirst: boolean;
  tiedForFirst: boolean;
  events: ScenarioEventScore[];
  standings: ScenarioStanding[];
  blockers: ScenarioStanding[];
};

const KNOCKOUT_STAGES = [
  { key: "roundOf16", label: "Round of 16" },
  { key: "quarterFinalists", label: "Quarter-finals" },
  { key: "semifinalists", label: "Semi-finals" },
  { key: "thirdPlaceMatch", label: "3rd-place match" },
  { key: "finalists", label: "Finalists" },
] as const;

const FINAL_STAGES = [
  { key: "champion", label: "Champion" },
  { key: "runnerUp", label: "Runner-up" },
  { key: "thirdPlace", label: "Third place" },
] as const;

function sameTeam(a: string, b: string) {
  return normalizeKey(a) === normalizeKey(b);
}

function difference(left: string[], right: string[]) {
  return left.filter((team) => !right.some((item) => sameTeam(item, team)));
}

function uniqueTeams(teams: string[]) {
  const seen = new Set<string>();
  return teams.filter((team) => {
    const key = normalizeKey(team);
    if (!team || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function groupIsOpen(results: PoolResults, groupId: string) {
  return results.groups?.[groupId]?.status !== "final";
}

function stageIsOpen(
  results: PoolResults,
  stageKey: StageScore["stageKey"],
  predictedCount: number,
) {
  return predictedCount > 0 && (results[stageKey]?.length ?? 0) < predictedCount;
}

function matchTime(match: MatchResult) {
  const value = new Date(match.date).getTime();
  return Number.isFinite(value) ? value : 0;
}

function unfinishedMatches(results: PoolResults) {
  return (results.matches ?? [])
    .filter((match) => !match.completed && match.state !== "post")
    .sort((a, b) => matchTime(a) - matchTime(b));
}

function addTeamValue(
  map: Map<string, number>,
  team: string,
  points: number,
) {
  const key = normalizeKey(team);
  map.set(key, (map.get(key) ?? 0) + points);
}

function teamValue(map: Map<string, number>, team: string) {
  return map.get(normalizeKey(team)) ?? 0;
}

function rankEvents(events: OpponentPathEvent[]) {
  return events.slice().sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.title.localeCompare(b.title);
  });
}

function buildRoute(events: OpponentPathEvent[], neededSwing: number) {
  if (neededSwing <= 0) return [];

  const route: OpponentPathEvent[] = [];
  let covered = 0;
  for (const event of rankEvents(events)) {
    if (covered >= neededSwing) break;
    route.push(event);
    covered += event.points;
  }
  return route;
}

function eventSortKey(event: OpponentPathEvent) {
  return `${event.resultKind ?? event.category}:${event.resultKey ?? ""}:${event.teams
    .map(normalizeKey)
    .join("|")}:${event.groupId ?? ""}`;
}

function uniqueEvents(events: OpponentPathEvent[]) {
  const byKey = new Map<string, OpponentPathEvent>();
  for (const event of events) {
    const key = eventSortKey(event);
    const current = byKey.get(key);
    if (!current || event.points > current.points) {
      byKey.set(key, event);
    }
  }
  return rankEvents([...byKey.values()]);
}

function findGroupIdForTeam(picks: EntryPicks, team: string) {
  for (const [groupId, group] of Object.entries(picks.groups)) {
    if (group.teams.some((item) => sameTeam(item.name, team))) return groupId;
  }
  return undefined;
}

function buildGroupEvents({
  playerPicks,
  opponentPicks,
  results,
}: {
  playerPicks: EntryPicks;
  opponentPicks: EntryPicks;
  results: PoolResults;
}) {
  const gainEvents: OpponentPathEvent[] = [];
  const threatEvents: OpponentPathEvent[] = [];
  const groups: OpponentPathGroup[] = [];

  for (const [groupId, group] of Object.entries(playerPicks.groups)) {
    if (!groupIsOpen(results, groupId)) continue;

    const opponentGroup = opponentPicks.groups[groupId];
    if (!opponentGroup) continue;

    const actualAdvancers = actualAdvancersForGroup(results, groupId);
    const playerOnlyAdvancers = difference(
      group.predictedAdvancers,
      opponentGroup.predictedAdvancers,
    );
    const opponentOnlyAdvancers = difference(
      opponentGroup.predictedAdvancers,
      group.predictedAdvancers,
    );
    const playerFreshAdvancers = playerOnlyAdvancers.filter(
      (team) => !actualAdvancers.some((actual) => sameTeam(actual, team)),
    );
    const opponentFreshAdvancers = opponentOnlyAdvancers.filter(
      (team) => !actualAdvancers.some((actual) => sameTeam(actual, team)),
    );

    const playerPoints =
      playerFreshAdvancers.length * playerPicks.scoringRules.groupAdvancement;
    const opponentPoints =
      opponentFreshAdvancers.length * opponentPicks.scoringRules.groupAdvancement;

    if (playerFreshAdvancers.length || opponentFreshAdvancers.length) {
      groups.push({
        groupId,
        playerTeams: playerFreshAdvancers,
        opponentTeams: opponentFreshAdvancers,
        playerPoints,
        opponentPoints,
      });
    }

    for (const team of playerFreshAdvancers) {
      gainEvents.push({
        id: `group-${groupId}-${normalizeKey(team)}`,
        category: "Group",
        title: `${team} advance from Group ${groupId}`,
        detail: `${playerPicks.scoringRules.groupAdvancement} points for this entry and none for the opponent.`,
        points: playerPicks.scoringRules.groupAdvancement,
        teams: [team],
        groupId,
        resultKind: "groupAdvancer",
        resultKey: groupId,
      });
    }

    for (const team of opponentFreshAdvancers) {
      threatEvents.push({
        id: `group-threat-${groupId}-${normalizeKey(team)}`,
        category: "Group",
        title: `${team} advance from Group ${groupId}`,
        detail: `${opponentPicks.scoringRules.groupAdvancement} points for the opponent and none for this entry.`,
        points: opponentPicks.scoringRules.groupAdvancement,
        teams: [team],
        groupId,
        resultKind: "groupAdvancer",
        resultKey: groupId,
      });
    }

    if (
      playerPoints === 0 &&
      group.predictedOrder.slice(0, 4).join("|") !==
        opponentGroup.predictedOrder.slice(0, 4).join("|")
    ) {
      const teams = uniqueTeams(group.predictedOrder.slice(0, 4));
      gainEvents.push({
        id: `group-order-${groupId}`,
        category: "Group",
        title: `Group ${groupId} order hits exactly`,
        detail: `${playerPicks.scoringRules.exactTopFourBonus} point order bonus is still open.`,
        points: playerPicks.scoringRules.exactTopFourBonus,
        teams,
        groupId,
        resultKind: "groupOrder",
        resultKey: groupId,
      });
    }
  }

  return { gainEvents, threatEvents, groups };
}

function buildKnockoutEvents({
  playerPicks,
  opponentPicks,
  results,
}: {
  playerPicks: EntryPicks;
  opponentPicks: EntryPicks;
  results: PoolResults;
}) {
  const gainEvents: OpponentPathEvent[] = [];
  const threatEvents: OpponentPathEvent[] = [];

  for (const stage of KNOCKOUT_STAGES) {
    const playerTeams = playerPicks.advancement[stage.key];
    const opponentTeams = opponentPicks.advancement[stage.key];
    if (
      !stageIsOpen(results, stage.key, playerTeams.length) &&
      !stageIsOpen(results, stage.key, opponentTeams.length)
    ) {
      continue;
    }

    const playerOnly = difference(playerTeams, opponentTeams).filter((team) =>
      teamCanStillEarnKnockoutStage({
        results,
        picks: playerPicks,
        stageKey: stage.key,
        team,
        predictedCount: playerTeams.length,
      }),
    );
    const opponentOnly = difference(opponentTeams, playerTeams).filter((team) =>
      teamCanStillEarnKnockoutStage({
        results,
        picks: opponentPicks,
        stageKey: stage.key,
        team,
        predictedCount: opponentTeams.length,
      }),
    );
    const playerPoints = playerPicks.scoringRules[stage.key];
    const opponentPoints = opponentPicks.scoringRules[stage.key];

    for (const team of playerOnly) {
      gainEvents.push({
        id: `${stage.key}-${normalizeKey(team)}`,
        category: "Knockout",
        title: `${team} reach ${stage.label}`,
        detail: `${playerPoints} points for this entry and none for the opponent.`,
        points: playerPoints,
        teams: [team],
        resultKind: "knockoutStage",
        resultKey: stage.key,
      });
    }

    for (const team of opponentOnly) {
      threatEvents.push({
        id: `${stage.key}-threat-${normalizeKey(team)}`,
        category: "Knockout",
        title: `${team} reach ${stage.label}`,
        detail: `${opponentPoints} points for the opponent and none for this entry.`,
        points: opponentPoints,
        teams: [team],
        resultKind: "knockoutStage",
        resultKey: stage.key,
      });
    }
  }

  return { gainEvents, threatEvents };
}

function buildFinalEvents({
  playerPicks,
  opponentPicks,
  results,
}: {
  playerPicks: EntryPicks;
  opponentPicks: EntryPicks;
  results: PoolResults;
}) {
  const gainEvents: OpponentPathEvent[] = [];
  const threatEvents: OpponentPathEvent[] = [];

  for (const stage of FINAL_STAGES) {
    if (results.finals?.[stage.key]) continue;

    const playerTeam = playerPicks.podium[stage.key];
    const opponentTeam = opponentPicks.podium[stage.key];
    const playerPoints = playerPicks.scoringRules[stage.key];
    const opponentPoints = opponentPicks.scoringRules[stage.key];

    if (
      playerTeam &&
      !sameTeam(playerTeam, opponentTeam) &&
      teamCanStillEarnFinalPosition({
        results,
        picks: playerPicks,
        positionKey: stage.key,
        team: playerTeam,
      })
    ) {
      gainEvents.push({
        id: `final-${stage.key}-${normalizeKey(playerTeam)}`,
        category: "Final",
        title: `${playerTeam} finish as ${stage.label}`,
        detail: `${playerPoints} points for this entry and none for the opponent.`,
        points: playerPoints,
        teams: [playerTeam],
        resultKind: "finalPosition",
        resultKey: stage.key,
      });
    }

    if (
      opponentTeam &&
      !sameTeam(playerTeam, opponentTeam) &&
      teamCanStillEarnFinalPosition({
        results,
        picks: opponentPicks,
        positionKey: stage.key,
        team: opponentTeam,
      })
    ) {
      threatEvents.push({
        id: `final-threat-${stage.key}-${normalizeKey(opponentTeam)}`,
        category: "Final",
        title: `${opponentTeam} finish as ${stage.label}`,
        detail: `${opponentPoints} points for the opponent and none for this entry.`,
        points: opponentPoints,
        teams: [opponentTeam],
        resultKind: "finalPosition",
        resultKey: stage.key,
      });
    }
  }

  return { gainEvents, threatEvents };
}

function buildBonusEvents({
  playerPicks,
  opponentPicks,
  results,
}: {
  playerPicks: EntryPicks;
  opponentPicks: EntryPicks;
  results: PoolResults;
}) {
  const gainEvents: OpponentPathEvent[] = [];
  const threatEvents: OpponentPathEvent[] = [];

  for (const bonus of playerPicks.bonus) {
    if ((results.bonus?.[bonus.id]?.length ?? 0) > 0) continue;

    const opponentBonus = opponentPicks.bonus.find((item) => item.id === bonus.id);
    if (!opponentBonus || sameTeam(bonus.pick, opponentBonus.pick)) continue;

    gainEvents.push({
      id: `bonus-${bonus.id}-${normalizeKey(bonus.pick)}`,
      category: "Bonus",
      title: `${bonus.pick}: ${bonus.label}`,
      detail: `${playerPicks.scoringRules.bonus} bonus points for this entry and none for the opponent.`,
      points: playerPicks.scoringRules.bonus,
      teams: [bonus.pick],
      resultKind: "bonus",
      resultKey: bonus.id,
    });
    threatEvents.push({
      id: `bonus-threat-${bonus.id}-${normalizeKey(opponentBonus.pick)}`,
      category: "Bonus",
      title: `${opponentBonus.pick}: ${bonus.label}`,
      detail: `${opponentPicks.scoringRules.bonus} bonus points for the opponent and none for this entry.`,
      points: opponentPicks.scoringRules.bonus,
      teams: [opponentBonus.pick],
      resultKind: "bonus",
      resultKey: bonus.id,
    });
  }

  return { gainEvents, threatEvents };
}

function buildMatchLeverage({
  playerPicks,
  results,
  gainEvents,
  threatEvents,
}: {
  playerPicks: EntryPicks;
  results: PoolResults;
  gainEvents: OpponentPathEvent[];
  threatEvents: OpponentPathEvent[];
}) {
  const playerTeamValues = new Map<string, number>();
  const opponentTeamValues = new Map<string, number>();
  const reasonsByTeam = new Map<string, string[]>();
  const { teamToGroup } = buildTeamIndexes(playerPicks);

  for (const event of gainEvents) {
    for (const team of event.teams) {
      addTeamValue(playerTeamValues, team, event.points);
      const key = normalizeKey(team);
      reasonsByTeam.set(key, [...(reasonsByTeam.get(key) ?? []), event.title]);
    }
  }

  for (const event of threatEvents) {
    for (const team of event.teams) {
      addTeamValue(opponentTeamValues, team, event.points);
      const key = normalizeKey(team);
      reasonsByTeam.set(key, [...(reasonsByTeam.get(key) ?? []), event.title]);
    }
  }

  return unfinishedMatches(results)
    .map<OpponentPathMatch | null>((match) => {
      const homePlayerValue = teamValue(playerTeamValues, match.homeTeam);
      const awayPlayerValue = teamValue(playerTeamValues, match.awayTeam);
      const homeOpponentValue = teamValue(opponentTeamValues, match.homeTeam);
      const awayOpponentValue = teamValue(opponentTeamValues, match.awayTeam);
      const homeNet = homePlayerValue - homeOpponentValue;
      const awayNet = awayPlayerValue - awayOpponentValue;
      const playerValue = homePlayerValue + awayPlayerValue;
      const opponentValue = homeOpponentValue + awayOpponentValue;
      const impact = playerValue + opponentValue;

      if (impact <= 0) return null;

      const groupId =
        teamToGroup.get(normalizeKey(match.homeTeam)) ??
        findGroupIdForTeam(playerPicks, match.homeTeam);
      const preferredOutcome =
        homeNet > awayNet
          ? `${match.homeTeam} result`
          : awayNet > homeNet
            ? `${match.awayTeam} result`
            : "Result affects both sides";
      const reasons = uniqueTeams([
        ...(reasonsByTeam.get(normalizeKey(match.homeTeam)) ?? []),
        ...(reasonsByTeam.get(normalizeKey(match.awayTeam)) ?? []),
      ]).slice(0, 4);

      return {
        id: match.id,
        date: match.date,
        detail: match.detail,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        groupId,
        playerValue,
        opponentValue,
        netValue: Math.abs(homeNet - awayNet),
        preferredOutcome,
        reasons,
      };
    })
    .filter((match): match is OpponentPathMatch => Boolean(match))
    .sort((a, b) => {
      if (b.netValue !== a.netValue) return b.netValue - a.netValue;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    })
    .slice(0, 8);
}

function buildOpponentReport({
  playerRow,
  opponentRow,
  playerPicks,
  opponentPicks,
  results,
}: {
  playerRow: LeaderboardRow;
  opponentRow: LeaderboardRow;
  playerPicks: EntryPicks;
  opponentPicks: EntryPicks;
  results: PoolResults;
}): OpponentPathOpponent {
  const group = buildGroupEvents({ playerPicks, opponentPicks, results });
  const knockout = buildKnockoutEvents({ playerPicks, opponentPicks, results });
  const finals = buildFinalEvents({ playerPicks, opponentPicks, results });
  const bonus = buildBonusEvents({ playerPicks, opponentPicks, results });
  const gainEvents = rankEvents([
    ...group.gainEvents,
    ...knockout.gainEvents,
    ...finals.gainEvents,
    ...bonus.gainEvents,
  ]);
  const threatEvents = rankEvents([
    ...group.threatEvents,
    ...knockout.threatEvents,
    ...finals.threatEvents,
    ...bonus.threatEvents,
  ]);
  const gap = opponentRow.score.total - playerRow.score.total;
  const neededSwing = Math.max(0, gap + 1);
  const routeEvents = buildRoute(gainEvents, neededSwing);
  const routeCovered = routeEvents.reduce((sum, event) => sum + event.points, 0);

  return {
    id: opponentRow.id,
    name: opponentRow.name,
    rank: opponentRow.rank,
    total: opponentRow.score.total,
    gap,
    neededSwing,
    playerUpside: gainEvents.reduce((sum, event) => sum + event.points, 0),
    opponentThreat: threatEvents.reduce((sum, event) => sum + event.points, 0),
    routeCovered,
    routeComplete: neededSwing === 0 || routeCovered >= neededSwing,
    gainEvents: gainEvents.slice(0, 12),
    threatEvents: threatEvents.slice(0, 8),
    routeEvents,
    groups: group.groups
      .sort((a, b) => b.playerPoints - a.playerPoints || a.groupId.localeCompare(b.groupId))
      .slice(0, 6),
    matches: buildMatchLeverage({
      playerPicks,
      results,
      gainEvents,
      threatEvents,
    }),
  };
}

function buildEntryRemainingGroupEvents({
  picks,
  results,
}: {
  picks: EntryPicks;
  results: PoolResults;
}) {
  const events: OpponentPathEvent[] = [];

  for (const [groupId, group] of Object.entries(picks.groups)) {
    if (!groupIsOpen(results, groupId)) continue;

    const actualAdvancers = actualAdvancersForGroup(results, groupId);
    for (const team of group.predictedAdvancers) {
      if (actualAdvancers.some((actual) => sameTeam(actual, team))) continue;

      events.push({
        id: `group-${groupId}-${normalizeKey(team)}`,
        category: "Group",
        title: `${team} advance from Group ${groupId}`,
        detail: `${picks.scoringRules.groupAdvancement} points if this group result lands.`,
        points: picks.scoringRules.groupAdvancement,
        teams: [team],
        groupId,
        resultKind: "groupAdvancer",
        resultKey: groupId,
      });
    }

    const topFour = uniqueTeams(group.predictedOrder.slice(0, 4));
    if (topFour.length === 4) {
      events.push({
        id: `group-order-${groupId}`,
        category: "Group",
        title: `Group ${groupId} order hits exactly`,
        detail: `${picks.scoringRules.exactTopFourBonus} point order bonus is still open.`,
        points: picks.scoringRules.exactTopFourBonus,
        teams: topFour,
        groupId,
        resultKind: "groupOrder",
        resultKey: groupId,
      });
    }
  }

  return events;
}

function buildEntryRemainingKnockoutEvents({
  picks,
  results,
}: {
  picks: EntryPicks;
  results: PoolResults;
}) {
  const events: OpponentPathEvent[] = [];

  for (const stage of KNOCKOUT_STAGES) {
    const predictedTeams = picks.advancement[stage.key];
    for (const team of predictedTeams) {
      if (
        !teamCanStillEarnKnockoutStage({
          results,
          picks,
          stageKey: stage.key,
          team,
          predictedCount: predictedTeams.length,
        })
      ) {
        continue;
      }

      events.push({
        id: `${stage.key}-${normalizeKey(team)}`,
        category: "Knockout",
        title: `${team} reach ${stage.label}`,
        detail: `${picks.scoringRules[stage.key]} points if this knockout result lands.`,
        points: picks.scoringRules[stage.key],
        teams: [team],
        resultKind: "knockoutStage",
        resultKey: stage.key,
      });
    }
  }

  return events;
}

function buildEntryRemainingFinalEvents({
  picks,
  results,
}: {
  picks: EntryPicks;
  results: PoolResults;
}) {
  const events: OpponentPathEvent[] = [];

  for (const stage of FINAL_STAGES) {
    const team = picks.podium[stage.key];
    if (
      !teamCanStillEarnFinalPosition({
        results,
        picks,
        positionKey: stage.key,
        team,
      })
    ) {
      continue;
    }

    events.push({
      id: `final-${stage.key}-${normalizeKey(team)}`,
      category: "Final",
      title: `${team} finish as ${stage.label}`,
      detail: `${picks.scoringRules[stage.key]} points if this podium pick lands.`,
      points: picks.scoringRules[stage.key],
      teams: [team],
      resultKind: "finalPosition",
      resultKey: stage.key,
    });
  }

  return events;
}

function buildEntryRemainingBonusEvents({
  picks,
  results,
}: {
  picks: EntryPicks;
  results: PoolResults;
}) {
  return picks.bonus
    .filter((bonus) => (results.bonus?.[bonus.id]?.length ?? 0) === 0)
    .map<OpponentPathEvent>((bonus) => ({
      id: `bonus-${bonus.id}-${normalizeKey(bonus.pick)}`,
      category: "Bonus",
      title: `${bonus.pick}: ${bonus.label}`,
      detail: `${picks.scoringRules.bonus} bonus points if this answer lands.`,
      points: picks.scoringRules.bonus,
      teams: [bonus.pick],
      resultKind: "bonus",
      resultKey: bonus.id,
    }));
}

export function buildEntryRemainingEvents({
  picks,
  results,
}: {
  picks: EntryPicks;
  results: PoolResults;
}) {
  return uniqueEvents([
    ...buildEntryRemainingGroupEvents({ picks, results }),
    ...buildEntryRemainingKnockoutEvents({ picks, results }),
    ...buildEntryRemainingFinalEvents({ picks, results }),
    ...buildEntryRemainingBonusEvents({ picks, results }),
  ]);
}

function eventPointsForPicks(event: OpponentPathEvent, picks: EntryPicks) {
  const [team] = event.teams;

  if (event.resultKind === "groupAdvancer" && event.groupId) {
    return picks.groups[event.groupId]?.predictedAdvancers.some((item) =>
      sameTeam(item, team),
    )
      ? picks.scoringRules.groupAdvancement
      : 0;
  }

  if (event.resultKind === "groupOrder" && event.groupId) {
    const predictedTopFour = picks.groups[event.groupId]?.predictedOrder.slice(0, 4) ?? [];
    return predictedTopFour.length === event.teams.length &&
      event.teams.every((item, index) => sameTeam(item, predictedTopFour[index]))
      ? picks.scoringRules.exactTopFourBonus
      : 0;
  }

  if (event.resultKind === "knockoutStage") {
    const stageKey = event.resultKey as StageScore["stageKey"] | undefined;
    if (!stageKey) return 0;

    return picks.advancement[stageKey]?.some((item) => sameTeam(item, team))
      ? picks.scoringRules[stageKey]
      : 0;
  }

  if (event.resultKind === "finalPosition") {
    const positionKey = event.resultKey as FinalPositionKey | undefined;
    if (!positionKey) return 0;

    return sameTeam(picks.podium[positionKey], team)
      ? picks.scoringRules[positionKey]
      : 0;
  }

  if (event.resultKind === "bonus") {
    return picks.bonus.some(
      (bonus) => bonus.id === event.resultKey && sameTeam(bonus.pick, team),
    )
      ? picks.scoringRules.bonus
      : 0;
  }

  return 0;
}

function rankScenarioStandings(rows: ScenarioStanding[]) {
  let lastScore: number | null = null;
  let lastRank = 0;

  return rows
    .slice()
    .sort((a, b) => {
      if (b.projectedTotal !== a.projectedTotal) {
        return b.projectedTotal - a.projectedTotal;
      }
      return a.name.localeCompare(b.name);
    })
    .map((row, index) => {
      const rank = row.projectedTotal === lastScore ? lastRank : index + 1;
      lastScore = row.projectedTotal;
      lastRank = rank;
      return { ...row, rank };
    });
}

export function projectEntryScenario({
  entriesConfig,
  picksByPath,
  results,
  entryId,
  events,
}: {
  entriesConfig: EntriesConfig;
  picksByPath: Map<string, EntryPicks>;
  results: PoolResults;
  entryId: string;
  events: OpponentPathEvent[];
}): EntryScenarioProjection | null {
  const currentRows = buildLeaderboardRows(entriesConfig, picksByPath, results);
  const selectedRow = currentRows.find((row) => row.id === entryId);
  if (!selectedRow) return null;

  const deltaByEntryId = new Map<string, number>();
  const scoredEvents = events.map<ScenarioEventScore>((event) => {
    const scorerIds: string[] = [];
    const scorerNames: string[] = [];
    let selectedPoints = 0;

    for (const row of currentRows) {
      const picks = row.picksPath ? picksByPath.get(row.picksPath) : undefined;
      if (!picks) continue;

      const points = eventPointsForPicks(event, picks);
      if (points <= 0) continue;

      deltaByEntryId.set(row.id, (deltaByEntryId.get(row.id) ?? 0) + points);
      scorerIds.push(row.id);
      scorerNames.push(row.name);

      if (row.id === entryId) {
        selectedPoints = points;
      }
    }

    return {
      ...event,
      selectedPoints,
      scorerIds,
      scorerNames,
    };
  });

  const standings = rankScenarioStandings(
    currentRows.map((row) => {
      const delta = deltaByEntryId.get(row.id) ?? 0;
      return {
        id: row.id,
        name: row.name,
        currentTotal: row.score.total,
        projectedTotal: row.score.total + delta,
        delta,
        rank: row.rank,
      };
    }),
  );
  const selectedStanding = standings.find((row) => row.id === entryId);
  if (!selectedStanding) return null;

  const firstPlaceEntries = standings.filter((row) => row.rank === 1);
  const blockers = standings.filter(
    (row) =>
      row.id !== entryId &&
      row.projectedTotal >= selectedStanding.projectedTotal,
  );

  return {
    entryId,
    entryName: selectedRow.name,
    currentRank: selectedRow.rank,
    currentTotal: selectedRow.score.total,
    projectedRank: selectedStanding.rank,
    projectedTotal: selectedStanding.projectedTotal,
    routeCovered: selectedStanding.delta,
    eventCount: events.length,
    canFinishFirst: selectedStanding.rank === 1,
    tiedForFirst: selectedStanding.rank === 1 && firstPlaceEntries.length > 1,
    events: scoredEvents,
    standings,
    blockers,
  };
}

function scenarioIsBetter(
  candidate: EntryScenarioProjection | null,
  current: EntryScenarioProjection | null,
) {
  if (!candidate) return false;
  if (!current) return true;
  if (candidate.canFinishFirst !== current.canFinishFirst) {
    return candidate.canFinishFirst;
  }
  if (candidate.canFinishFirst && candidate.tiedForFirst !== current.tiedForFirst) {
    return !candidate.tiedForFirst;
  }
  if (candidate.projectedRank !== current.projectedRank) {
    return candidate.projectedRank < current.projectedRank;
  }
  if (candidate.projectedTotal !== current.projectedTotal) {
    return candidate.projectedTotal > current.projectedTotal;
  }
  return candidate.eventCount < current.eventCount;
}

function hasScenarioConflict(events: OpponentPathEvent[], next: OpponentPathEvent) {
  if (next.resultKind !== "finalPosition") return false;

  return events.some(
    (event) =>
      event.resultKind === "finalPosition" &&
      event.resultKey === next.resultKey &&
      !sameTeam(event.teams[0], next.teams[0]),
  );
}

export function findEntryScenarioProjection({
  entriesConfig,
  picksByPath,
  results,
  entryId,
  maxEvents = 3,
  candidateLimit = 10,
}: {
  entriesConfig: EntriesConfig;
  picksByPath: Map<string, EntryPicks>;
  results: PoolResults;
  entryId: string;
  maxEvents?: number;
  candidateLimit?: number;
}): EntryScenarioProjection | null {
  const currentRows = buildLeaderboardRows(entriesConfig, picksByPath, results);
  const selectedRow = currentRows.find((row) => row.id === entryId);
  const selectedPicks = selectedRow?.picksPath
    ? picksByPath.get(selectedRow.picksPath)
    : undefined;
  if (!selectedRow || !selectedPicks) return null;

  let best = projectEntryScenario({
    entriesConfig,
    picksByPath,
    results,
    entryId,
    events: [],
  });
  if (best?.canFinishFirst) return best;

  const candidates = buildEntryRemainingEvents({
    picks: selectedPicks,
    results,
  }).slice(0, candidateLimit);

  function visit(startIndex: number, selectedEvents: OpponentPathEvent[]) {
    if (selectedEvents.length > 0) {
      const projection = projectEntryScenario({
        entriesConfig,
        picksByPath,
        results,
        entryId,
        events: selectedEvents,
      });

      if (scenarioIsBetter(projection, best)) {
        best = projection;
      }

      if (projection?.canFinishFirst && !projection.tiedForFirst) return;
    }

    if (selectedEvents.length >= maxEvents) return;

    for (let index = startIndex; index < candidates.length; index += 1) {
      const next = candidates[index];
      if (hasScenarioConflict(selectedEvents, next)) continue;
      visit(index + 1, [...selectedEvents, next]);
    }
  }

  visit(0, []);
  return best;
}

export function buildOpponentPathsReport({
  entriesConfig,
  picksByPath,
  results,
  entryId,
}: {
  entriesConfig: EntriesConfig;
  picksByPath: Map<string, EntryPicks>;
  results: PoolResults;
  entryId: string;
}): OpponentPathsReport | null {
  const rows = buildLeaderboardRows(entriesConfig, picksByPath, results);
  const playerRow = rows.find((row) => row.id === entryId);
  const playerPicks = playerRow?.picksPath ? picksByPath.get(playerRow.picksPath) : undefined;
  if (!playerRow || !playerPicks) return null;

  const opponents = rows
    .filter((row) => row.id !== entryId && row.picksPath)
    .map((row) => {
      const opponentPicks = row.picksPath ? picksByPath.get(row.picksPath) : undefined;
      if (!opponentPicks) return null;

      return buildOpponentReport({
        playerRow,
        opponentRow: {
          ...row,
          score: scorePool(opponentPicks, results),
        },
        playerPicks,
        opponentPicks,
        results,
      });
    })
    .filter((row): row is OpponentPathOpponent => Boolean(row));
  const opponentsAhead = opponents.filter((opponent) => opponent.rank < playerRow.rank);
  const defaultOpponentIds = (opponentsAhead.length ? opponentsAhead : opponents)
    .slice(0, 2)
    .map((opponent) => opponent.id);

  return {
    target: {
      id: playerRow.id,
      name: playerRow.name,
      rank: playerRow.rank,
      total: playerRow.score.total,
    },
    defaultOpponentIds,
    opponents,
  };
}

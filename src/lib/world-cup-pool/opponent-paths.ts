import { buildLeaderboardRows } from "@/lib/world-cup-pool/leaderboard";
import { actualAdvancersForGroup, scorePool } from "@/lib/world-cup-pool/scoring";
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

export type OpponentPathEvent = {
  id: string;
  category: EventCategory;
  title: string;
  detail: string;
  points: number;
  teams: string[];
  groupId?: string;
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
    if (!stageIsOpen(results, stage.key, playerTeams.length)) continue;

    const playerOnly = difference(playerTeams, opponentTeams);
    const opponentOnly = difference(opponentTeams, playerTeams);
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

    if (playerTeam && !sameTeam(playerTeam, opponentTeam)) {
      gainEvents.push({
        id: `final-${stage.key}-${normalizeKey(playerTeam)}`,
        category: "Final",
        title: `${playerTeam} finish as ${stage.label}`,
        detail: `${playerPoints} points for this entry and none for the opponent.`,
        points: playerPoints,
        teams: [playerTeam],
      });
    }

    if (opponentTeam && !sameTeam(playerTeam, opponentTeam)) {
      threatEvents.push({
        id: `final-threat-${stage.key}-${normalizeKey(opponentTeam)}`,
        category: "Final",
        title: `${opponentTeam} finish as ${stage.label}`,
        detail: `${opponentPoints} points for the opponent and none for this entry.`,
        points: opponentPoints,
        teams: [opponentTeam],
      });
    }
  }

  return { gainEvents, threatEvents };
}

function buildBonusEvents({
  playerPicks,
  opponentPicks,
}: {
  playerPicks: EntryPicks;
  opponentPicks: EntryPicks;
}) {
  const gainEvents: OpponentPathEvent[] = [];
  const threatEvents: OpponentPathEvent[] = [];

  for (const bonus of playerPicks.bonus) {
    const opponentBonus = opponentPicks.bonus.find((item) => item.id === bonus.id);
    if (!opponentBonus || sameTeam(bonus.pick, opponentBonus.pick)) continue;

    gainEvents.push({
      id: `bonus-${bonus.id}-${normalizeKey(bonus.pick)}`,
      category: "Bonus",
      title: `${bonus.pick}: ${bonus.label}`,
      detail: `${playerPicks.scoringRules.bonus} bonus points for this entry and none for the opponent.`,
      points: playerPicks.scoringRules.bonus,
      teams: [bonus.pick],
    });
    threatEvents.push({
      id: `bonus-threat-${bonus.id}-${normalizeKey(opponentBonus.pick)}`,
      category: "Bonus",
      title: `${opponentBonus.pick}: ${bonus.label}`,
      detail: `${opponentPicks.scoringRules.bonus} bonus points for the opponent and none for this entry.`,
      points: opponentPicks.scoringRules.bonus,
      teams: [opponentBonus.pick],
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
  const bonus = buildBonusEvents({ playerPicks, opponentPicks });
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

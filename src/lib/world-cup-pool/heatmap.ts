import type {
  EntriesConfig,
  EntryPicks,
} from "@/lib/world-cup-pool/types";

export const KNOCKOUT_HEATMAP_STAGES = [
  { key: "roundOf16", label: "R16" },
  { key: "quarterFinalists", label: "QF" },
  { key: "semifinalists", label: "SF" },
  { key: "finalists", label: "Final" },
  { key: "champion", label: "Champion" },
  { key: "runnerUp", label: "Runner-up" },
  { key: "thirdPlace", label: "Third" },
] as const;

export type HeatmapStageKey = (typeof KNOCKOUT_HEATMAP_STAGES)[number]["key"];

export type HeatmapEntrant = {
  id: string;
  name: string;
};

export type PlayerTeamHeatmapCell = {
  stage?: HeatmapStageKey;
  label?: string;
  weight: number;
};

export type PlayerTeamHeatmapRow = {
  team: string;
  picked: HeatmapCell;
  players: Record<string, PlayerTeamHeatmapCell>;
};

export type HeatmapCell = {
  count: number;
  percent: number;
  entrants: HeatmapEntrant[];
};

export type KnockoutHeatmapRow = {
  team: string;
  stages: Record<HeatmapStageKey, HeatmapCell>;
};

export type PodiumSummary = {
  position: "Champion" | "Runner-up" | "Third place";
  rows: PickSummaryRow[];
};

export type PickSummaryRow = {
  team: string;
  cell: HeatmapCell;
};

export type GroupHeatmapRow = {
  team: string;
  advancer: HeatmapCell;
  positions: HeatmapCell[];
};

export type GroupHeatmapSummary = {
  groupId: string;
  rows: GroupHeatmapRow[];
};

export type BonusHeatmapSummary = {
  id: string;
  label: string;
  rows: PickSummaryRow[];
};

export type KnockoutFlowStage = {
  key: HeatmapStageKey;
  label: string;
  rows: PickSummaryRow[];
};

export type ContrarianPick = {
  team: string;
  stageKey: HeatmapStageKey;
  stageLabel: string;
  cell: HeatmapCell;
  weight: number;
};

export type GroupConsensusPosition = {
  position: number;
  team?: string;
  cell?: HeatmapCell;
};

export type GroupConsensusSummary = {
  groupId: string;
  positions: GroupConsensusPosition[];
  agreementLabel: string;
};

export type EntrantSimilarityRow = {
  entrants: [HeatmapEntrant, HeatmapEntrant];
  sharedPickCount: number;
  totalPickCount: number;
  percent: number;
};

export type PoolHeatmap = {
  eligibleEntryCount: number;
  entrants: HeatmapEntrant[];
  teamFlags: Record<string, string>;
  knockoutFlowStages: KnockoutFlowStage[];
  playerTeamRows: PlayerTeamHeatmapRow[];
  knockoutRows: KnockoutHeatmapRow[];
  contrarianPicks: ContrarianPick[];
  podiumSummaries: PodiumSummary[];
  groupConsensusSummaries: GroupConsensusSummary[];
  groupSummaries: GroupHeatmapSummary[];
  thirdPlaceQualifierRows: PickSummaryRow[];
  bonusSummaries: BonusHeatmapSummary[];
  entrantSimilarityRows: EntrantSimilarityRow[];
};

type EligiblePick = HeatmapEntrant & {
  picks: EntryPicks;
};

type MutableCell = {
  entrants: Map<string, HeatmapEntrant>;
};

function eligiblePicks(
  entriesConfig: EntriesConfig,
  picksByPath: Map<string, EntryPicks>,
) {
  return entriesConfig.entries
    .filter((entry) => Boolean(entry.picksPath))
    .flatMap((entry): EligiblePick[] => {
      const picks = entry.picksPath ? picksByPath.get(entry.picksPath) : undefined;
      if (!picks) return [];
      return [
        {
          id: entry.id,
          name: entry.name,
          picks,
        },
      ];
    });
}

function emptyMutableCell(): MutableCell {
  return { entrants: new Map() };
}

function addEntrant(cell: MutableCell, entrant: HeatmapEntrant) {
  cell.entrants.set(entrant.id, entrant);
}

function toCell(cell: MutableCell | undefined, totalEntries: number): HeatmapCell {
  const entrants = Array.from(cell?.entrants.values() ?? []).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const count = entrants.length;

  return {
    count,
    percent: totalEntries > 0 ? Math.round((count / totalEntries) * 100) : 0,
    entrants,
  };
}

function teamCell(map: Map<string, MutableCell>, team: string) {
  let cell = map.get(team);
  if (!cell) {
    cell = emptyMutableCell();
    map.set(team, cell);
  }
  return cell;
}

function sortedPickRows(
  map: Map<string, MutableCell>,
  totalEntries: number,
): PickSummaryRow[] {
  return Array.from(map.entries())
    .map(([team, cell]) => ({
      team,
      cell: toCell(cell, totalEntries),
    }))
    .sort(
      (a, b) =>
        b.cell.count - a.cell.count ||
        b.cell.percent - a.cell.percent ||
        a.team.localeCompare(b.team),
    );
}

function addTeamsToStage(
  stageMap: Map<string, Record<HeatmapStageKey, MutableCell>>,
  stageKey: HeatmapStageKey,
  teams: string[] | undefined,
  entrant: HeatmapEntrant,
) {
  for (const team of teams ?? []) {
    if (!team) continue;
    const stages = stageMap.get(team) ?? Object.fromEntries(
      KNOCKOUT_HEATMAP_STAGES.map((stage) => [stage.key, emptyMutableCell()]),
    ) as Record<HeatmapStageKey, MutableCell>;

    addEntrant(stages[stageKey], entrant);
    stageMap.set(team, stages);
  }
}

function buildKnockoutRows(picks: EligiblePick[], totalEntries: number) {
  const stageMap = new Map<string, Record<HeatmapStageKey, MutableCell>>();

  for (const entry of picks) {
    addTeamsToStage(
      stageMap,
      "roundOf16",
      entry.picks.advancement.roundOf16,
      entry,
    );
    addTeamsToStage(
      stageMap,
      "quarterFinalists",
      entry.picks.advancement.quarterFinalists,
      entry,
    );
    addTeamsToStage(
      stageMap,
      "semifinalists",
      entry.picks.advancement.semifinalists,
      entry,
    );
    addTeamsToStage(
      stageMap,
      "finalists",
      entry.picks.advancement.finalists,
      entry,
    );
    addTeamsToStage(stageMap, "champion", [entry.picks.podium.champion], entry);
    addTeamsToStage(stageMap, "runnerUp", [entry.picks.podium.runnerUp], entry);
    addTeamsToStage(stageMap, "thirdPlace", [entry.picks.podium.thirdPlace], entry);
  }

  return Array.from(stageMap.entries())
    .map(([team, stages]) => ({
      team,
      stages: Object.fromEntries(
        KNOCKOUT_HEATMAP_STAGES.map((stage) => [
          stage.key,
          toCell(stages[stage.key], totalEntries),
        ]),
      ) as Record<HeatmapStageKey, HeatmapCell>,
    }))
    .sort(
      (a, b) =>
        b.stages.champion.count - a.stages.champion.count ||
        b.stages.finalists.count - a.stages.finalists.count ||
        b.stages.semifinalists.count - a.stages.semifinalists.count ||
        a.team.localeCompare(b.team),
    );
}

function buildKnockoutFlowStages(rows: KnockoutHeatmapRow[]) {
  return KNOCKOUT_HEATMAP_STAGES.map((stage) => ({
    key: stage.key,
    label: stage.label,
    rows: rows
      .map((row) => ({
        team: row.team,
        cell: row.stages[stage.key],
      }))
      .filter((row) => row.cell.count > 0)
      .sort(
        (a, b) =>
          b.cell.count - a.cell.count ||
          b.cell.percent - a.cell.percent ||
          a.team.localeCompare(b.team),
      )
      .slice(0, 6),
  }));
}

function stageWeight(stageKey: HeatmapStageKey) {
  switch (stageKey) {
    case "champion":
      return 7;
    case "runnerUp":
      return 6;
    case "thirdPlace":
      return 5;
    case "finalists":
      return 4;
    case "semifinalists":
      return 3;
    case "quarterFinalists":
      return 2;
    case "roundOf16":
      return 1;
  }
}

function stageLabel(stageKey: HeatmapStageKey) {
  switch (stageKey) {
    case "champion":
      return "C";
    case "runnerUp":
      return "RU";
    case "thirdPlace":
      return "3rd";
    case "finalists":
      return "Final";
    case "semifinalists":
      return "SF";
    case "quarterFinalists":
      return "QF";
    case "roundOf16":
      return "R16";
  }
}

function recordPlayerTeamPick(
  rows: Map<string, PlayerTeamHeatmapRow>,
  totalEntries: number,
  team: string,
  entrant: HeatmapEntrant,
  stageKey: HeatmapStageKey,
) {
  if (!team) return;

  const row = rows.get(team) ?? {
    team,
    picked: toCell(undefined, totalEntries),
    players: {},
  };
  const current = row.players[entrant.id];
  const weight = stageWeight(stageKey);

  if (!current || weight > current.weight) {
    row.players[entrant.id] = {
      stage: stageKey,
      label: stageLabel(stageKey),
      weight,
    };
  }

  rows.set(team, row);
}

function buildPlayerTeamRows(picks: EligiblePick[], totalEntries: number) {
  const rowMap = new Map<string, PlayerTeamHeatmapRow>();
  const pickedMap = new Map<string, MutableCell>();

  for (const entry of picks) {
    const teamStages: Array<[HeatmapStageKey, string[] | undefined]> = [
      ["roundOf16", entry.picks.advancement.roundOf16],
      ["quarterFinalists", entry.picks.advancement.quarterFinalists],
      ["semifinalists", entry.picks.advancement.semifinalists],
      ["finalists", entry.picks.advancement.finalists],
      ["champion", [entry.picks.podium.champion]],
      ["runnerUp", [entry.picks.podium.runnerUp]],
      ["thirdPlace", [entry.picks.podium.thirdPlace]],
    ];

    for (const [stageKey, teams] of teamStages) {
      for (const team of teams ?? []) {
        if (!team) continue;
        recordPlayerTeamPick(rowMap, totalEntries, team, entry, stageKey);
        addEntrant(teamCell(pickedMap, team), entry);
      }
    }
  }

  return Array.from(rowMap.values())
    .map((row) => ({
      ...row,
      picked: toCell(pickedMap.get(row.team), totalEntries),
    }))
    .sort(
      (a, b) =>
        b.picked.count - a.picked.count ||
        b.picked.percent - a.picked.percent ||
        a.team.localeCompare(b.team),
    );
}

function buildContrarianPicks(rows: KnockoutHeatmapRow[]) {
  return rows
    .flatMap((row) =>
      KNOCKOUT_HEATMAP_STAGES.map((stage) => ({
        team: row.team,
        stageKey: stage.key,
        stageLabel: stage.label,
        cell: row.stages[stage.key],
        weight: stageWeight(stage.key),
      })),
    )
    .filter((pick) => pick.cell.count > 0 && pick.cell.count <= 2)
    .sort(
      (a, b) =>
        b.weight - a.weight ||
        a.cell.count - b.cell.count ||
        a.team.localeCompare(b.team),
    )
    .slice(0, 12);
}

function buildPodiumSummaries(picks: EligiblePick[], totalEntries: number) {
  const champion = new Map<string, MutableCell>();
  const runnerUp = new Map<string, MutableCell>();
  const thirdPlace = new Map<string, MutableCell>();

  for (const entry of picks) {
    if (entry.picks.podium.champion) {
      addEntrant(teamCell(champion, entry.picks.podium.champion), entry);
    }
    if (entry.picks.podium.runnerUp) {
      addEntrant(teamCell(runnerUp, entry.picks.podium.runnerUp), entry);
    }
    if (entry.picks.podium.thirdPlace) {
      addEntrant(teamCell(thirdPlace, entry.picks.podium.thirdPlace), entry);
    }
  }

  return [
    { position: "Champion" as const, rows: sortedPickRows(champion, totalEntries) },
    { position: "Runner-up" as const, rows: sortedPickRows(runnerUp, totalEntries) },
    { position: "Third place" as const, rows: sortedPickRows(thirdPlace, totalEntries) },
  ];
}

function buildGroupSummaries(picks: EligiblePick[], totalEntries: number) {
  const groupIds = Array.from(
    new Set(picks.flatMap((entry) => Object.keys(entry.picks.groups))),
  ).sort();

  return groupIds.map((groupId) => {
    const teams = new Set<string>();
    const advancers = new Map<string, MutableCell>();
    const positions = Array.from({ length: 4 }, () => new Map<string, MutableCell>());

    for (const entry of picks) {
      const group = entry.picks.groups[groupId];
      if (!group) continue;

      for (const team of group.teams) {
        if (team.name) teams.add(team.name);
      }

      for (const team of group.predictedAdvancers ?? []) {
        teams.add(team);
        addEntrant(teamCell(advancers, team), entry);
      }

      group.predictedOrder.slice(0, 4).forEach((team, index) => {
        teams.add(team);
        addEntrant(teamCell(positions[index], team), entry);
      });
    }

    const rows = Array.from(teams)
      .map((team) => ({
        team,
        advancer: toCell(advancers.get(team), totalEntries),
        positions: positions.map((position) => toCell(position.get(team), totalEntries)),
      }))
      .sort(
        (a, b) =>
          b.advancer.count - a.advancer.count ||
          b.positions[0].count - a.positions[0].count ||
          a.team.localeCompare(b.team),
      );

    return { groupId, rows };
  });
}

function agreementLabel(percent: number) {
  if (percent >= 70) return "High agreement";
  if (percent >= 45) return "Split";
  return "Wide open";
}

function buildGroupConsensusSummaries(groupSummaries: GroupHeatmapSummary[]) {
  return groupSummaries.map((summary) => {
    const positions = Array.from({ length: 4 }, (_, index) => {
      const leader = summary.rows
        .map((row) => ({ team: row.team, cell: row.positions[index] }))
        .filter((row) => row.cell.count > 0)
        .sort(
          (a, b) =>
            b.cell.count - a.cell.count ||
            b.cell.percent - a.cell.percent ||
            a.team.localeCompare(b.team),
        )[0];

      return {
        position: index + 1,
        team: leader?.team,
        cell: leader?.cell,
      };
    });
    const averageAgreement = Math.round(
      positions.reduce((sum, position) => sum + (position.cell?.percent ?? 0), 0) /
        positions.length,
    );

    return {
      groupId: summary.groupId,
      positions,
      agreementLabel: agreementLabel(averageAgreement),
    };
  });
}

function buildThirdPlaceQualifierRows(
  picks: EligiblePick[],
  totalEntries: number,
) {
  const selections = new Map<string, MutableCell>();

  for (const entry of picks) {
    for (const pick of Object.values(entry.picks.thirdPlace)) {
      if (!pick.selected || !pick.team) continue;
      addEntrant(teamCell(selections, pick.team), entry);
    }
  }

  return sortedPickRows(selections, totalEntries);
}

function buildBonusSummaries(picks: EligiblePick[], totalEntries: number) {
  const bonusIds = new Map<string, { label: string; rows: Map<string, MutableCell> }>();

  for (const entry of picks) {
    for (const bonusPick of entry.picks.bonus) {
      const summary = bonusIds.get(bonusPick.id) ?? {
        label: bonusPick.label,
        rows: new Map<string, MutableCell>(),
      };

      if (bonusPick.pick) {
        addEntrant(teamCell(summary.rows, bonusPick.pick), entry);
      }

      bonusIds.set(bonusPick.id, summary);
    }
  }

  return Array.from(bonusIds.entries()).map(([id, summary]) => ({
    id,
    label: summary.label,
    rows: sortedPickRows(summary.rows, totalEntries),
  }));
}

function buildTeamFlags(picks: EligiblePick[]) {
  const teamFlags: Record<string, string> = {};

  for (const entry of picks) {
    for (const group of Object.values(entry.picks.groups)) {
      for (const team of group.teams) {
        if (team.name && team.flagCode && !teamFlags[team.name]) {
          teamFlags[team.name] = team.flagCode;
        }
      }
    }
  }

  return teamFlags;
}

function pickTokens(entry: EligiblePick) {
  const tokens = new Set<string>();
  const addTeamTokens = (prefix: string, teams: string[] | undefined) => {
    for (const team of teams ?? []) {
      if (team) tokens.add(`${prefix}:${team}`);
    }
  };

  addTeamTokens("ko:r16", entry.picks.advancement.roundOf16);
  addTeamTokens("ko:qf", entry.picks.advancement.quarterFinalists);
  addTeamTokens("ko:sf", entry.picks.advancement.semifinalists);
  addTeamTokens("ko:final", entry.picks.advancement.finalists);
  tokens.add(`podium:champion:${entry.picks.podium.champion}`);
  tokens.add(`podium:runner-up:${entry.picks.podium.runnerUp}`);
  tokens.add(`podium:third:${entry.picks.podium.thirdPlace}`);

  for (const [groupId, group] of Object.entries(entry.picks.groups)) {
    addTeamTokens(`group:${groupId}:advancer`, group.predictedAdvancers);
    group.predictedOrder.slice(0, 4).forEach((team, index) => {
      if (team) tokens.add(`group:${groupId}:position:${index + 1}:${team}`);
    });
  }

  for (const [groupId, pick] of Object.entries(entry.picks.thirdPlace)) {
    if (pick.selected && pick.team) {
      tokens.add(`third-place-qualifier:${groupId}:${pick.team}`);
    }
  }

  for (const bonusPick of entry.picks.bonus) {
    if (bonusPick.pick) tokens.add(`bonus:${bonusPick.id}:${bonusPick.pick}`);
  }

  return tokens;
}

function buildEntrantSimilarityRows(picks: EligiblePick[]) {
  const tokenRows = picks.map((entry) => ({
    entrant: { id: entry.id, name: entry.name },
    tokens: pickTokens(entry),
  }));
  const rows: EntrantSimilarityRow[] = [];

  for (let leftIndex = 0; leftIndex < tokenRows.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < tokenRows.length;
      rightIndex += 1
    ) {
      const left = tokenRows[leftIndex];
      const right = tokenRows[rightIndex];
      const sharedPickCount = Array.from(left.tokens).filter((token) =>
        right.tokens.has(token),
      ).length;
      const totalPickCount = new Set([...left.tokens, ...right.tokens]).size;

      rows.push({
        entrants: [left.entrant, right.entrant],
        sharedPickCount,
        totalPickCount,
        percent:
          totalPickCount > 0
            ? Math.round((sharedPickCount / totalPickCount) * 100)
            : 0,
      });
    }
  }

  return rows
    .sort(
      (a, b) =>
        b.percent - a.percent ||
        b.sharedPickCount - a.sharedPickCount ||
        a.entrants[0].name.localeCompare(b.entrants[0].name),
    )
    .slice(0, 10);
}

export function buildPoolHeatmap(
  entriesConfig: EntriesConfig,
  picksByPath: Map<string, EntryPicks>,
): PoolHeatmap {
  const picks = eligiblePicks(entriesConfig, picksByPath);
  const eligibleEntryCount = picks.length;
  const knockoutRows = buildKnockoutRows(picks, eligibleEntryCount);
  const groupSummaries = buildGroupSummaries(picks, eligibleEntryCount);

  return {
    eligibleEntryCount,
    entrants: picks.map(({ id, name }) => ({ id, name })),
    teamFlags: buildTeamFlags(picks),
    knockoutFlowStages: buildKnockoutFlowStages(knockoutRows),
    playerTeamRows: buildPlayerTeamRows(picks, eligibleEntryCount),
    knockoutRows,
    contrarianPicks: buildContrarianPicks(knockoutRows),
    podiumSummaries: buildPodiumSummaries(picks, eligibleEntryCount),
    groupConsensusSummaries: buildGroupConsensusSummaries(groupSummaries),
    groupSummaries,
    thirdPlaceQualifierRows: buildThirdPlaceQualifierRows(
      picks,
      eligibleEntryCount,
    ),
    bonusSummaries: buildBonusSummaries(picks, eligibleEntryCount),
    entrantSimilarityRows: buildEntrantSimilarityRows(picks),
  };
}

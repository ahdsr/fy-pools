import type {
  BonusScore,
  EntryPicks,
  FinalPositionScore,
  GroupPick,
  GroupScore,
  PoolResults,
  PoolScore,
  ScoringRules,
  StageScore,
} from "@/lib/world-cup-pool/types";

const STAGE_LABELS: Record<StageScore["stageKey"], string> = {
  roundOf16: "Round of 16",
  quarterFinalists: "Quarter-finals",
  semifinalists: "Semi-finals",
  thirdPlaceMatch: "3rd-place match",
  finalists: "Final",
};

export function normalizeName(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

export function displayTeamName(value: string) {
  if (
    /^(Round of \d+|Quarterfinal|Semifinal) \s*\d+\s+Winner$/i.test(value)
  ) {
    return "TBD";
  }

  return value.replaceAll("CuraÃ§ao", "Curaçao");
}

function sameTeam(a: unknown, b: unknown) {
  return normalizeName(a) === normalizeName(b);
}

function includesTeam(list: string[] | undefined, team: string) {
  return Array.isArray(list) && list.some((item) => sameTeam(item, team));
}

function asArray(value: string[] | undefined) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export function actualAdvancersForGroup(results: PoolResults, groupId: string) {
  const currentOrder = asArray(results.groups?.[groupId]?.currentOrder);
  if (currentOrder.length === 0) return [];

  const advancers = currentOrder.slice(0, 2);
  if (includesTeam(results.topThirdGroups ?? [], groupId) && currentOrder[2]) {
    advancers.push(currentOrder[2]);
  }
  return advancers;
}

export function scoreGroup(
  groupId: string,
  groupPick: GroupPick,
  results: PoolResults,
  rules: ScoringRules,
): GroupScore {
  const currentOrder = asArray(results.groups?.[groupId]?.currentOrder);
  const actualAdvancers = actualAdvancersForGroup(results, groupId);
  const predictedAdvancers = asArray(groupPick.predictedAdvancers);
  const predictedOrder = asArray(groupPick.predictedOrder);

  const advancementHits = predictedAdvancers.filter((team) =>
    includesTeam(actualAdvancers, team),
  );
  const advancementPoints = advancementHits.length * rules.groupAdvancement;

  const topFourExact =
    currentOrder.length >= 4 &&
    predictedOrder
      .slice(0, 4)
      .every((team, index) => sameTeam(team, currentOrder[index]));
  const topTwoExact =
    currentOrder.length >= 2 &&
    predictedOrder
      .slice(0, 2)
      .every((team, index) => sameTeam(team, currentOrder[index]));

  const rankBonus = topFourExact
    ? rules.exactTopFourBonus
    : topTwoExact
      ? rules.exactTopTwoBonus
      : 0;

  return {
    groupId,
    points: advancementPoints + rankBonus,
    advancementPoints,
    rankBonus,
    advancementHits,
    currentOrder,
    predictedOrder,
  };
}

function scoreStage(
  stageKey: StageScore["stageKey"],
  predictedTeams: string[] | undefined,
  actualTeams: string[] | undefined,
  rules: ScoringRules,
): StageScore {
  const hits = asArray(predictedTeams).filter((team) =>
    includesTeam(actualTeams, team),
  );
  return {
    stageKey,
    label: STAGE_LABELS[stageKey],
    hits,
    points: hits.length * rules[stageKey],
    perTeam: rules[stageKey],
  };
}

function scoreFinalPosition(
  label: string,
  predicted: string,
  actual: string | undefined,
  points: number,
): FinalPositionScore {
  const hit = Boolean(predicted && actual && sameTeam(predicted, actual));
  return {
    label,
    predicted,
    actual,
    hit,
    points: hit ? points : 0,
  };
}

function scoreBonus(
  picks: EntryPicks,
  results: PoolResults,
  rules: ScoringRules,
): BonusScore[] {
  return picks.bonus.map((item) => {
    const answers = asArray(results.bonus?.[item.id]);
    const hit = includesTeam(answers, item.pick);
    return {
      id: item.id,
      label: item.label,
      pick: item.pick,
      answers,
      hit,
      points: hit ? rules.bonus : 0,
    };
  });
}

export function scorePool(picks: EntryPicks, results: PoolResults): PoolScore {
  const rules = picks.scoringRules;
  const groupBreakdown = Object.entries(picks.groups).map(
    ([groupId, groupPick]) => scoreGroup(groupId, groupPick, results, rules),
  );

  const knockoutBreakdown = [
    scoreStage("roundOf16", picks.advancement.roundOf16, results.roundOf16, rules),
    scoreStage(
      "quarterFinalists",
      picks.advancement.quarterFinalists,
      results.quarterFinalists,
      rules,
    ),
    scoreStage(
      "semifinalists",
      picks.advancement.semifinalists,
      results.semifinalists,
      rules,
    ),
    scoreStage(
      "thirdPlaceMatch",
      picks.advancement.thirdPlaceMatch,
      results.thirdPlaceMatch,
      rules,
    ),
    scoreStage("finalists", picks.advancement.finalists, results.finalists, rules),
  ];

  const finalsBreakdown = [
    scoreFinalPosition(
      "Champion",
      picks.podium.champion,
      results.finals?.champion,
      rules.champion,
    ),
    scoreFinalPosition(
      "Runner-up",
      picks.podium.runnerUp,
      results.finals?.runnerUp,
      rules.runnerUp,
    ),
    scoreFinalPosition(
      "Third place",
      picks.podium.thirdPlace,
      results.finals?.thirdPlace,
      rules.thirdPlace,
    ),
  ];

  const bonusBreakdown = scoreBonus(picks, results, rules);
  const groupPoints = groupBreakdown.reduce((sum, item) => sum + item.points, 0);
  const knockoutPoints = knockoutBreakdown.reduce(
    (sum, item) => sum + item.points,
    0,
  );
  const finalsPoints = finalsBreakdown.reduce((sum, item) => sum + item.points, 0);
  const bonusPoints = bonusBreakdown.reduce((sum, item) => sum + item.points, 0);

  return {
    total: groupPoints + knockoutPoints + finalsPoints + bonusPoints,
    subtotals: {
      group: groupPoints,
      knockout: knockoutPoints,
      finals: finalsPoints,
      bonus: bonusPoints,
    },
    groups: groupBreakdown,
    knockout: knockoutBreakdown,
    finals: finalsBreakdown,
    bonus: bonusBreakdown,
  };
}

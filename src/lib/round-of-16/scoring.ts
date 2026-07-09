import {
  getKnockoutPoolStageDetails,
  getEnabledRoundOf16BonusProps,
  type RoundOf16PickPayload,
  type RoundOf16PoolSettings,
} from "@/lib/templates/round-of-16-draft";

export type RoundOf16ResultPayload = RoundOf16PickPayload;

export type RoundOf16ScoreLine = {
  key: string;
  label: string;
  pick: string;
  result: string;
  pointsAwarded: number;
  maxPoints: number;
  reason: string;
};

export type RoundOf16ScoreResult = {
  total: number;
  maxPoints: number;
  lines: RoundOf16ScoreLine[];
};

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

function answersMatch({
  pick,
  result,
  numeric,
}: {
  pick: string;
  result: string;
  numeric?: boolean;
}) {
  if (numeric) {
    const pickNumber = Number(pick);
    const resultNumber = Number(result);

    return (
      Number.isFinite(pickNumber) &&
      Number.isFinite(resultNumber) &&
      pickNumber === resultNumber
    );
  }

  return normalizeText(pick) === normalizeText(result);
}

export function scoreRoundOf16Entry({
  settings,
  picks,
  results,
}: {
  settings: RoundOf16PoolSettings;
  picks: RoundOf16PickPayload;
  results: RoundOf16ResultPayload;
}): RoundOf16ScoreResult {
  const stage = getKnockoutPoolStageDetails(settings);
  const winnerLines = settings.matchups.map((matchup, index) => {
    const key = `${stage.fieldPrefix}_${index + 1}_winner`;
    const pick = picks.winners[matchup.id] ?? "";
    const result = results.winners[matchup.id] ?? "";
    const hit = Boolean(pick && result && answersMatch({ pick, result }));

    return {
      key,
      label: `${matchup.label || `${stage.label} Match ${index + 1}`} winner`,
      pick,
      result,
      pointsAwarded: hit ? settings.scoring.winnerPoints : 0,
      maxPoints: settings.scoring.winnerPoints,
      reason: result
        ? hit
          ? `Correct ${stage.label.toLowerCase()} winner.`
          : "Winner pick did not match the result."
        : "Result has not been entered.",
    };
  });

  const bonusLines = getEnabledRoundOf16BonusProps(settings).map((prop) => {
    const key = `bonus_${prop.id}`;
    const pick = picks.bonusAnswers[prop.id] ?? "";
    const result = results.bonusAnswers[prop.id] ?? "";
    const hit = Boolean(
      pick &&
        result &&
        answersMatch({
          pick,
          result,
          numeric: prop.id === "penalty-decisions",
        }),
    );

    return {
      key,
      label: prop.label,
      pick,
      result,
      pointsAwarded: hit ? prop.points : 0,
      maxPoints: prop.points,
      reason: result
        ? hit
          ? "Correct bonus answer."
          : "Bonus answer did not match the result."
        : "Result has not been entered.",
    };
  });

  const lines = [...winnerLines, ...bonusLines];

  return {
    total: lines.reduce((sum, line) => sum + line.pointsAwarded, 0),
    maxPoints: lines.reduce((sum, line) => sum + line.maxPoints, 0),
    lines,
  };
}

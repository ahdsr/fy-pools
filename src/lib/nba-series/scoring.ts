import { createNbaSimulation } from "@/lib/nba-series/draft";
import type { NbaSeriesPickPayload, NbaSeriesScoreResult, NbaSeriesSettings } from "@/lib/nba-series/types";

function scoreLabel(winner: string, winnerWins: number, loserWins: number) {
  return winner ? `${winner} ${winnerWins}-${loserWins}` : "";
}

export function scoreNbaSeriesEntry({ settings, picks, results = settings.results }: {
  settings: NbaSeriesSettings;
  picks: NbaSeriesPickPayload;
  results?: NbaSeriesSettings["results"];
}): NbaSeriesScoreResult {
  const simulation = createNbaSimulation({ teams: settings.teams, results });
  const lines = simulation.series.flatMap((series) => {
    const pick = picks.series[series.id];
    const result = results[series.id];
    const correctWinner = Boolean(pick && result && pick.winner === result.winner);
    const exactScore = correctWinner && pick.winnerWins === result.winnerWins && pick.loserWins === result.loserWins;
    const label = series.label;
    return [
      { key: `${series.id}:winner`, label, pick: pick ? scoreLabel(pick.winner, pick.winnerWins, pick.loserWins) : "", result: result ? scoreLabel(result.winner, result.winnerWins, result.loserWins) : "", pointsAwarded: correctWinner ? settings.scoring.winnerPoints : 0, maxPoints: settings.scoring.winnerPoints, reason: result ? (correctWinner ? "Correct series winner." : "Series winner did not match the result.") : "Result has not been entered." },
      { key: `${series.id}:score`, label: `${label} exact score`, pick: pick ? `${pick.winnerWins}-${pick.loserWins}` : "", result: result ? `${result.winnerWins}-${result.loserWins}` : "", pointsAwarded: exactScore ? settings.scoring.exactScorePoints : 0, maxPoints: settings.scoring.exactScorePoints, reason: result ? (exactScore ? "Exact series score." : "Series score did not match the result.") : "Result has not been entered." },
    ];
  });
  return { total: lines.reduce((total, line) => total + line.pointsAwarded, 0), maxPoints: lines.reduce((total, line) => total + line.maxPoints, 0), lines };
}

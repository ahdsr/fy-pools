/**
 * Deterministic, provider-independent progression utilities. They are used by
 * template tests today and can later power commissioner preview/simulation UI.
 */
export type BracketSlot =
  | { team: string }
  | { winnerOf: string }
  | { team?: undefined; winnerOf?: undefined };

export type BracketSeries = {
  id: string;
  label: string;
  round: number;
  home: BracketSlot;
  away: BracketSlot;
  bestOf: number;
};

export type SeriesResult = {
  winner: string;
  winnerWins: number;
  loserWins: number;
};

export type BracketSimulation = {
  series: readonly BracketSeries[];
  results: Readonly<Record<string, SeriesResult>>;
};

export type ResolvedBracketSeries = BracketSeries & {
  homeTeam?: string;
  awayTeam?: string;
  result?: SeriesResult;
  playable: boolean;
};

function winnerFor(
  results: Readonly<Record<string, SeriesResult>>,
  seriesId: string,
) {
  return results[seriesId]?.winner;
}

function resolveSlot(
  slot: BracketSlot,
  results: Readonly<Record<string, SeriesResult>>,
) {
  if ("team" in slot && slot.team) return slot.team;
  if ("winnerOf" in slot && slot.winnerOf) return winnerFor(results, slot.winnerOf);
  return undefined;
}

export function resolveBracketSimulation(
  simulation: BracketSimulation,
): ResolvedBracketSeries[] {
  return simulation.series.map((series) => {
    const homeTeam = resolveSlot(series.home, simulation.results);
    const awayTeam = resolveSlot(series.away, simulation.results);

    return {
      ...series,
      homeTeam,
      awayTeam,
      result: simulation.results[series.id],
      playable: Boolean(
        homeTeam && awayTeam && !simulation.results[series.id],
      ),
    };
  });
}

export function getNextPlayableSeries(simulation: BracketSimulation) {
  return resolveBracketSimulation(simulation)
    .filter((series) => series.playable)
    .sort((a, b) => a.round - b.round || a.id.localeCompare(b.id))[0];
}

function winsNeeded(bestOf: number) {
  if (!Number.isInteger(bestOf) || bestOf < 1 || bestOf % 2 === 0) {
    throw new Error("A series must use a positive odd best-of value.");
  }

  return Math.floor(bestOf / 2) + 1;
}

export function recordSeriesResult({
  simulation,
  seriesId,
  result,
}: {
  simulation: BracketSimulation;
  seriesId: string;
  result: SeriesResult;
}): BracketSimulation {
  const series = resolveBracketSimulation(simulation).find(
    (candidate) => candidate.id === seriesId,
  );

  if (!series) throw new Error("Series does not exist in this bracket.");
  if (!series.playable) {
    throw new Error("Series is not ready to be played or already has a result.");
  }
  if (result.winner !== series.homeTeam && result.winner !== series.awayTeam) {
    throw new Error("Series winner must be one of the resolved teams.");
  }

  const targetWins = winsNeeded(series.bestOf);
  if (
    !Number.isInteger(result.winnerWins) ||
    !Number.isInteger(result.loserWins) ||
    result.winnerWins !== targetWins ||
    result.loserWins < 0 ||
    result.loserWins >= targetWins
  ) {
    throw new Error("Series score is not valid for this best-of format.");
  }

  return {
    ...simulation,
    results: {
      ...simulation.results,
      [seriesId]: result,
    },
  };
}

export function simulateSeriesResultsInOrder({
  simulation,
  results,
}: {
  simulation: BracketSimulation;
  results: readonly { seriesId: string; result: SeriesResult }[];
}) {
  return results.reduce(
    (current, next) =>
      recordSeriesResult({
        simulation: current,
        seriesId: next.seriesId,
        result: next.result,
      }),
    simulation,
  );
}

function firstRoundSeries({
  conference,
  seedA,
  seedB,
  order,
}: {
  conference: "east" | "west";
  seedA: number;
  seedB: number;
  order: number;
}): BracketSeries {
  return {
    id: `${conference}-r1-${order}`,
    label: `${conference === "east" ? "East" : "West"} First Round ${order}`,
    round: 1,
    home: { team: `${conference === "east" ? "East" : "West"} ${seedA}` },
    away: { team: `${conference === "east" ? "East" : "West"} ${seedB}` },
    bestOf: 7,
  };
}

/** A neutral seeded NBA-style playoff bracket, suitable for test simulations. */
export function createNbaPlayoffSimulation({
  eastTeams = Array.from({ length: 8 }, (_, index) => `East ${index + 1}`),
  westTeams = Array.from({ length: 8 }, (_, index) => `West ${index + 1}`),
}: {
  eastTeams?: readonly string[];
  westTeams?: readonly string[];
} = {}): BracketSimulation {
  if (eastTeams.length !== 8 || westTeams.length !== 8) {
    throw new Error("NBA playoff simulations require eight teams in each conference.");
  }
  const firstRound = (["east", "west"] as const).flatMap((conference) => [
    { ...firstRoundSeries({ conference, seedA: 1, seedB: 8, order: 1 }), home: { team: (conference === "east" ? eastTeams : westTeams)[0] }, away: { team: (conference === "east" ? eastTeams : westTeams)[7] } },
    { ...firstRoundSeries({ conference, seedA: 4, seedB: 5, order: 2 }), home: { team: (conference === "east" ? eastTeams : westTeams)[3] }, away: { team: (conference === "east" ? eastTeams : westTeams)[4] } },
    { ...firstRoundSeries({ conference, seedA: 3, seedB: 6, order: 3 }), home: { team: (conference === "east" ? eastTeams : westTeams)[2] }, away: { team: (conference === "east" ? eastTeams : westTeams)[5] } },
    { ...firstRoundSeries({ conference, seedA: 2, seedB: 7, order: 4 }), home: { team: (conference === "east" ? eastTeams : westTeams)[1] }, away: { team: (conference === "east" ? eastTeams : westTeams)[6] } },
  ]);
  const conferenceRounds = (["east", "west"] as const).flatMap((conference) => [
    {
      id: `${conference}-sf-1`,
      label: `${conference === "east" ? "East" : "West"} Semi-final 1`,
      round: 2,
      home: { winnerOf: `${conference}-r1-1` },
      away: { winnerOf: `${conference}-r1-2` },
      bestOf: 7,
    },
    {
      id: `${conference}-sf-2`,
      label: `${conference === "east" ? "East" : "West"} Semi-final 2`,
      round: 2,
      home: { winnerOf: `${conference}-r1-3` },
      away: { winnerOf: `${conference}-r1-4` },
      bestOf: 7,
    },
    {
      id: `${conference}-final`,
      label: `${conference === "east" ? "East" : "West"} Final`,
      round: 3,
      home: { winnerOf: `${conference}-sf-1` },
      away: { winnerOf: `${conference}-sf-2` },
      bestOf: 7,
    },
  ] satisfies BracketSeries[]);

  return {
    series: [
      ...firstRound,
      ...conferenceRounds,
      {
        id: "nba-finals",
        label: "NBA Finals",
        round: 4,
        home: { winnerOf: "east-final" },
        away: { winnerOf: "west-final" },
        bestOf: 7,
      },
    ],
    results: {},
  };
}

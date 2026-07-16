import { createNbaPlayoffSimulation } from "@/lib/templates/bracket-simulation";
import type { NbaSeriesSettings } from "@/lib/nba-series/types";

const EAST_TEAMS = [
  "Celtics", "Cavaliers", "Knicks", "Magic", "Pacers", "Bucks", "Heat", "Hawks",
];
const WEST_TEAMS = [
  "Thunder", "Nuggets", "Timberwolves", "Lakers", "Clippers", "Warriors", "Grizzlies", "Kings",
];

export const NBA_SERIES_TEMPLATE_SLUG = "nba-series-bracket";

export function createDefaultNbaSeriesSettings(): NbaSeriesSettings {
  return {
    basics: {
      poolName: "NBA Playoff Bracket",
      commissionerName: "",
      eventLabel: "NBA Playoffs",
      picksLockAt: "2027-04-17T13:00",
      timezone: "America/Toronto",
      description: "",
    },
    teams: [
      ...EAST_TEAMS.map((name, index) => ({ id: `east-${index + 1}`, name, conference: "east" as const, seed: index + 1 })),
      ...WEST_TEAMS.map((name, index) => ({ id: `west-${index + 1}`, name, conference: "west" as const, seed: index + 1 })),
    ],
    scoring: { winnerPoints: 2, exactScorePoints: 1, prizePoolLabel: "" },
    payouts: [
      { id: "payout-1", place: "1st Place", amount: "" },
      { id: "payout-2", place: "2nd Place", amount: "" },
      { id: "payout-3", place: "3rd Place", amount: "" },
    ],
    expectedEntries: 0,
    inviteNote: "",
    results: {},
  };
}

export function createNbaSimulation(settings: Pick<NbaSeriesSettings, "teams" | "results">) {
  const eastTeams = settings.teams
    .filter((team) => team.conference === "east")
    .sort((a, b) => a.seed - b.seed)
    .map((team) => team.name);
  const westTeams = settings.teams
    .filter((team) => team.conference === "west")
    .sort((a, b) => a.seed - b.seed)
    .map((team) => team.name);

  return { ...createNbaPlayoffSimulation({ eastTeams, westTeams }), results: settings.results };
}

export function validateNbaSeriesSettings(settings: NbaSeriesSettings) {
  if (!settings.basics.poolName.trim()) return "Enter a pool name.";
  if (!settings.basics.commissionerName.trim()) return "Enter the commissioner name.";
  if (!settings.basics.picksLockAt.trim()) return "Set a pick deadline.";
  if (settings.teams.length !== 16) return "Configure all 16 playoff teams.";
  for (const conference of ["east", "west"] as const) {
    const teams = settings.teams.filter((team) => team.conference === conference);
    if (teams.length !== 8 || new Set(teams.map((team) => team.seed)).size !== 8) {
      return `Configure eight seeded ${conference === "east" ? "Eastern" : "Western"} teams.`;
    }
  }
  if (new Set(settings.teams.map((team) => team.name.trim().toLowerCase())).size !== 16) {
    return "Every playoff team must be unique.";
  }
  if (settings.scoring.winnerPoints < 0 || settings.scoring.exactScorePoints < 0) {
    return "Scoring points cannot be negative.";
  }
  return null;
}

export function nbaPickDeadlineHasPassed(settings: NbaSeriesSettings, now = Date.now()) {
  const lockAt = new Date(settings.basics.picksLockAt).getTime();
  return !Number.isFinite(lockAt) || now >= lockAt;
}

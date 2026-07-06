export const ESPN_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?limit=200&dates=20260611-20260719";
export const FIFA_TEAM_STATISTICS_URL =
  "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/statistics/team-statistics";
export const FIFA_SEASON_ID = "285023";
export const FIFA_CALENDAR_URL = `https://api.fifa.com/api/v3/calendar/matches?language=en&count=200&idSeason=${FIFA_SEASON_ID}`;
export const FIFA_TIMELINE_URL_TEMPLATE =
  "https://api.fifa.com/api/v3/timelines/{idMatch}?language=en";
export const FIFA_FDH_TEAM_STATS_URL_TEMPLATE = `https://fdh-api.fifa.com/v1/stats/season/${FIFA_SEASON_ID}/team/{idTeam}.json`;

export const WORLD_CUP_REFERENCE_LINKS = [
  {
    label: "ESPN scores API",
    href: ESPN_SCOREBOARD_URL,
  },
  {
    label: "FIFA match calendar API",
    href: FIFA_CALENDAR_URL,
  },
  {
    label: "FIFA team statistics",
    href: FIFA_TEAM_STATISTICS_URL,
  },
] as const;

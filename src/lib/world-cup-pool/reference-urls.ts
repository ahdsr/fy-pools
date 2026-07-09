export const FIFA_TEAM_STATISTICS_URL =
  "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/statistics/team-statistics";
export const FIFA_STANDINGS_URL =
  "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/standings";
export const FIFA_GROUP_TIEBREAKERS_URL =
  "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/groups-how-teams-qualify-tie-breakers";
export const FIFA_SEASON_ID = "285023";
export const FIFA_CALENDAR_URL = `https://api.fifa.com/api/v3/calendar/matches?language=en&count=200&idSeason=${FIFA_SEASON_ID}`;
export const FIFA_TIMELINE_URL_TEMPLATE =
  "https://api.fifa.com/api/v3/timelines/{idMatch}?language=en";
export const FIFA_FDH_TEAM_STATS_URL_TEMPLATE = `https://fdh-api.fifa.com/v1/stats/season/${FIFA_SEASON_ID}/team/{idTeam}.json`;
export const FIFA_MEN_RANKING_URL = "https://inside.fifa.com/fifa-world-ranking/men";
export const FIFA_MEN_RANKING_API_URL_TEMPLATE =
  "https://inside.fifa.com/api/ranking-overview?locale=en&dateId={dateId}";

export const WORLD_CUP_REFERENCE_LINKS = [
  {
    label: "FIFA match calendar API",
    href: FIFA_CALENDAR_URL,
  },
  {
    label: "FIFA standings",
    href: FIFA_STANDINGS_URL,
  },
  {
    label: "FIFA tiebreakers",
    href: FIFA_GROUP_TIEBREAKERS_URL,
  },
  {
    label: "FIFA team statistics",
    href: FIFA_TEAM_STATISTICS_URL,
  },
  {
    label: "FIFA men's ranking",
    href: FIFA_MEN_RANKING_URL,
  },
] as const;

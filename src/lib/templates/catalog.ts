export type TemplateCategory = {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  eventWindow: string;
  tone: string;
  accent: string;
  templates: PoolTemplate[];
};

export type PoolTemplate = {
  slug: string;
  name: string;
  bestFor: string;
  picks: string;
  lock: string;
  popularity: "Popular" | "New" | "Classic";
};

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    slug: "world-cup",
    name: "World Cup",
    shortName: "WC",
    description:
      "Global football pools for full-tournament predictors, group stages, and knockout brackets.",
    eventWindow: "Major tournaments",
    tone: "bg-surface-paper",
    accent: "bg-primary",
    templates: [
      {
        slug: "world-cup-full-predictor",
        name: "World Cup Full Predictor",
        bestFor: "Serious tournament pools",
        picks: "Groups, bracket, podium, bonus",
        lock: "Tournament deadline",
        popularity: "Popular",
      },
      {
        slug: "world-cup-knockout-bracket",
        name: "Knockout Bracket",
        bestFor: "Fast bracket pools",
        picks: "Round winners, finalists, champion",
        lock: "Before round of 16",
        popularity: "Classic",
      },
      {
        slug: "world-cup-daily-pickem",
        name: "Daily Match Pick'em",
        bestFor: "Casual matchday groups",
        picks: "Winner, draw, scoreline",
        lock: "Match by match",
        popularity: "New",
      },
    ],
  },
  {
    slug: "nba",
    name: "NBA",
    shortName: "NBA",
    description:
      "Playoff brackets, series score calls, Finals picks, and recurring regular-season formats.",
    eventWindow: "Season and playoffs",
    tone: "bg-brand-lime/35",
    accent: "bg-brand-success",
    templates: [
      {
        slug: "nba-series-bracket",
        name: "NBA Series Bracket",
        bestFor: "Playoff office pools",
        picks: "Series scores, conference champs",
        lock: "Before first tip",
        popularity: "Popular",
      },
      {
        slug: "nba-finals-prop-card",
        name: "Finals Prop Card",
        bestFor: "Finals watch parties",
        picks: "MVP, games, top scorer, bonuses",
        lock: "Before game 1",
        popularity: "New",
      },
      {
        slug: "nba-weekly-pickem",
        name: "Weekly Pick'em",
        bestFor: "Recurring groups",
        picks: "Game winners, spreads, totals",
        lock: "Weekly slate",
        popularity: "Classic",
      },
    ],
  },
  {
    slug: "nfl",
    name: "NFL",
    shortName: "NFL",
    description:
      "Weekly pick'em, survivor, playoff brackets, and Super Bowl party sheets.",
    eventWindow: "Weekly season",
    tone: "bg-brand-sky/38",
    accent: "bg-brand-warning",
    templates: [
      {
        slug: "nfl-survivor",
        name: "Survivor Pool",
        bestFor: "Large casual pools",
        picks: "One team per week, no repeats",
        lock: "Weekly kickoff",
        popularity: "Popular",
      },
      {
        slug: "nfl-weekly-pickem",
        name: "Weekly Pick'em",
        bestFor: "Office leagues",
        picks: "Winners, confidence, tiebreaker",
        lock: "First game each week",
        popularity: "Classic",
      },
      {
        slug: "nfl-playoff-bracket",
        name: "Playoff Bracket",
        bestFor: "Postseason pools",
        picks: "Bracket, Super Bowl, MVP bonus",
        lock: "Wild Card kickoff",
        popularity: "New",
      },
    ],
  },
  {
    slug: "tennis",
    name: "Tennis",
    shortName: "Tennis",
    description:
      "Grand Slam brackets, round-by-round picks, and finals prediction cards.",
    eventWindow: "Grand Slams",
    tone: "bg-brand-coral/18",
    accent: "bg-brand-coral",
    templates: [
      {
        slug: "tennis-slam-bracket",
        name: "Grand Slam Bracket",
        bestFor: "Tournament bracket fans",
        picks: "Quarterfinals through champion",
        lock: "Before main draw",
        popularity: "Popular",
      },
      {
        slug: "tennis-daily-match-card",
        name: "Daily Match Card",
        bestFor: "Daily tournament groups",
        picks: "Match winners, sets, upset bonus",
        lock: "Daily first serve",
        popularity: "New",
      },
      {
        slug: "tennis-finals-card",
        name: "Finals Predictor",
        bestFor: "Weekend finals pools",
        picks: "Winner, set score, aces bonus",
        lock: "Before final",
        popularity: "Classic",
      },
    ],
  },
  {
    slug: "golf",
    name: "Golf",
    shortName: "Golf",
    description:
      "Major championship rosters, cut-line pools, fantasy foursomes, and prop cards.",
    eventWindow: "Major weekends",
    tone: "bg-surface-paper",
    accent: "bg-brand-success",
    templates: [
      {
        slug: "golf-major-roster",
        name: "Major Roster Pool",
        bestFor: "Masters-style pools",
        picks: "Roster, finishing points, cut bonus",
        lock: "Thursday tee time",
        popularity: "Popular",
      },
      {
        slug: "golf-cut-line-card",
        name: "Cut Line Card",
        bestFor: "Two-day side games",
        picks: "Make/miss cut, low amateur, leader",
        lock: "Round 1 start",
        popularity: "New",
      },
      {
        slug: "golf-final-round-props",
        name: "Final Round Props",
        bestFor: "Sunday groups",
        picks: "Winner, score, top five, playoff",
        lock: "Final round tee time",
        popularity: "Classic",
      },
    ],
  },
];

export function getCategoryBySlug(slug: string | undefined) {
  return TEMPLATE_CATEGORIES.find((category) => category.slug === slug);
}

export function getAllTemplates() {
  return TEMPLATE_CATEGORIES.flatMap((category) =>
    category.templates.map((template) => ({ ...template, category })),
  );
}

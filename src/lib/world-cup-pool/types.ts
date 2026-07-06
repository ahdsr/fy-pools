export type ScoreSubtotals = {
  group: number;
  knockout: number;
  finals: number;
  bonus: number;
};

export type TeamOption = {
  name: string;
  flagCode?: string;
};

export type GroupPick = {
  teams: TeamOption[];
  predictedOrder: string[];
  predictedAdvancers: string[];
};

export type ThirdPlacePick = {
  team: string;
  selected: boolean;
};

export type MatchPick = {
  id: string;
  seeds?: string[];
  teams: string[];
  winner: string;
};

export type BonusPick = {
  id: string;
  label: string;
  pick: string;
};

export type ScoringRules = {
  groupAdvancement: number;
  exactTopTwoBonus: number;
  exactTopFourBonus: number;
  roundOf16: number;
  quarterFinalists: number;
  semifinalists: number;
  thirdPlaceMatch: number;
  finalists: number;
  thirdPlace: number;
  runnerUp: number;
  champion: number;
  bonus: number;
};

export type EntryPicks = {
  meta: {
    title: string;
    owner: string;
    sourceWorkbook?: string;
    generatedAt?: string;
  };
  scoringRules: ScoringRules;
  bonus: BonusPick[];
  groups: Record<string, GroupPick>;
  thirdPlace: Record<string, ThirdPlacePick>;
  knockout: {
    roundOf32: MatchPick[];
    roundOf16: MatchPick[];
    quarterFinals: MatchPick[];
    semiFinals: MatchPick[];
    final: {
      teams: string[];
      winner: string;
    };
    thirdPlace: {
      teams: string[];
      winner: string;
    };
  };
  advancement: {
    roundOf16: string[];
    quarterFinalists: string[];
    semifinalists: string[];
    finalists: string[];
    thirdPlaceMatch: string[];
  };
  podium: {
    champion: string;
    runnerUp: string;
    thirdPlace: string;
  };
};

export type PoolEntry = {
  id: string;
  name: string;
  picksPath?: string;
  quote?: string;
  celebrationQuote?: string;
  sample?: boolean;
  score?: Partial<PoolScore>;
};

export type EntriesConfig = {
  poolName: string;
  prizePoolLabel?: string;
  payouts?: {
    place: string;
    amount: string;
  }[];
  defaultEntryId?: string;
  entries: PoolEntry[];
};

export type GroupResult = {
  currentOrder: string[];
  status: string;
  stats?: {
    team: string;
    played: number;
    points: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
  }[];
};

export type MatchResult = {
  id: string;
  date: string;
  state: string;
  completed: boolean;
  detail: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  winner: string;
  loser: string;
};

export type PoolResults = {
  meta?: {
    lastUpdated?: string;
    status?: string;
    source?: string;
    sourceUrl?: string;
    sourceNote?: string;
  };
  matches?: MatchResult[];
  groups?: Record<string, GroupResult>;
  topThirdGroups?: string[];
  roundOf16?: string[];
  quarterFinalists?: string[];
  semifinalists?: string[];
  thirdPlaceMatch?: string[];
  finalists?: string[];
  finals?: {
    champion?: string;
    runnerUp?: string;
    thirdPlace?: string;
  };
  bonus?: Record<string, string[]>;
};

export type GroupScore = {
  groupId: string;
  points: number;
  advancementPoints: number;
  rankBonus: number;
  advancementHits: string[];
  currentOrder: string[];
  predictedOrder: string[];
};

export type StageScore = {
  stageKey: keyof Pick<
    ScoringRules,
    "roundOf16" | "quarterFinalists" | "semifinalists" | "thirdPlaceMatch" | "finalists"
  >;
  label: string;
  hits: string[];
  points: number;
  perTeam: number;
};

export type FinalPositionScore = {
  label: string;
  predicted: string;
  actual?: string;
  hit: boolean;
  points: number;
};

export type BonusScore = {
  id: string;
  label: string;
  pick: string;
  answers: string[];
  hit: boolean;
  points: number;
};

export type PoolScore = {
  total: number;
  subtotals: ScoreSubtotals;
  groups: GroupScore[];
  knockout: StageScore[];
  finals: FinalPositionScore[];
  bonus: BonusScore[];
};

export type LeaderboardRow = PoolEntry & {
  score: PoolScore;
  rank: number;
};

export type PoolFixture = {
  slug: string;
  entriesConfig: EntriesConfig;
  results: PoolResults;
  picksByPath: Map<string, EntryPicks>;
};

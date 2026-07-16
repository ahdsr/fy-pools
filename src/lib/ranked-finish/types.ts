export type RankedFinishMarket = {
  id: string;
  label: string;
  positions: number;
  pointsPerExactPosition: number;
};

export type RankedFinishCompetitor = { id: string; name: string };

export type RankedFinishBasics = {
  poolName: string;
  commissionerName: string;
  eventLabel: string;
  picksLockAt: string;
  timezone: string;
  description: string;
};

export type RankedFinishSettings = {
  templateSlug: string;
  basics: RankedFinishBasics;
  competitors: RankedFinishCompetitor[];
  markets: RankedFinishMarket[];
  results: Record<string, string[]>;
  sourceSnapshot?: {
    provider: string;
    eventExternalId: string;
    sourceSignature: string;
    fetchedAt: string;
    fieldStatus: string;
    rosterReviewed: boolean;
    reviewedAt?: string;
  };
};

export type RankedFinishPickPayload = { markets: Record<string, string[]> };

export type RankedFinishScoreLine = {
  key: string;
  label: string;
  pick: string;
  result: string;
  pointsAwarded: number;
  maxPoints: number;
  reason: string;
};

export type RankedFinishScoreResult = {
  total: number;
  maxPoints: number;
  lines: RankedFinishScoreLine[];
};

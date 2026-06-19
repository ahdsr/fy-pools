import { notFound } from "next/navigation";

import {
  LockerRoom,
  type LockerRoomParticipant,
  type LockerRoomPosition,
  type LockerRoomSide,
} from "@/components/app/locker-room";
import {
  buildCurrentLockerRoomMatch,
  findMatchGroupId,
  getReferencePicks,
} from "@/lib/world-cup-pool/current-match";
import { buildLeaderboardRows } from "@/lib/world-cup-pool/leaderboard";
import { getPublicPool } from "@/lib/world-cup-pool/data";
import { normalizeName } from "@/lib/world-cup-pool/scoring";
import type { EntryPicks, LeaderboardRow } from "@/lib/world-cup-pool/types";

type LockerRoomPageProps = {
  params: Promise<{ poolSlug: string }>;
};

const POSITIONS: LockerRoomPosition[] = ["GK", "DEF", "MID", "FWD"];

function sideTakes(homeTeam: string, awayTeam: string): Record<LockerRoomSide, string[]> {
  return {
    home: [
      `${homeTeam} just needs one early chance.`,
      "Set pieces are going to decide this.",
      "This group is still there for the taking.",
      `${awayTeam} cannot sit deep forever.`,
    ],
    away: [
      `${awayTeam} upset watch starts now.`,
      `${homeTeam} looks way too comfortable.`,
      "One counter and this room flips.",
      "Nobody likes the fourth-place energy.",
    ],
    neutral: [
      "Scout mode until the first real chance.",
      "I am only here for receipts.",
    ],
  };
}

function pickSide(
  picks: EntryPicks | undefined,
  homeTeam: string,
  awayTeam: string,
): LockerRoomSide {
  const groupId = findMatchGroupId(picks, homeTeam, awayTeam);
  const order = groupId ? picks?.groups[groupId]?.predictedOrder ?? [] : [];
  const homeIndex = order.findIndex(
    (team) => normalizeName(team) === normalizeName(homeTeam),
  );
  const awayIndex = order.findIndex(
    (team) => normalizeName(team) === normalizeName(awayTeam),
  );

  if (homeIndex === -1 && awayIndex === -1) return "neutral";
  if (homeIndex === -1) return "away";
  if (awayIndex === -1) return "home";
  return homeIndex <= awayIndex ? "home" : "away";
}

function buildTake(
  side: LockerRoomSide,
  row: LeaderboardRow,
  index: number,
  homeTeam: string,
  awayTeam: string,
) {
  const options = sideTakes(homeTeam, awayTeam)[side];
  const base = options[index % options.length];

  if (row.rank <= 3) return `${base} Rank ${row.rank} talking.`;
  if (row.score.total === 0) return `${base} No points, no fear.`;
  return base;
}

function buildLockerRoomParticipants(
  rows: LeaderboardRow[],
  picksByPath: Map<string, EntryPicks>,
  homeTeam: string,
  awayTeam: string,
): LockerRoomParticipant[] {
  return rows.map((row, index) => {
    const picks = row.picksPath ? picksByPath.get(row.picksPath) : undefined;
    const side = pickSide(picks, homeTeam, awayTeam);
    const rankSeed = Math.max(0, row.rank - 1);
    const position = POSITIONS[(rankSeed + index) % POSITIONS.length];

    return {
      id: row.id,
      name: row.name,
      rank: row.rank,
      points: row.score.total,
      side,
      position,
      confidence: Math.min(98, 58 + ((row.score.total + index * 7) % 37)),
      take: buildTake(side, row, index, homeTeam, awayTeam),
    };
  });
}

export default async function LockerRoomPage({ params }: LockerRoomPageProps) {
  const { poolSlug } = await params;
  const pool = await getPublicPool(poolSlug);
  if (!pool) notFound();

  const rows = buildLeaderboardRows(
    pool.entriesConfig,
    pool.picksByPath,
    pool.results,
  );
  const referencePicks = getReferencePicks(pool.picksByPath);
  const match = buildCurrentLockerRoomMatch(pool.results, referencePicks);
  const participants = buildLockerRoomParticipants(
    rows,
    pool.picksByPath,
    match.homeTeam,
    match.awayTeam,
  );

  return (
    <LockerRoom
      match={match}
      participants={participants}
      poolHref={`/pools/${poolSlug}`}
    />
  );
}

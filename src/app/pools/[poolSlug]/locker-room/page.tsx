import { notFound } from "next/navigation";

import {
  LockerRoom,
  type LockerRoomMatch,
  type LockerRoomParticipant,
  type LockerRoomPosition,
  type LockerRoomSide,
} from "@/components/app/locker-room";
import { PublicPoolHeader } from "@/components/app/mock-auth";
import { buildLeaderboardRows } from "@/lib/world-cup-pool/leaderboard";
import { getPublicPool } from "@/lib/world-cup-pool/data";
import type { EntryPicks, LeaderboardRow } from "@/lib/world-cup-pool/types";

type LockerRoomPageProps = {
  params: Promise<{ poolSlug: string }>;
};

const LOCKER_ROOM_MATCH: LockerRoomMatch = {
  competition: "FIFA World Cup 2026",
  timeLabel: "Today, 12:00 p.m.",
  groupLabel: "Group Stage - Group A",
  homeTeam: "Czechia",
  awayTeam: "South Africa",
  homeFlagCode: "cz",
  awayFlagCode: "za",
  homeRankLabel: "3rd",
  awayRankLabel: "4th",
};

const POSITIONS: LockerRoomPosition[] = ["GK", "DEF", "MID", "FWD"];

const SIDE_TAKES: Record<LockerRoomSide, string[]> = {
  home: [
    "Czechia just needs one early chance.",
    "Set pieces are going to decide this.",
    "Group A is still there for the taking.",
    "South Africa cannot sit deep forever.",
  ],
  away: [
    "South Africa upset watch starts now.",
    "Czechia looks way too comfortable.",
    "One counter and this room flips.",
    "Nobody likes the fourth-place energy.",
  ],
  neutral: [
    "Scout mode until the first real chance.",
    "I am only here for receipts.",
  ],
};

function pickSide(
  picks: EntryPicks | undefined,
  homeTeam: string,
  awayTeam: string,
): LockerRoomSide {
  const order = picks?.groups.A?.predictedOrder ?? [];
  const homeIndex = order.findIndex((team) => team === homeTeam);
  const awayIndex = order.findIndex((team) => team === awayTeam);

  if (homeIndex === -1 && awayIndex === -1) return "neutral";
  if (homeIndex === -1) return "away";
  if (awayIndex === -1) return "home";
  return homeIndex <= awayIndex ? "home" : "away";
}

function buildTake(side: LockerRoomSide, row: LeaderboardRow, index: number) {
  const options = SIDE_TAKES[side];
  const base = options[index % options.length];

  if (row.rank <= 3) return `${base} Rank ${row.rank} talking.`;
  if (row.score.total === 0) return `${base} No points, no fear.`;
  return base;
}

function buildLockerRoomParticipants(
  rows: LeaderboardRow[],
  picksByPath: Map<string, EntryPicks>,
): LockerRoomParticipant[] {
  return rows.map((row, index) => {
    const picks = row.picksPath ? picksByPath.get(row.picksPath) : undefined;
    const side = pickSide(
      picks,
      LOCKER_ROOM_MATCH.homeTeam,
      LOCKER_ROOM_MATCH.awayTeam,
    );
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
      take: buildTake(side, row, index),
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
  const participants = buildLockerRoomParticipants(rows, pool.picksByPath);

  return (
    <>
      <PublicPoolHeader poolSlug={poolSlug} active="locker-room" />
      <LockerRoom
        match={LOCKER_ROOM_MATCH}
        participants={participants}
        poolHref={`/pools/${poolSlug}`}
      />
    </>
  );
}

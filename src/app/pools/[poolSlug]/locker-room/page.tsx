import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";

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
import {
  getPublicPoolRouteInfo,
} from "@/lib/world-cup-pool/data";
import { normalizeName } from "@/lib/world-cup-pool/scoring";
import type { EntryPicks, LeaderboardRow } from "@/lib/world-cup-pool/types";
import { getPublicPoolSnapshot } from "@/lib/world-cup-pool/public-pool";

export const metadata: Metadata = {
  title: "Match room",
  description:
    "See the current match context and how pool entries are positioned around it.",
  robots: {
    index: false,
    follow: true,
  },
};

type LockerRoomPageProps = {
  params: Promise<{ poolSlug: string }>;
};

const POSITIONS: LockerRoomPosition[] = ["GK", "DEF", "MID", "FWD"];

export const unstable_instant = {
  prefetch: "runtime",
  samples: [{ params: { poolSlug: "marcins-2026-world-cup-pool" } }],
};

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

export default function LockerRoomPage({ params }: LockerRoomPageProps) {
  return (
    <Suspense fallback={<OnThePitchRouteFallback />}>
      {params.then(({ poolSlug }) => <LockerRoomPageContent poolSlug={poolSlug} />)}
    </Suspense>
  );
}

async function LockerRoomPageContent({ poolSlug }: { poolSlug: string }) {
  const routeInfo = await getPublicPoolRouteInfo(poolSlug);
  if (!routeInfo) notFound();

  return (
    <Suspense
      fallback={
        <OnThePitchLoadingScreen
          poolHref={`/pools/${routeInfo.poolSlug}`}
          poolName={routeInfo.poolName}
        />
      }
    >
      <WorldCupLockerRoom poolSlug={poolSlug} />
    </Suspense>
  );
}

async function WorldCupLockerRoom({ poolSlug }: { poolSlug: string }) {
  const pool = await getPublicPoolSnapshot(poolSlug);
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

function OnThePitchRouteFallback() {
  return <OnThePitchLoadingScreen poolHref="/pools" poolName="Public pool" />;
}

function OnThePitchLoadingScreen({
  poolHref,
  poolName,
}: {
  poolHref: string;
  poolName: string;
}) {
  return (
    <main className="fixed inset-x-0 bottom-0 top-16 isolate overflow-hidden bg-[#07140f] text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgb(36_110_61_/_0.78),transparent_46%),linear-gradient(90deg,rgb(255_255_255_/_0.06)_1px,transparent_1px),linear-gradient(rgb(255_255_255_/_0.06)_1px,transparent_1px)] bg-[size:auto,4rem_4rem,4rem_4rem]"
      />
      <header className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3 sm:p-5">
        <Link
          href={poolHref}
          aria-label="Back to pool"
          className="inline-flex size-10 items-center justify-center rounded-lg border border-white/12 bg-black/36 text-white shadow-2xl backdrop-blur-md"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="rounded-lg border border-white/12 bg-black/36 px-3 py-2 text-center shadow-2xl backdrop-blur-md">
          <p className="text-[0.68rem] font-semibold uppercase text-white/62">
            {poolName}
          </p>
          <h1 className="mt-1 font-heading text-base leading-none sm:text-lg">
            On the Pitch
          </h1>
        </div>
        <span aria-hidden="true" className="size-10" />
      </header>
      <div className="absolute inset-x-5 top-1/2 z-10 mx-auto max-w-sm -translate-y-1/2 rounded-xl border border-white/12 bg-[#06110d]/90 p-5 text-center shadow-2xl backdrop-blur-md">
        <p className="text-sm font-semibold">Preparing the live match</p>
        <p className="mt-2 text-sm leading-6 text-white/62">
          Loading the latest score, teams, and pool positions.
        </p>
      </div>
    </main>
  );
}

import { notFound } from "next/navigation";
import { Suspense } from "react";

import { LedgerPanel } from "@/components/app/ledger";
import {
  PublicPoolScoreRefresh,
  PublicPoolMetaCard,
  PublicPoolShell,
} from "@/components/app/public-pool-shell";
import { RoundOf16BracketPanel } from "@/components/app/round-of-16-public-panels";
import { getPublicRoundOf16Pool } from "@/lib/round-of-16/public";
import { getKnockoutPoolStageDetails } from "@/lib/templates/round-of-16-draft";
import { WorldCupBracket } from "@/components/app/world-cup-bracket";
import { buildBracketView } from "@/lib/world-cup-pool/bracket";
import { getReferencePicks } from "@/lib/world-cup-pool/current-match";
import {
  getPublicPoolRouteInfo,
  liveScoreMatchDates,
  scoreRefreshLabel,
  scoreRefreshSourceLabel,
} from "@/lib/world-cup-pool/data";
import { getPublicPoolSnapshot } from "@/lib/world-cup-pool/public-pool";

type BracketPageProps = {
  params: Promise<{ poolSlug: string }>;
};

export const unstable_instant = {
  prefetch: "runtime",
  samples: [{ params: { poolSlug: "marcins-2026-world-cup-pool" } }],
};

export default function BracketPage({ params }: BracketPageProps) {
  return (
    <Suspense fallback={<BracketRouteFallback />}>
      {params.then(({ poolSlug }) => <BracketPageContent poolSlug={poolSlug} />)}
    </Suspense>
  );
}

async function BracketPageContent({ poolSlug }: { poolSlug: string }) {
  const routeInfo = await getPublicPoolRouteInfo(poolSlug);

  if (routeInfo) {
    return (
      <PublicPoolShell
        poolName={routeInfo.poolName}
        eyebrow="Knockout bracket"
        title="Path to the final"
        description="Every knockout match is arranged through the final, with live winners and scores filled in as results land."
        meta={
          <Suspense fallback={null}>
            <BracketMetaStream poolSlug={poolSlug} />
          </Suspense>
        }
      >
        <Suspense fallback={<BracketDetailsFallback />}>
          <WorldCupBracketDetails poolSlug={poolSlug} />
        </Suspense>
      </PublicPoolShell>
    );
  }

  return <RoundOf16BracketPage poolSlug={poolSlug} />;
}

async function RoundOf16BracketPage({ poolSlug }: { poolSlug: string }) {
  const roundOf16Pool = await getPublicRoundOf16Pool(poolSlug, {
    includeViewer: false,
  });

  if (roundOf16Pool) {
    const stage = getKnockoutPoolStageDetails(roundOf16Pool.settings);
    return (
      <PublicPoolShell
        poolName={roundOf16Pool.poolName}
        eyebrow={`${stage.label} bracket`}
        title="Matchup board"
        description={`Each configured ${stage.label.toLowerCase()} matchup with winners shown after automatic scoring.`}
      >
        <RoundOf16BracketPanel
          settings={roundOf16Pool.settings}
          standings={roundOf16Pool.latestStandings}
        />
      </PublicPoolShell>
    );
  }

  notFound();
}

async function BracketMetaStream({ poolSlug }: { poolSlug: string }) {
  const pool = await getPublicPoolSnapshot(poolSlug);
  if (!pool) return null;

  const referencePicks = getReferencePicks(pool.picksByPath);
  const bracket = buildBracketView(pool.results, referencePicks);
  if (!bracket) return null;

  return <PublicPoolMetaCard label="Source" value={bracket.sourceLabel} />;
}

async function WorldCupBracketDetails({ poolSlug }: { poolSlug: string }) {
  const pool = await getPublicPoolSnapshot(poolSlug);
  if (!pool) notFound();

  const referencePicks = getReferencePicks(pool.picksByPath);
  const bracket = buildBracketView(pool.results, referencePicks);
  if (!bracket) notFound();

  return (
    <>
      <LedgerPanel
        title="Tournament bracket"
        description="Scroll horizontally to follow each side of the draw into the championship match."
      >
        <WorldCupBracket
          rounds={bracket.rounds}
          thirdPlace={bracket.thirdPlace}
          picks={referencePicks}
        />
      </LedgerPanel>
      <PublicPoolScoreRefresh
        liveScoreMatchDates={liveScoreMatchDates(pool)}
        scoreRefreshLabel={scoreRefreshLabel(pool)}
        scoreRefreshSource={scoreRefreshSourceLabel(pool)}
      />
    </>
  );
}

function BracketRouteFallback() {
  return (
    <LedgerPanel title="Loading bracket" description="Preparing the tournament path.">
      <div className="grid gap-3 p-5">
        <div className="h-20 animate-pulse rounded-md bg-muted/80" />
        <div className="h-72 animate-pulse rounded-md bg-muted/80" />
      </div>
    </LedgerPanel>
  );
}

function BracketDetailsFallback() {
  return (
    <LedgerPanel
      title="Loading tournament bracket"
      description="Placing the latest results on the knockout path."
    >
      <div className="grid gap-3 p-5">
        <div className="h-64 animate-pulse rounded-md bg-muted/80" />
      </div>
    </LedgerPanel>
  );
}

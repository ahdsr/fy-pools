import { notFound } from "next/navigation";

import { LedgerPanel } from "@/components/app/ledger";
import {
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
  getPublicPool,
  liveScoreMatchDates,
  scoreRefreshLabel,
  scoreRefreshSourceLabel,
} from "@/lib/world-cup-pool/data";

type BracketPageProps = {
  params: Promise<{ poolSlug: string }>;
};

export default async function BracketPage({ params }: BracketPageProps) {
  const { poolSlug } = await params;
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

  const pool = await getPublicPool(poolSlug);
  if (!pool) notFound();

  const referencePicks = getReferencePicks(pool.picksByPath);
  const bracket = buildBracketView(pool.results, referencePicks);
  if (!bracket) notFound();

  return (
    <PublicPoolShell
      poolName={pool.entriesConfig.poolName}
      eyebrow="Knockout bracket"
      title="Path to the final"
      description="Every knockout match is arranged through the final, with live winners and scores filled in as results land."
      scoreRefreshLabel={scoreRefreshLabel(pool)}
      scoreRefreshSource={scoreRefreshSourceLabel(pool)}
      liveScoreMatchDates={liveScoreMatchDates(pool)}
      meta={
        <PublicPoolMetaCard label="Source" value={bracket.sourceLabel} />
      }
    >
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
    </PublicPoolShell>
  );
}

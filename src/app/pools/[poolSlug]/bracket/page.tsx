import { notFound } from "next/navigation";

import { LedgerPanel } from "@/components/app/ledger";
import {
  PublicPoolMetaCard,
  PublicPoolShell,
} from "@/components/app/public-pool-shell";
import { WorldCupBracket } from "@/components/app/world-cup-bracket";
import { buildBracketView } from "@/lib/world-cup-pool/bracket";
import { getReferencePicks } from "@/lib/world-cup-pool/current-match";
import { formatDateTime, getPublicPool } from "@/lib/world-cup-pool/data";

type BracketPageProps = {
  params: Promise<{ poolSlug: string }>;
};

export default async function BracketPage({ params }: BracketPageProps) {
  const { poolSlug } = await params;
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
      description="Every knockout match is arranged from the Round of 32 through the final, with live winners and scores filled in as results land."
      meta={
        <>
          <PublicPoolMetaCard
            label="Updated"
            value={formatDateTime(pool.results.meta?.lastUpdated)}
          />
          <PublicPoolMetaCard label="Source" value={bracket.sourceLabel} />
        </>
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

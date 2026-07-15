import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { PublicPoolMetaCard, PublicPoolShell } from "@/components/app/public-pool-shell";
import { formatDateTime } from "@/lib/date-time";
import { getPublicRoundOf16Pool } from "@/lib/round-of-16/public";
import {
  getEnabledRoundOf16BonusProps,
  getKnockoutPoolStageDetails,
} from "@/lib/templates/round-of-16-draft";
import { getReferencePicks } from "@/lib/world-cup-pool/current-match";
import { getPublicPoolRouteInfo } from "@/lib/world-cup-pool/data";
import { getPublicPoolSnapshot } from "@/lib/world-cup-pool/public-pool";
import type { ScoringRules } from "@/lib/world-cup-pool/types";

export const metadata: Metadata = {
  title: "Pool rules and scoring",
  description:
    "Read the pick rules, scoring system, lock time, and standings details for this pool.",
};

type RulesPageProps = {
  params: Promise<{ poolSlug: string }>;
};

function ScoringRow({ label, points }: { label: string; points: number }) {
  return (
    <LedgerRow className="flex items-center justify-between gap-4">
      <p className="text-sm font-normal leading-6 text-muted-foreground">
        {label}
      </p>
      <p className="shrink-0 font-semibold text-brand-ink">
        {points} {points === 1 ? "point" : "points"}
      </p>
    </LedgerRow>
  );
}

function RoundOf16Rules({
  pool,
}: {
  pool: NonNullable<Awaited<ReturnType<typeof getPublicRoundOf16Pool>>>;
}) {
  const stage = getKnockoutPoolStageDetails(pool.settings);
  const bonusProps = getEnabledRoundOf16BonusProps(pool.settings);
  const pickLock = formatDateTime(pool.settings.basics.picksLockAt);

  return (
    <PublicPoolShell
      poolName={pool.poolName}
      eyebrow="Pool rules"
      title="How this pool works"
      description={`Everything you need to know before making ${stage.pluralLabel.toLowerCase()} picks.`}
      meta={<PublicPoolMetaCard label="Pick lock" value={pickLock} />}
    >
      <LedgerPanel
        title="Scoring"
        description={`Earn points for each correct ${stage.label.toLowerCase()} winner and every configured bonus prop.`}
      >
        <LedgerRows>
          <ScoringRow
            label={`Correct ${stage.label.toLowerCase()} winner`}
            points={pool.settings.scoring.winnerPoints}
          />
          {bonusProps.map((prop) => (
            <ScoringRow key={prop.id} label={prop.label} points={prop.points} />
          ))}
        </LedgerRows>
      </LedgerPanel>

      <section className="grid gap-5 lg:grid-cols-2">
        <LedgerPanel title="Submitting picks">
          <LedgerRows>
            <LedgerRow>
              <p className="font-semibold text-brand-ink">One entry per account</p>
              <p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">
                Sign in before submitting. You can update a submitted entry until
                the pick lock at {pickLock}.
              </p>
            </LedgerRow>
            <LedgerRow>
              <p className="font-semibold text-brand-ink">Pick every matchup</p>
              <p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">
                Choose one winner for each matchup and answer every enabled bonus
                prop before submitting.
              </p>
            </LedgerRow>
          </LedgerRows>
        </LedgerPanel>

        <LedgerPanel title="Standings and visibility">
          <LedgerRows>
            <LedgerRow>
              <p className="font-semibold text-brand-ink">Results drive scores</p>
              <p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">
                Standings update after pool results are recorded. Correct picks add
                to your total automatically.
              </p>
            </LedgerRow>
            <LedgerRow>
              <p className="font-semibold text-brand-ink">Entries unlock after lock</p>
              <p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">
                Entrants are listed immediately; submitted pick details become
                visible once the pool is locked.
              </p>
            </LedgerRow>
          </LedgerRows>
        </LedgerPanel>
      </section>
    </PublicPoolShell>
  );
}

function WorldCupRules({
  poolSlug,
  poolName,
}: {
  poolSlug: string;
  poolName: string;
}) {
  return <WorldCupRulesContent poolSlug={poolSlug} poolName={poolName} />;
}

async function WorldCupRulesContent({
  poolSlug,
  poolName,
}: {
  poolSlug: string;
  poolName: string;
}) {
  const pool = await getPublicPoolSnapshot(poolSlug);
  if (!pool) notFound();

  const referencePicks = getReferencePicks(pool.picksByPath);
  if (!referencePicks) notFound();

  const rules = referencePicks.scoringRules;

  return (
    <PublicPoolShell
      poolName={poolName}
      eyebrow="Pool rules"
      title="How this pool is scored"
      description="Use this guide to understand which picks earn points and how the live leaderboard updates."
    >
      <LedgerPanel
        title="Scoring"
        description="Each entry uses the same scoring sheet. Points are awarded when a submitted pick matches the recorded outcome."
      >
        <LedgerRows>
          <WorldCupScoringRows rules={rules} />
        </LedgerRows>
      </LedgerPanel>

      <section className="grid gap-5 lg:grid-cols-2">
        <LedgerPanel title="Reading the leaderboard">
          <LedgerRows>
            <LedgerRow>
              <p className="font-semibold text-brand-ink">Scores can move live</p>
              <p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">
                Current standings reflect the results recorded so far. They can
                change while matches and tournament positions remain unresolved.
              </p>
            </LedgerRow>
            <LedgerRow>
              <p className="font-semibold text-brand-ink">All entries use the same outcomes</p>
              <p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">
                The leaderboard compares every submitted sheet against the same
                pool results, so each score is auditable from the entry detail.
              </p>
            </LedgerRow>
          </LedgerRows>
        </LedgerPanel>

        <LedgerPanel title="Need more detail?">
          <LedgerRows>
            <LedgerRow>
              <p className="font-semibold text-brand-ink">Open any entry</p>
              <p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">
                Entry pages show the score breakdown for every group, knockout,
                finals, and bonus pick.
              </p>
            </LedgerRow>
            <LedgerRow>
              <p className="font-semibold text-brand-ink">Follow the bracket</p>
              <p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">
                The Bracket tab shows the currently recorded knockout path and
                the results used to score those picks.
              </p>
            </LedgerRow>
          </LedgerRows>
        </LedgerPanel>
      </section>
    </PublicPoolShell>
  );
}

function WorldCupScoringRows({ rules }: { rules: ScoringRules }) {
  const rows = [
    ["Correct group advancement", rules.groupAdvancement],
    ["Exact group top two", rules.exactTopTwoBonus],
    ["Exact group top four", rules.exactTopFourBonus],
    ["Correct Round of 16 pick", rules.roundOf16],
    ["Correct quarter-finalist", rules.quarterFinalists],
    ["Correct semi-finalist", rules.semifinalists],
    ["Correct third-place match team", rules.thirdPlaceMatch],
    ["Correct finalist", rules.finalists],
    ["Correct third place", rules.thirdPlace],
    ["Correct runner-up", rules.runnerUp],
    ["Correct champion", rules.champion],
    ["Correct bonus pick", rules.bonus],
  ] as const;

  return rows.map(([label, points]) => (
    <ScoringRow key={label} label={label} points={points} />
  ));
}

export default async function RulesPage({ params }: RulesPageProps) {
  const { poolSlug } = await params;
  const routeInfo = await getPublicPoolRouteInfo(poolSlug);

  if (routeInfo) {
    return <WorldCupRules poolSlug={poolSlug} poolName={routeInfo.poolName} />;
  }

  const roundOf16Pool = await getPublicRoundOf16Pool(poolSlug, {
    includeViewer: false,
  });
  if (!roundOf16Pool) notFound();

  return <RoundOf16Rules pool={roundOf16Pool} />;
}

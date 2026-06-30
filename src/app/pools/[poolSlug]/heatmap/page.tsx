import { notFound } from "next/navigation";

import { LedgerPanel } from "@/components/app/ledger";
import { TeamPill } from "@/components/app/pool-public-widgets";
import {
  PublicPoolMetaCard,
  PublicPoolShell,
} from "@/components/app/public-pool-shell";
import { SectionHeader } from "@/components/app/section-header";
import { Badge } from "@/components/ui/badge";
import { getReferencePicks } from "@/lib/world-cup-pool/current-match";
import { formatDateTime, getPublicPool } from "@/lib/world-cup-pool/data";
import {
  buildPoolHeatmap,
  type BonusHeatmapSummary,
  type ContrarianPick,
  type EntrantSimilarityRow,
  type GroupConsensusSummary,
  type GroupHeatmapSummary,
  type HeatmapCell,
  type KnockoutFlowStage,
  type PickSummaryRow,
  type PlayerTeamHeatmapCell,
  type PodiumSummary,
} from "@/lib/world-cup-pool/heatmap";
import type { EntryPicks } from "@/lib/world-cup-pool/types";

type HeatmapPageProps = {
  params: Promise<{ poolSlug: string }>;
};

const PIE_COLORS = [
  "var(--brand-hot)",
  "var(--brand-lime)",
  "var(--brand-coral)",
  "var(--brand-sky)",
  "var(--brand-success)",
  "var(--brand-warning)",
  "var(--primary)",
  "var(--muted-foreground)",
] as const;

function heatCellStyle(cell: HeatmapCell): React.CSSProperties | undefined {
  if (cell.count === 0) return undefined;

  const mix = Math.min(42, Math.max(8, Math.round(cell.percent * 0.38)));

  return {
    backgroundColor: `color-mix(in oklch, var(--cta-green-soft), var(--brand-hot) ${mix}%)`,
  };
}

function EntrantNames({ cell }: { cell: HeatmapCell }) {
  if (cell.count === 0) {
    return <span className="text-muted-foreground/60">None</span>;
  }

  return (
    <span className="text-xs leading-4 text-muted-foreground">
      {cell.entrants.map((entrant) => entrant.name).join(", ")}
    </span>
  );
}

function FlowNode({
  row,
  referencePicks,
}: {
  row: PickSummaryRow;
  referencePicks?: EntryPicks;
}) {
  return (
    <div
      className="rounded-lg border border-border/75 px-3 py-2 shadow-sm"
      style={heatCellStyle(row.cell)}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <CompactTeamName team={row.team} referencePicks={referencePicks} />
        <span className="shrink-0 text-xs font-semibold text-brand-ink">
          {row.cell.count}
        </span>
      </div>
      <p className="mt-1 text-[0.65rem] leading-4 text-muted-foreground">
        {row.cell.percent}% of entries
      </p>
    </div>
  );
}

function KnockoutFlowPanel({
  stages,
  referencePicks,
}: {
  stages: KnockoutFlowStage[];
  referencePicks?: EntryPicks;
}) {
  return (
    <LedgerPanel
      title="Knockout flow"
      description="Top consensus teams at each advancement stage. Wider agreement shows up as darker nodes."
    >
      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-7">
        {stages.map((stage, index) => (
          <div key={stage.key} className="relative grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase text-brand-ink">
                {stage.label}
              </h3>
              {index < stages.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="hidden h-px flex-1 bg-border xl:block"
                />
              ) : null}
            </div>
            <div className="grid gap-2">
              {stage.rows.map((row) => (
                <FlowNode
                  key={`${stage.key}-${row.team}`}
                  row={row}
                  referencePicks={referencePicks}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </LedgerPanel>
  );
}

function pieBackground(rows: PickSummaryRow[]) {
  const pickedTotal = rows.reduce((sum, row) => sum + row.cell.count, 0);
  if (pickedTotal === 0) return "var(--muted)";

  let cursor = 0;
  const segments = rows.map((row, index) => {
    const start = cursor;
    const size = (row.cell.count / pickedTotal) * 100;
    cursor += size;
    return `${PIE_COLORS[index % PIE_COLORS.length]} ${start}% ${cursor}%`;
  });

  return `conic-gradient(${segments.join(", ")})`;
}

function PodiumPieChart({
  summary,
  referencePicks,
}: {
  summary: PodiumSummary;
  referencePicks?: EntryPicks;
}) {
  const leader = summary.rows[0];

  return (
    <LedgerPanel title={summary.position}>
      <div className="grid gap-4 px-5 py-5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center">
        <div className="grid justify-center gap-3">
          <div
            aria-label={`${summary.position} pick distribution`}
            className="size-32 rounded-full border border-border shadow-inner ring-1 ring-foreground/10"
            role="img"
            style={{ background: pieBackground(summary.rows) }}
          />
          {leader ? (
            <p className="text-center text-xs leading-4 text-muted-foreground">
              Leader:{" "}
              <span className="font-semibold text-brand-ink">
                {leader.team}
              </span>
            </p>
          ) : null}
        </div>
        <div className="min-w-0 divide-y rounded-lg border bg-background/55">
          {summary.rows.map((row, index) => (
            <div key={row.team} className="grid gap-1 px-3 py-2">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                    }}
                  />
                  <TeamName team={row.team} referencePicks={referencePicks} />
                </span>
                <span className="shrink-0 text-xs font-semibold text-brand-ink">
                  {row.cell.count} / {row.cell.percent}%
                </span>
              </div>
              <EntrantNames cell={row.cell} />
            </div>
          ))}
        </div>
      </div>
    </LedgerPanel>
  );
}

function playerCellStyle(
  cell: PlayerTeamHeatmapCell,
): React.CSSProperties | undefined {
  if (!cell.stage) return undefined;

  const mix = Math.min(52, Math.max(10, cell.weight * 7));

  return {
    backgroundColor: `color-mix(in oklch, var(--cta-green-soft), var(--brand-hot) ${mix}%)`,
  };
}

function PlayerTeamCell({ cell }: { cell?: PlayerTeamHeatmapCell }) {
  if (!cell?.stage) {
    return (
      <span className="grid h-5 min-w-0 place-items-center overflow-hidden rounded-[3px] border border-transparent text-[0.5rem] text-muted-foreground/35 sm:h-6 sm:text-[0.55rem]">
        -
      </span>
    );
  }

  return (
    <span
      className="grid h-5 min-w-0 place-items-center overflow-hidden rounded-[3px] border border-brand-hot/10 px-0.5 text-[0.5rem] font-semibold leading-none text-brand-ink sm:h-6 sm:text-[0.55rem]"
      style={playerCellStyle(cell)}
      title={cell.label}
    >
      {cell.label}
    </span>
  );
}

function entrantInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function TeamName({
  team,
  referencePicks,
}: {
  team: string;
  referencePicks?: EntryPicks;
}) {
  return <TeamPill team={team} picks={referencePicks} />;
}

function CompactTeamName({
  team,
  referencePicks,
}: {
  team: string;
  referencePicks?: EntryPicks;
}) {
  return (
    <TeamPill
      team={team}
      picks={referencePicks}
      className="text-[0.7rem] leading-tight sm:text-xs"
    />
  );
}

function PlayerTeamHeatmapTable({
  heatmap,
  referencePicks,
}: {
  heatmap: ReturnType<typeof buildPoolHeatmap>;
  referencePicks?: EntryPicks;
}) {
  const matrixColumns = {
    gridTemplateColumns: `minmax(5.5rem,1.55fr) minmax(1.75rem,0.45fr) repeat(${heatmap.entrants.length}, minmax(0,1fr))`,
  };

  return (
    <div className="w-full text-xs">
      <div
        className="grid items-end gap-px border-b bg-surface-ledger px-2 py-2"
        style={matrixColumns}
      >
        <div className="font-semibold text-brand-ink">Team</div>
        <div className="text-center text-[0.6rem] font-semibold uppercase text-muted-foreground">
          Picked
        </div>
        {heatmap.entrants.map((entrant) => (
          <div
            key={entrant.id}
            className="min-w-0 text-center text-[0.55rem] font-semibold uppercase leading-none text-muted-foreground"
            title={entrant.name}
          >
            {entrantInitials(entrant.name)}
          </div>
        ))}
      </div>
      <div className="divide-y">
        {heatmap.playerTeamRows.map((row) => (
          <div
            key={row.team}
            className="grid items-center gap-px px-2 py-1.5"
            style={matrixColumns}
          >
            <div className="min-w-0 font-semibold text-brand-ink">
              <CompactTeamName team={row.team} referencePicks={referencePicks} />
            </div>
            <div
              className="text-center text-[0.6rem] font-semibold text-muted-foreground"
              title={`${row.picked.count} entrants, ${row.picked.percent}%`}
            >
              {row.picked.count}
            </div>
            {heatmap.entrants.map((entrant) => (
              <PlayerTeamCell
                key={entrant.id}
                cell={row.players[entrant.id]}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="border-t px-2 py-2 text-[0.68rem] leading-4 text-muted-foreground">
        Player initials use full names on hover. Picked is the number of entrants
        who selected the team anywhere in the knockout or podium path.
      </div>
    </div>
  );
}

function PodiumConsensus({
  summaries,
  referencePicks,
}: {
  summaries: PodiumSummary[];
  referencePicks?: EntryPicks;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {summaries.map((summary) => (
        <PodiumPieChart
          key={summary.position}
          summary={summary}
          referencePicks={referencePicks}
        />
      ))}
    </div>
  );
}

function ContrarianPicksPanel({
  picks,
  referencePicks,
}: {
  picks: ContrarianPick[];
  referencePicks?: EntryPicks;
}) {
  if (!picks.length) return null;

  return (
    <LedgerPanel
      title="Contrarian picks"
      description="Rare knockout and podium calls that could swing the pool."
    >
      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
        {picks.map((pick) => (
          <div
            key={`${pick.stageKey}-${pick.team}-${pick.cell.entrants.map((entrant) => entrant.id).join("-")}`}
            className="grid gap-3 rounded-lg border bg-background/60 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <TeamName team={pick.team} referencePicks={referencePicks} />
              <Badge variant="secondary">{pick.stageLabel}</Badge>
            </div>
            <div>
              <p className="text-2xl font-bold text-brand-ink">
                {pick.cell.count}
                <span className="ml-1 text-sm font-semibold text-muted-foreground">
                  picked it
                </span>
              </p>
              <EntrantNames cell={pick.cell} />
            </div>
          </div>
        ))}
      </div>
    </LedgerPanel>
  );
}

function GroupConsensusPanel({
  summary,
  referencePicks,
}: {
  summary: GroupConsensusSummary;
  referencePicks?: EntryPicks;
}) {
  return (
    <LedgerPanel
      title={`Group ${summary.groupId}`}
      action={<Badge variant="outline">{summary.agreementLabel}</Badge>}
    >
      <div className="grid gap-2 p-4">
        {summary.positions.map((position) => (
          <div
            key={position.position}
            className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border bg-background/60 px-3 py-2"
          >
            <span className="grid size-9 place-items-center rounded-full bg-muted text-xs font-bold text-brand-ink">
              {position.position}
            </span>
            {position.team ? (
              <TeamName team={position.team} referencePicks={referencePicks} />
            ) : (
              <span className="text-sm text-muted-foreground">No pick</span>
            )}
            <span className="text-xs font-semibold text-muted-foreground">
              {position.cell?.percent ?? 0}%
            </span>
          </div>
        ))}
      </div>
    </LedgerPanel>
  );
}

function GroupDetailPanel({
  summary,
  referencePicks,
}: {
  summary: GroupHeatmapSummary;
  referencePicks?: EntryPicks;
}) {
  return (
    <LedgerPanel title={`Group ${summary.groupId} details`}>
      <div className="grid gap-3 p-4">
        {summary.rows.map((row) => (
          <div key={row.team} className="grid gap-2 rounded-lg border p-3">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <TeamName team={row.team} referencePicks={referencePicks} />
              <span className="text-xs font-semibold text-muted-foreground">
                {row.advancer.count} advancer picks
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {row.positions.map((cell, index) => (
                <div
                  key={index}
                  className="rounded-md border bg-background/60 px-2 py-1 text-center"
                  style={heatCellStyle(cell)}
                >
                  <p className="text-[0.6rem] font-semibold uppercase text-muted-foreground">
                    {index + 1}
                  </p>
                  <p className="text-xs font-bold text-brand-ink">
                    {cell.count}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </LedgerPanel>
  );
}

function BubbleSummaryPanel({
  title,
  description,
  rows,
  referencePicks,
}: {
  title: string;
  description?: string;
  rows: PickSummaryRow[];
  referencePicks?: EntryPicks;
}) {
  return (
    <LedgerPanel title={title} description={description}>
      <div className="flex flex-wrap items-center gap-3 p-5">
        {rows.map((row) => {
          const size = Math.max(5.5, Math.min(9.5, 4.5 + row.cell.percent / 12));

          return (
            <div
              key={row.team}
              className="grid place-items-center rounded-full border bg-background/70 p-3 text-center shadow-sm"
              style={{
                minHeight: `${size}rem`,
                minWidth: `${size}rem`,
              }}
              title={row.cell.entrants.map((entrant) => entrant.name).join(", ")}
            >
              <TeamName team={row.team} referencePicks={referencePicks} />
              <span className="mt-1 text-xs font-semibold text-muted-foreground">
                {row.cell.count} / {row.cell.percent}%
              </span>
            </div>
          );
        })}
      </div>
    </LedgerPanel>
  );
}

function BonusSummaryPanel({
  summary,
}: {
  summary: BonusHeatmapSummary;
}) {
  return (
    <LedgerPanel title={summary.label}>
      <div className="flex flex-wrap gap-2 p-5">
        {summary.rows.map((row) => (
          <div
            key={row.team}
            className="rounded-full border bg-background/70 px-3 py-2"
            style={{
              fontSize: `${Math.max(0.75, Math.min(1.25, 0.72 + row.cell.percent / 90))}rem`,
            }}
            title={row.cell.entrants.map((entrant) => entrant.name).join(", ")}
          >
            <span className="font-semibold text-brand-ink">{row.team}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              {row.cell.count}
            </span>
          </div>
        ))}
      </div>
    </LedgerPanel>
  );
}

function EntrantSimilarityPanel({ rows }: { rows: EntrantSimilarityRow[] }) {
  if (!rows.length) return null;

  return (
    <LedgerPanel
      title="Pick similarity"
      description="Entrants with the most overlapping picks across groups, knockout picks, podium, third-place qualifiers, and bonuses."
    >
      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-5">
        {rows.map((row) => (
          <div
            key={`${row.entrants[0].id}-${row.entrants[1].id}`}
            className="grid gap-3 rounded-lg border bg-background/60 p-4"
          >
            <div className="flex items-center justify-center">
              <span className="grid size-12 place-items-center rounded-full bg-brand-hot/15 text-xs font-bold text-brand-ink ring-2 ring-surface-paper">
                {entrantInitials(row.entrants[0].name)}
              </span>
              <span className="-ml-3 grid size-12 place-items-center rounded-full bg-cta-green-soft text-xs font-bold text-brand-ink ring-2 ring-surface-paper">
                {entrantInitials(row.entrants[1].name)}
              </span>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold leading-5 text-brand-ink">
                {row.entrants[0].name}
              </p>
              <p className="text-sm font-semibold leading-5 text-brand-ink">
                {row.entrants[1].name}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {row.percent}% overlap ({row.sharedPickCount}/{row.totalPickCount})
              </p>
            </div>
          </div>
        ))}
      </div>
    </LedgerPanel>
  );
}

export default async function HeatmapPage({ params }: HeatmapPageProps) {
  const { poolSlug } = await params;
  const pool = await getPublicPool(poolSlug);
  if (!pool) notFound();

  const heatmap = buildPoolHeatmap(pool.entriesConfig, pool.picksByPath);
  const referencePicks = getReferencePicks(pool.picksByPath);
  const scoreRefreshLabel = formatDateTime(pool.results.meta?.lastUpdated);

  return (
    <PublicPoolShell
      poolName={pool.entriesConfig.poolName}
      eyebrow="Heatmap"
      title="Pick heatmap"
      description="Consensus, contrarian picks, group predictions, and entrant overlap across the pool."
      scoreRefreshLabel={scoreRefreshLabel}
      meta={
        <PublicPoolMetaCard
          label="Entries mapped"
          value={`${heatmap.eligibleEntryCount}/${pool.entriesConfig.entries.length}`}
        />
      }
    >
      <KnockoutFlowPanel
        stages={heatmap.knockoutFlowStages}
        referencePicks={referencePicks}
      />

      <LedgerPanel
        title="Player/team matrix"
        description="Teams are rows and entrants are columns. Each cell shows the deepest stage that entrant picked for that team."
      >
        <div className="border-b px-5 py-3 text-xs leading-5 text-muted-foreground">
          Legend: R16, QF, SF, Final, C, RU, 3rd. Darker cells are deeper picks.
        </div>
        <PlayerTeamHeatmapTable
          heatmap={heatmap}
          referencePicks={referencePicks}
        />
      </LedgerPanel>

      <PodiumConsensus
        summaries={heatmap.podiumSummaries}
        referencePicks={referencePicks}
      />

      <ContrarianPicksPanel
        picks={heatmap.contrarianPicks}
        referencePicks={referencePicks}
      />

      <EntrantSimilarityPanel rows={heatmap.entrantSimilarityRows} />

      <BubbleSummaryPanel
        title="Third-place qualifier bubbles"
        description="Larger bubbles mean more entrants selected that third-place team to advance."
        rows={heatmap.thirdPlaceQualifierRows}
        referencePicks={referencePicks}
      />

      <section className="grid gap-5">
        <SectionHeader
          title="Group consensus"
          description="Consensus standings for each group, followed by compact position details."
        />
        <div className="grid gap-5 xl:grid-cols-2">
          {heatmap.groupConsensusSummaries.map((summary) => (
            <GroupConsensusPanel
              key={summary.groupId}
              summary={summary}
              referencePicks={referencePicks}
            />
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          {heatmap.groupSummaries.map((summary) => (
            <GroupDetailPanel
              key={summary.groupId}
              summary={summary}
              referencePicks={referencePicks}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        {heatmap.bonusSummaries.map((summary) => (
          <BonusSummaryPanel
            key={summary.id}
            summary={summary}
          />
        ))}
      </section>
    </PublicPoolShell>
  );
}

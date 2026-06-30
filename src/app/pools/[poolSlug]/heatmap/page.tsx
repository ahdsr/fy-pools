import { notFound } from "next/navigation";

import { LedgerPanel } from "@/components/app/ledger";
import { TeamPill } from "@/components/app/pool-public-widgets";
import {
  PublicPoolMetaCard,
  PublicPoolShell,
} from "@/components/app/public-pool-shell";
import { SectionHeader } from "@/components/app/section-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getReferencePicks } from "@/lib/world-cup-pool/current-match";
import { formatDateTime, getPublicPool } from "@/lib/world-cup-pool/data";
import {
  buildPoolHeatmap,
  type BonusHeatmapSummary,
  type GroupHeatmapSummary,
  type HeatmapCell,
  type PickSummaryRow,
  type PlayerTeamHeatmapCell,
  type PodiumSummary,
} from "@/lib/world-cup-pool/heatmap";
import type { EntryPicks } from "@/lib/world-cup-pool/types";

type HeatmapPageProps = {
  params: Promise<{ poolSlug: string }>;
};

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

function HeatmapValue({ cell }: { cell: HeatmapCell }) {
  if (cell.count === 0) {
    return <span className="text-muted-foreground/55">-</span>;
  }

  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="font-semibold text-brand-ink">{cell.count}</span>
      <span className="text-xs text-muted-foreground">{cell.percent}%</span>
    </span>
  );
}

function HeatmapCellBlock({ cell }: { cell: HeatmapCell }) {
  return (
    <div
      className="min-w-28 rounded-md border border-transparent px-2 py-2"
      style={heatCellStyle(cell)}
    >
      <div className="flex items-center gap-2">
        <HeatmapValue cell={cell} />
        {cell.count > 0 && cell.count <= 2 ? (
          <Badge variant="outline" className="h-5 px-1.5 text-[0.65rem]">
            Contrarian
          </Badge>
        ) : null}
      </div>
      <div className="mt-1">
        <EntrantNames cell={cell} />
      </div>
    </div>
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

function SummaryRows({
  rows,
  referencePicks,
}: {
  rows: PickSummaryRow[];
  referencePicks?: EntryPicks;
}) {
  return (
    <div className="divide-y">
      {rows.map((row) => (
        <div
          key={row.team}
          className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:items-start"
        >
          <TeamName team={row.team} referencePicks={referencePicks} />
          <HeatmapCellBlock cell={row.cell} />
        </div>
      ))}
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
        <LedgerPanel key={summary.position} title={summary.position}>
          <SummaryRows rows={summary.rows} referencePicks={referencePicks} />
        </LedgerPanel>
      ))}
    </div>
  );
}

function GroupSummaryPanel({
  summary,
  referencePicks,
}: {
  summary: GroupHeatmapSummary;
  referencePicks?: EntryPicks;
}) {
  return (
    <LedgerPanel title={`Group ${summary.groupId}`}>
      <Table>
        <TableHeader>
          <TableRow className="bg-surface-ledger hover:bg-surface-ledger">
            <TableHead>Team</TableHead>
            <TableHead>Advance</TableHead>
            <TableHead>1st</TableHead>
            <TableHead>2nd</TableHead>
            <TableHead>3rd</TableHead>
            <TableHead>4th</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {summary.rows.map((row) => (
            <TableRow key={row.team}>
              <TableCell className="font-semibold text-brand-ink">
                <TeamName team={row.team} referencePicks={referencePicks} />
              </TableCell>
              <TableCell>
                <HeatmapCellBlock cell={row.advancer} />
              </TableCell>
              {row.positions.map((cell, index) => (
                <TableCell key={index}>
                  <HeatmapCellBlock cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </LedgerPanel>
  );
}

function BonusSummaryPanel({
  summary,
  referencePicks,
}: {
  summary: BonusHeatmapSummary;
  referencePicks?: EntryPicks;
}) {
  return (
    <LedgerPanel title={summary.label}>
      <SummaryRows rows={summary.rows} referencePicks={referencePicks} />
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
      description="A static consensus map showing which teams entrants backed across knockout stages, podium picks, groups, third-place qualifiers, and bonus questions."
      scoreRefreshLabel={scoreRefreshLabel}
      meta={
        <PublicPoolMetaCard
          label="Entries mapped"
          value={`${heatmap.eligibleEntryCount}/${pool.entriesConfig.entries.length}`}
        />
      }
    >
      <LedgerPanel
        title="Knockout pick heatmap"
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

      <LedgerPanel
        title="Third-place qualifiers"
        description="Entrants who selected each third-place group qualifier."
      >
        <SummaryRows
          rows={heatmap.thirdPlaceQualifierRows}
          referencePicks={referencePicks}
        />
      </LedgerPanel>

      <section className="grid gap-5">
        <SectionHeader
          title="Group picks"
          description="Predicted advancers and exact group-position choices by team."
        />
        <div className="grid gap-5 xl:grid-cols-2">
          {heatmap.groupSummaries.map((summary) => (
            <GroupSummaryPanel
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
            referencePicks={referencePicks}
          />
        ))}
      </section>
    </PublicPoolShell>
  );
}

import Link from "next/link";
import {
  ArrowRight,
  Brackets,
  CheckCircle2,
  FileSpreadsheet,
  Trophy,
  Users,
} from "lucide-react";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { PageShell } from "@/components/app/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const conversionSteps = [
  {
    title: "Upload the spreadsheet you already use",
    body: "Bring the workbook, tabs, formulas, pool rules, seed lists, and scoring notes that already run your group.",
  },
  {
    title: "Map it into a hosted pool",
    body: "FY Pools turns the structure into entry forms, legal pick options, locks, brackets, bonus questions, and scoring rules.",
  },
  {
    title: "Invite players and publish standings",
    body: "Players submit clean picks online while commissioners manage entries, review brackets, and share trusted leaderboard updates.",
  },
];

const importIncludes = [
  {
    icon: FileSpreadsheet,
    title: "Excel logic",
    body: "Rules, tabs, formulas, point values, tiebreakers, and custom pool formats.",
  },
  {
    icon: Users,
    title: "User picks",
    body: "Entry forms, pick validation, lock timing, missing-entry tracking, and player links.",
  },
  {
    icon: Brackets,
    title: "Brackets",
    body: "Tournament paths, series winners, round-by-round choices, and future matchup handling.",
  },
  {
    icon: Trophy,
    title: "Standings",
    body: "Scoring updates, audit-friendly results, leaderboard views, and commissioner controls.",
  },
];

export default function UploadYourOwnPage() {
  return (
    <PageShell
      eyebrow="Spreadsheet import"
      title="Upload your spreadsheet. Launch the pool your group already knows."
      description="If your pool lives in Excel today, FY Pools can turn that workbook into a fully working hosted pool with user picks, brackets, scoring, standings, and commissioner tools."
      backHref="/"
      status="Import landing"
    >
      <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <LedgerPanel
          title="What we can convert"
          description="Keep the format that makes your pool yours, then make it easier to run."
        >
          <LedgerRows className="grid md:grid-cols-2 md:divide-x md:divide-y-0">
            {importIncludes.map((item) => {
              const Icon = item.icon;

              return (
                <LedgerRow key={item.title} className="space-y-4">
                  <Icon className="size-5 text-brand-mark" />
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold tracking-[0.005em] text-brand-ink">
                      {item.title}
                    </h2>
                    <p className="text-sm font-normal leading-6 text-muted-foreground">
                      {item.body}
                    </p>
                  </div>
                </LedgerRow>
              );
            })}
          </LedgerRows>
        </LedgerPanel>

        <LedgerPanel
          title="From workbook to pool"
          description="A guided conversion keeps the spreadsheet familiar while moving the hard parts online."
          className="bg-surface-paper"
        >
          <LedgerRows>
            {conversionSteps.map((step, index) => (
              <LedgerRow
                key={step.title}
                className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start"
              >
                <Badge variant="secondary">
                  {String(index + 1).padStart(2, "0")}
                </Badge>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold tracking-[0.005em] text-brand-ink">
                    {step.title}
                  </h2>
                  <p className="text-sm font-normal leading-6 text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </LedgerRow>
            ))}
          </LedgerRows>
        </LedgerPanel>
      </section>

      <LedgerPanel className="bg-accent text-accent-foreground">
        <LedgerRow className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-normal text-cta-green">
              <CheckCircle2 className="size-4" />
              Built for custom commissioner spreadsheets
            </div>
            <h2 className="max-w-[720px] text-2xl font-bold tracking-[0.005em] text-white">
              Bring your existing pool format instead of rebuilding it from a
              blank template.
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="primaryGreen">
              <Link href="/dashboard/pools/new">
                Start pool setup <ArrowRight />
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/dashboard/templates">Browse templates</Link>
            </Button>
          </div>
        </LedgerRow>
      </LedgerPanel>
    </PageShell>
  );
}

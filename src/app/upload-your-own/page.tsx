import type { Metadata } from "next";
import {
  Brackets,
  FileSpreadsheet,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";

import {
  LedgerFeatureRows,
  LedgerPanel,
  LedgerRow,
  LedgerRows,
} from "@/components/app/ledger";
import { PageShell } from "@/components/app/page-shell";
import { Button } from "@/components/ui/button";
import { earlyAccessMailto } from "@/lib/site-contact";

export const metadata: Metadata = {
  title: "Spreadsheet conversion beta",
  description:
    "Request early access to bring an existing spreadsheet-based sports pool online with PoolWaffle.",
  alternates: {
    canonical: "/upload-your-own",
  },
  openGraph: {
    title: "Spreadsheet conversion beta | PoolWaffle",
    description:
      "Tell PoolWaffle about the spreadsheet pool you want to bring online next.",
  },
};

const conversionSteps = [
  {
    title: "Tell us about your current pool",
    body: "Share the workbook, format, pool rules, scoring notes, and event timing that make your group’s pool unique.",
  },
  {
    title: "Help us prioritize the conversion",
    body: "We are collecting closed-beta requests for custom formats, scoring rules, brackets, and import needs before opening this workflow more broadly.",
  },
  {
    title: "Plan the hosted pool together",
    body: "If your format is a fit for the beta, we will follow up before you move any workbook data or invite your players.",
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
      eyebrow="Closed-beta early access"
      title="Bring your spreadsheet pool online next."
      description="Spreadsheet conversion is not self-serve yet. Tell us about the format your group already knows so we can prioritize the right closed-beta workflow."
    >
      <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <LedgerPanel
          title="What we want to learn"
          description="The details below help us understand whether your format belongs in the next conversion cohort."
        >
          <LedgerFeatureRows items={importIncludes} />
        </LedgerPanel>

        <LedgerPanel
          title="How early access works"
          description="We will not ask you to upload a workbook through this page. Start with a short email instead."
          className="bg-surface-paper"
        >
          <LedgerRows>
            {conversionSteps.map((step) => (
              <LedgerRow
                key={step.title}
                className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start"
              >
                <Sparkles className="mt-1 size-5 text-brand-hot" aria-hidden="true" />
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
            <div className="text-sm font-bold uppercase tracking-normal text-cta-green">
              Request conversion early access
            </div>
            <h2 className="max-w-[720px] text-2xl font-bold tracking-[0.005em] text-white">
              Send us the format you want to run. We’ll use it to shape the
              spreadsheet-conversion beta.
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="primaryGreen">
              <a href={earlyAccessMailto("spreadsheet conversion")}>Request early access</a>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="text-white hover:bg-white/10 hover:text-white"
            >
              <a href="/templates">Browse available templates</a>
            </Button>
          </div>
        </LedgerRow>
      </LedgerPanel>
    </PageShell>
  );
}

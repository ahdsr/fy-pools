import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { BrandWordmark, BracketGridMark } from "@/components/app/brand";
import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { SectionHeader } from "@/components/app/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Home() {
  const steps = [
    {
      label: "01",
      title: "Choose template",
      body: "Start from World Cup, NBA series, survivor, or pick'em formats.",
    },
    {
      label: "02",
      title: "Invite players",
      body: "Share a private pool link and track missing entries before lock.",
    },
    {
      label: "03",
      title: "Track standings",
      body: "Publish explainable leaderboards as results and scoring update.",
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full bg-accent text-accent-foreground">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
          <BrandWordmark className="[&_[aria-hidden=true]]:border-white/15 [&_[aria-hidden=true]]:bg-white [&_[aria-hidden=true]]:text-black [&_span]:text-white" />
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              className="text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </nav>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-6 md:py-8">
        <section className="py-6 md:py-10">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="space-y-7 lg:py-8">
              <div className="flex flex-wrap items-center gap-3">
                <BracketGridMark />
                <Badge variant="secondary">Template-first pool hosting</Badge>
              </div>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.03] tracking-[0.01em] text-brand-ink md:text-6xl">
                  Private sports pools, run like a premium event.
                </h1>
                <p className="max-w-2xl text-lg font-normal leading-8 text-muted-foreground">
                  FY Pools helps commissioners create polished pools, collect
                  clean picks, lock entries, and publish standings players can
                  trust.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/dashboard/pools">
                    Create pool <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/dashboard/templates">View templates</Link>
                </Button>
              </div>
            </div>

            <LedgerPanel
              title="Commissioner preview"
              description="A clean operating surface for private pools."
              className="bg-surface-paper"
            >
              <LedgerRows>
                {[
                  ["World Cup Full Predictor", "48 entries", "Picks open"],
                  ["NBA Series Bracket", "22 entries", "Locks Friday"],
                  ["Office Survivor Pool", "31 entries", "Invite live"],
                ].map(([name, entries, status]) => (
                  <LedgerRow
                    key={name}
                    className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                  >
                    <div>
                      <p className="font-medium text-brand-ink">{name}</p>
                      <p className="text-base font-normal text-muted-foreground">
                        Template ready
                      </p>
                    </div>
                    <span className="text-base font-normal text-muted-foreground">
                      {entries}
                    </span>
                    <Badge variant="outline">{status}</Badge>
                  </LedgerRow>
                ))}
              </LedgerRows>
            </LedgerPanel>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.title}
              className="border-t pt-5"
            >
              <p className="text-base font-semibold text-brand-mark">
                {step.label}
              </p>
              <h2 className="mt-3 text-xl font-bold tracking-[0.005em] text-brand-ink">
                {step.title}
              </h2>
              <p className="mt-2 text-base font-normal leading-7 text-muted-foreground">
                {step.body}
              </p>
            </div>
          ))}
        </section>

        <section className="space-y-5">
          <SectionHeader
            title="Built for clarity"
            description="The brand system is bright, legible, and easy to theme."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {[
              "Template-led setup",
              "Readable pool operations",
              "Explainable scoring ledger",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 border-t pt-4">
                <CheckCircle2 className="size-5 text-brand-success" />
                <span className="font-medium text-brand-ink">{item}</span>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

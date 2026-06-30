import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";

import {
  HeaderBrandWordmark,
  HeaderAccountControls,
  SiteHeaderNav,
} from "@/components/app/mock-auth";
import { SiteFooter } from "@/components/app/site-footer";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: {
    absolute: "PoolWaffle | Private Sports Pool Hosting",
  },
  description:
    "Create private sports pools with templates, spreadsheet imports, locked player picks, scoring, projections, and public leaderboards.",
  keywords: [
    "sports pool hosting",
    "private sports pools",
    "office pool software",
    "World Cup pool",
    "NBA playoff pool",
    "NFL survivor pool",
    "pick'em pool",
    "pool leaderboard",
  ],
  openGraph: {
    title: "PoolWaffle | Private Sports Pool Hosting",
    description:
      "Launch private sports pools from templates or spreadsheets, collect clean picks, lock entries, and publish standings players can trust.",
    type: "website",
  },
};

export default function Home() {
  const steps = [
    {
      label: "01",
      title: "Start from a proven format",
      body: "Launch World Cup predictors, NBA playoff brackets, NFL survivor pools, weekly pick'em, golf majors, tennis draws, or a custom spreadsheet import.",
    },
    {
      label: "02",
      title: "Collect clean private entries",
      body: "Share player links, capture valid picks online, track missing entries, and lock each pool before the event starts.",
    },
    {
      label: "03",
      title: "Publish trusted standings",
      body: "Score picks against results, show subtotals, model projections, and give every player a clear public leaderboard.",
    },
  ];

  const features = [
    {
      title: "Template library",
      body: "Build from sport-specific pool templates with pick fields, lock timing, and scoring structure already mapped.",
    },
    {
      title: "Spreadsheet import",
      body: "Bring the workbook your group already uses and convert rules, formulas, brackets, bonuses, and tiebreakers into a hosted pool.",
    },
    {
      title: "Commissioner controls",
      body: "Keep setup, invites, entry status, locks, results refreshes, and scoring reviews in one operating workspace.",
    },
    {
      title: "Player-friendly pool pages",
      body: "Give players read-only standings, score breakdowns, projections, and entry details without sending around manual updates.",
    },
  ];

  const formats = [
    "World Cup full predictors",
    "NBA series brackets",
    "NFL survivor pools",
    "Weekly pick'em",
    "Golf major rosters",
    "Tennis tournament brackets",
    "Custom spreadsheet pools",
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PoolWaffle",
    applicationCategory: "SportsApplication",
    operatingSystem: "Web",
    description:
      "Private sports pool hosting for commissioners, with templates, spreadsheet imports, player entry locks, scoring, projections, and public standings.",
    offers: {
      "@type": "Offer",
      category: "sports pool hosting",
    },
  };

  return (
    <main className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-accent text-accent-foreground">
        <nav className="relative flex h-14 w-full items-center justify-between px-5 md:h-16 md:px-8 lg:px-[43px]">
          <HeaderBrandWordmark />
          <SiteHeaderNav />
          <HeaderAccountControls />
        </nav>
      </header>

      <section className="mx-auto flex w-full max-w-[1268px] flex-col gap-10 px-4 py-5 sm:px-5 md:gap-12 md:px-6 md:py-8">
        <section className="py-8 md:py-12">
          <div className="grid gap-8 lg:grid-cols-[0.93fr_1.07fr] lg:items-start">
            <div className="space-y-6 pt-1 lg:pt-0">
              <div className="space-y-5">
                <h1 className="max-w-[650px] text-[clamp(2.125rem,10vw,4.7rem)] font-normal leading-[1.08] text-brand-ink sm:leading-[1.04]">
                  Private sports pool hosting for serious commissioners.
                </h1>
                <p className="max-w-[610px] text-[0.9375rem] font-normal leading-6 text-muted-foreground sm:text-[1.05rem] sm:font-light sm:leading-7">
                  PoolWaffle helps you launch polished office pools and private
                  sports contests, collect clean player picks, lock entries on
                  schedule, score results, and publish standings everyone can
                  audit.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="primaryGreen" size="lg">
                  <Link href="/dashboard/pools">
                    Create pool <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/upload-your-own">Upload your own</Link>
                </Button>
              </div>
            </div>

            <figure
              aria-label="Generic sports field"
              className="min-h-[360px] overflow-hidden rounded-lg border bg-cover bg-center shadow-[0_20px_60px_color-mix(in_oklch,black,transparent_74%)] ring-1 ring-white/5 lg:min-h-[470px]"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, rgb(0 0 0 / 0.02), rgb(0 0 0 / 0.18)), url(https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=1400&q=80)",
              }}
            />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.title}
              className="border-t pt-5"
            >
              <p className="text-xs font-semibold text-brand-mark sm:text-sm">
                {step.label}
              </p>
              <h2 className="mt-3 text-lg font-bold tracking-normal text-brand-ink sm:text-xl">
                {step.title}
              </h2>
              <p className="mt-2 text-[0.9375rem] font-normal leading-6 text-muted-foreground sm:text-sm">
                {step.body}
              </p>
            </div>
          ))}
        </section>

        <section className="grid gap-8 border-t py-10 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-3">
            <h2 className="max-w-[480px] text-2xl font-normal leading-tight text-brand-ink sm:text-3xl">
              Sports pool software built around the way commissioners actually
              run contests.
            </h2>
            <p className="max-w-[520px] text-[0.9375rem] font-normal leading-6 text-muted-foreground sm:text-base sm:font-light sm:leading-7">
              Start from a template when the format is common. Upload your own
              spreadsheet when the format is custom. Either way, players get a
              clean private pool page and commissioners keep control of the
              scoring.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <article key={feature.title} className="border-t pt-5">
                <h3 className="text-lg font-bold tracking-normal text-brand-ink sm:text-xl">
                  {feature.title}
                </h3>
                <p className="mt-2 text-[0.9375rem] font-normal leading-6 text-muted-foreground sm:text-sm">
                  {feature.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 border-t py-10 md:grid-cols-[0.55fr_1fr] md:items-start">
          <div className="space-y-3">
            <h2 className="text-2xl font-normal leading-tight text-brand-ink sm:text-3xl">
              Pool formats covered
            </h2>
            <p className="text-[0.9375rem] font-normal leading-6 text-muted-foreground sm:text-base sm:font-light sm:leading-7">
              Use PoolWaffle for tournament brackets, season-long contests,
              party sheets, office pools, family pools, and commissioner-run
              custom formats.
            </p>
          </div>
          <ul className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
            {formats.map((format) => (
              <li
                key={format}
                className="border-t border-brand-rule/70 pt-3 text-[0.9375rem] font-semibold leading-6 text-brand-ink sm:text-sm sm:leading-normal"
              >
                {format}
              </li>
            ))}
          </ul>
        </section>
      </section>
      <SiteFooter />
    </main>
  );
}

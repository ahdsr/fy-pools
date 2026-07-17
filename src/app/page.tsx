import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Brackets,
  ChartNoAxesCombined,
  ClipboardCheck,
  FileSpreadsheet,
  LockKeyhole,
  Trophy,
  UsersRound,
} from "lucide-react";

import { LandingPageHeader } from "@/components/app/mock-auth";
import { SiteFooter } from "@/components/app/site-footer";
import { Button } from "@/components/ui/button";
import { getAppSiteUrl } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: {
    absolute: "PoolWaffle | Private Sports Pool Hosting",
  },
  description:
    "Closed-beta private sports pool hosting with live templates, locked player picks, scoring, and public leaderboards.",
  keywords: [
    "sports pool hosting",
    "private sports pools",
    "office pool software",
    "NBA playoff pool",
    "F1 pool",
    "golf pool",
    "pool leaderboard",
  ],
  openGraph: {
    title: "PoolWaffle | Private Sports Pool Hosting",
    description:
      "Launch closed-beta sports pools from live templates, collect clean picks, lock entries, and publish standings players can trust.",
    type: "website",
  },
  alternates: {
    canonical: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "PoolWaffle | Private Sports Pool Hosting",
    description:
      "Launch closed-beta sports pools, collect picks, lock entries, and share standings players can trust.",
  },
};

export default function Home() {
  const steps = [
    {
      label: "01",
      title: "Choose a live format",
      body: "Start with an F1 Grand Prix, NBA Series Bracket, ATP Top Four, or PGA Tour Top Five pool during the closed beta.",
      icon: Brackets,
    },
    {
      label: "02",
      title: "Collect clean private entries",
      body: "Share player links, capture valid picks online, track missing entries, and lock each pool before the event starts.",
      icon: ClipboardCheck,
    },
    {
      label: "03",
      title: "Publish trusted standings",
      body: "Score picks against results, show subtotals, model projections, and give every player a clear public leaderboard.",
      icon: Trophy,
    },
  ];

  const features = [
    {
      title: "Template library",
      body: "Launch the four closed-beta formats with their pick fields, lock timing, and scoring structure already mapped.",
      icon: Brackets,
    },
    {
      title: "Spreadsheet conversion beta",
      body: "Tell us about the workbook your group uses today and request early access to the upcoming conversion workflow.",
      icon: FileSpreadsheet,
    },
    {
      title: "Commissioner controls",
      body: "Keep setup, invites, entry status, locks, results refreshes, and scoring reviews in one operating workspace.",
      icon: LockKeyhole,
    },
    {
      title: "Player-friendly pool pages",
      body: "Give players read-only standings, score breakdowns, and entry details without sending around manual updates.",
      icon: ChartNoAxesCombined,
    },
  ];

  const poolViews = [
    {
      title: "Commissioner view",
      body: "Set up the format, send invitations, check entry status, and manage locks and scoring.",
      icon: ClipboardCheck,
    },
    {
      title: "Player view",
      body: "Submit picks before the deadline, revisit an entry, and follow the latest position.",
      icon: UsersRound,
    },
    {
      title: "Public view",
      body: "Share standings, score breakdowns, brackets, and entry details from a single pool page.",
      icon: Trophy,
    },
  ];

  const formats = [
    "F1 Grand Prix Predictor",
    "NBA Series Bracket",
    "ATP Tour Top Four Predictor",
    "PGA Tour Top Five Predictor",
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PoolWaffle",
    applicationCategory: "SportsApplication",
    operatingSystem: "Web",
    url: getAppSiteUrl(),
    description:
      "Closed-beta private sports pool hosting for commissioners, with live templates, player entry locks, scoring, and public standings.",
  };

  return (
    <main className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPageHeader solid />

      <section className="mx-auto flex w-full max-w-[1268px] flex-col gap-4 px-4 py-5 sm:px-5 md:px-6 md:py-8">
        <section className="overflow-hidden rounded-[2rem] border border-border bg-card p-3 sm:p-4 md:p-5">
          <div className="grid gap-3 lg:grid-cols-[0.93fr_1.07fr] lg:items-stretch">
            <div className="flex flex-col justify-center rounded-[1.5rem] bg-background p-6 sm:p-8 lg:p-10">
              <div className="space-y-6">
                <div className="space-y-5">
                  <p className="text-xs font-semibold tracking-[0.08em] text-brand-hot uppercase">
                    Closed beta · better pools, together
                  </p>
                  <h1 className="hero-heading max-w-[650px] text-[clamp(2.125rem,9vw,3.25rem)] font-normal leading-[1.08] text-foreground sm:leading-[1.04] md:text-[clamp(3.25rem,5.5vw,4.7rem)]">
                    Private sports pool hosting for early groups.
                  </h1>
                  <p className="max-w-[610px] text-[0.9375rem] font-normal leading-6 text-muted-foreground sm:text-[1.05rem] sm:font-light sm:leading-7">
                    PoolWaffle is testing a better way to launch private sports
                    pools: collect clean player picks, lock entries on schedule,
                    score results, and publish standings everyone can audit.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button asChild variant="primaryGreen" size="lg">
                    <Link href="/sign-up?next=%2Fdashboard%2Fpools">
                      Create an account <ArrowRight />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="border-border bg-card text-foreground hover:border-foreground/30 hover:bg-muted hover:text-foreground"
                  >
                    <Link href="/sign-in?next=%2Fdashboard%2Fpools">
                      Sign in
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            <figure
              aria-label="Night football match on a stadium pitch"
              className="relative flex min-h-[360px] flex-col justify-end overflow-hidden rounded-[1.5rem] border border-border bg-cover bg-center p-4 ring-1 ring-foreground/5 sm:p-6 lg:min-h-[470px]"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, rgb(0 0 0 / 0.02), rgb(0 0 0 / 0.18)), url(https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=1400&q=80)",
              }}
            >
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/22 to-transparent" />
              <figcaption className="relative grid gap-3">
                <div className="w-fit rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-xs font-semibold tracking-[0.08em] text-white uppercase backdrop-blur-sm">
                  One place to run the pool
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {steps.map((step) => {
                    const Icon = step.icon;

                    return (
                      <div
                        key={step.label}
                        className="rounded-lg border border-white/16 bg-black/38 p-3 text-white backdrop-blur-sm"
                      >
                        <Icon className="size-4 text-cta-green" aria-hidden="true" />
                        <p className="mt-3 text-sm font-semibold leading-5">
                          {step.title}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="grid gap-3 rounded-[1.75rem] border border-border bg-card p-5 sm:p-6 md:grid-cols-3 md:p-8">
          {steps.map((step) => (
            <div
              key={step.title}
              className="rounded-2xl border border-border bg-background p-4 sm:p-5"
            >
              <div className="flex items-center gap-2 text-brand-hot">
                <step.icon className="size-4" aria-hidden="true" />
                <p className="text-xs font-semibold sm:text-sm">{step.label}</p>
              </div>
              <h2 className="mt-3 text-lg font-bold tracking-normal text-foreground sm:text-xl">
                {step.title}
              </h2>
              <p className="mt-2 text-[0.9375rem] font-normal leading-6 text-muted-foreground sm:text-sm">
                {step.body}
              </p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 rounded-[1.75rem] border border-border bg-card p-5 sm:p-6 lg:grid-cols-[0.82fr_1.18fr] lg:p-8">
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-[0.08em] text-brand-hot uppercase">
              Built for commissioners
            </p>
            <h2 className="max-w-[480px] text-2xl font-normal leading-tight text-foreground sm:text-3xl">
              Sports pool software built around the way commissioners actually
              run contests.
            </h2>
            <p className="max-w-[520px] text-[0.9375rem] font-normal leading-6 text-muted-foreground sm:text-base sm:font-light sm:leading-7">
              Start with one of the formats available in the beta. If your pool
              is custom or lives in a spreadsheet, tell us what you run and we’ll
              use it to shape the next release.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.title}
                  className="rounded-2xl border border-border bg-background p-4 sm:p-5"
                >
                  <div className="grid size-9 place-items-center rounded-xl bg-cta-green text-cta-green-foreground">
                    <Icon className="size-4" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold tracking-normal text-foreground sm:text-xl">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-[0.9375rem] font-normal leading-6 text-muted-foreground sm:text-sm">
                    {feature.body}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 rounded-[1.75rem] border border-border bg-card p-5 sm:p-6 lg:grid-cols-[0.55fr_1fr] lg:items-start lg:p-8">
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-[0.08em] text-brand-hot uppercase">
              Clear roles, clear information
            </p>
            <h2 className="text-2xl font-normal leading-tight text-foreground sm:text-3xl">
              Give every person the right view of the pool.
            </h2>
            <p className="text-[0.9375rem] font-normal leading-6 text-muted-foreground sm:text-base sm:font-light sm:leading-7">
              Commissioners manage the work. Players submit and follow their
              entries. Everyone else can check the standings without requesting
              an update.
            </p>
          </div>
          <div
            className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-cover bg-center p-3 sm:p-4"
            style={{
              backgroundImage:
                "url(/illustrations/poolwaffle-sign-up-standings.png)",
            }}
          >
            <div className="absolute inset-0 bg-black/60" />
            <div className="relative grid gap-3">
              {poolViews.map((view) => {
                const Icon = view.icon;

                return (
                  <article
                    key={view.title}
                    className="grid gap-4 rounded-2xl border border-white/15 bg-black/55 p-4 backdrop-blur-sm sm:grid-cols-[auto_1fr] sm:items-start"
                  >
                    <div className="grid size-10 place-items-center rounded-xl bg-cta-green text-cta-green-foreground">
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {view.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-white/72">
                        {view.body}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-6 rounded-[1.75rem] border border-border bg-card p-5 sm:p-6 md:grid-cols-[0.55fr_1fr] md:items-start md:p-8">
          <div className="space-y-3">
            <h2 className="text-2xl font-normal leading-tight text-foreground sm:text-3xl">
              Formats available in the beta
            </h2>
            <p className="text-[0.9375rem] font-normal leading-6 text-muted-foreground sm:text-base sm:font-light sm:leading-7">
              These formats can launch today. More templates and spreadsheet
              conversion are available by early-access request while we test
              them with small groups.
            </p>
          </div>
          <ul className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
            {formats.map((format) => (
              <li
                key={format}
                className="border-t border-border pt-3 text-[0.9375rem] font-semibold leading-6 text-foreground sm:text-sm sm:leading-normal"
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

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BrandWordmark, BracketGridMark } from "@/components/app/brand";
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
        <nav className="flex h-20 w-full items-center justify-between px-8 md:px-[43px]">
          <BrandWordmark className="[&_[aria-hidden=true]]:border-white/15 [&_[aria-hidden=true]]:bg-white [&_[aria-hidden=true]]:text-black [&_span]:text-white" />
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              className="text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild variant="primaryGreen">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </nav>
      </header>

      <section className="mx-auto flex w-full max-w-[1268px] flex-col gap-10 px-6 py-6 md:py-8">
        <section className="py-14 md:py-16">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="space-y-7 lg:py-8">
              <div className="flex flex-wrap items-center gap-3">
                <BracketGridMark />
                <Badge variant="secondary">Template-first pool hosting</Badge>
              </div>
              <div className="space-y-4">
                <h1 className="max-w-[625px] text-[clamp(2.75rem,6vw,3.5rem)] font-normal leading-[1.14] tracking-[-0.02em] text-brand-ink">
                  Private sports pools, run like a premium event.
                </h1>
                <p className="max-w-[625px] text-base font-light leading-[1.4375rem] text-muted-foreground">
                  FY Pools helps commissioners create polished pools, collect
                  clean picks, lock entries, and publish standings players can
                  trust.
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
                  "linear-gradient(180deg, rgb(0 0 0 / 0.02), rgb(0 0 0 / 0.18)), url(https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1400&q=80)",
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
              <p className="text-sm font-semibold text-brand-mark">
                {step.label}
              </p>
              <h2 className="mt-3 text-xl font-bold tracking-[0.005em] text-brand-ink">
                {step.title}
              </h2>
              <p className="mt-2 text-sm font-normal leading-6 text-muted-foreground">
                {step.body}
              </p>
            </div>
          ))}
        </section>

      </section>
    </main>
  );
}

import Link from "next/link";
import { ArrowRight, CircleArrowRight, Plus } from "lucide-react";

import { PageShell } from "@/components/app/page-shell";
import { TemplateCategoryCard } from "@/components/app/template-category-card";
import { Button } from "@/components/ui/button";
import { FilterPill } from "@/components/ui/filter-pill";
import { TEMPLATE_CATEGORIES } from "@/lib/templates/catalog";

const activePools = [
  {
    name: "Marcin's 2026 World Cup Pool",
    players: "30 entries",
    status: "Public page live",
    href: "/pools/marcins-2026-world-cup-pool",
  },
  {
    name: "Sample NBA Playoff Pool",
    players: "22 players",
    status: "Template seed",
    href: "/dashboard/pools/new?template=nba-series-bracket",
  },
];

const poolFilters = [
  { label: "All", variant: "active" },
  { label: "In flight", variant: "lime" },
  { label: "Upcoming", variant: "sky" },
  { label: "Always-on", variant: "coral" },
] as const;

const categoryVisuals: Record<string, { label: string; image: string }> = {
  "world-cup": {
    label: "2026 World Cup",
    image:
      "https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=900&q=80",
  },
  nba: {
    label: "NBA",
    image:
      "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=900&q=80",
  },
  nfl: {
    label: "NFL",
    image:
      "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&w=900&q=80",
  },
  tennis: {
    label: "Tennis",
    image:
      "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=900&q=80",
  },
  golf: {
    label: "Golf",
    image:
      "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&w=900&q=80",
  },
};

export default function DashboardPoolsPage() {
  return (
    <PageShell
      eyebrow="Pool management"
      title="Choose a sport category"
      description="Start with the sport or event your group follows, then launch from a popular template or browse every format in that category."
      showHeader={false}
    >
      <section className="space-y-8">
        <div className="space-y-5">
          <div className="flex flex-col gap-4">
            <div className="space-y-4">
              <h2 className="text-[2.875rem] font-normal leading-none tracking-[-0.02em] text-brand-hot">
                Hot right now
              </h2>
              <div className="flex flex-wrap gap-2.5">
                {poolFilters.map((filter) => (
                  <FilterPill key={filter.label} variant={filter.variant}>
                    {filter.label}
                  </FilterPill>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-dashed border-brand-rule" />
        </div>

        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 xl:grid-cols-[repeat(4,279px)] xl:gap-x-[49px]">
          {TEMPLATE_CATEGORIES.map((category) => (
            <TemplateCategoryCard
              key={category.slug}
              category={category}
              visual={
                categoryVisuals[category.slug] ?? {
                  label: category.name,
                  image:
                    "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80",
                }
              }
              primaryIcon={Plus}
              templateLinkIcon={CircleArrowRight}
              secondaryActionIcon={ArrowRight}
            />
          ))}
        </div>
      </section>

      <section className="space-y-5 border-t border-dashed border-brand-rule pt-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[2.125rem] font-normal leading-[2.75rem] tracking-[-0.02em] text-brand-ink">
              Existing pools
            </h2>
            <p className="mt-2 max-w-2xl text-base font-light leading-[1.4375rem] text-foreground/75">
              Active pools stay close by, but creating the next one starts with
              choosing a sport category above.
            </p>
          </div>
          <Button asChild variant="secondaryGreen">
            <Link href="/dashboard/templates">View all templates</Link>
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {activePools.map((pool) => (
            <Link
              key={pool.name}
              href={pool.href}
              className="flex items-center justify-between gap-4 rounded-lg bg-muted px-4 py-3 transition-colors hover:bg-cta-green-soft"
            >
              <div>
                <p className="font-semibold text-brand-ink">{pool.name}</p>
                <p className="text-sm font-normal leading-[1.4375rem] text-foreground/70">
                  {pool.players}
                </p>
              </div>
              <span className="rounded-full border border-border bg-white/72 px-2.5 py-1 text-xs font-medium text-foreground">
                {pool.status}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

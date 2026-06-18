import Link from "next/link";
import { ArrowRight, CircleArrowRight, Plus } from "lucide-react";

import { PageShell } from "@/components/app/page-shell";
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
          {TEMPLATE_CATEGORIES.map((category) => {
            const visual = categoryVisuals[category.slug] ?? {
              label: category.name,
              image:
                "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80",
            };
            const primaryTemplate = category.templates[0];

            return (
              <article key={category.slug} className="space-y-4">
                <div className="space-y-3">
                  <h3 className="text-[2.125rem] font-normal leading-[2.75rem] tracking-[-0.02em] text-brand-ink">
                    {visual.label}
                  </h3>

                  <Link
                    href={`/dashboard/pools/new?template=${primaryTemplate?.slug}`}
                    aria-label={`Start ${category.name} pool`}
                    className="group block overflow-hidden rounded-lg bg-muted"
                  >
                    <div
                      className="aspect-[4/3] bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.03]"
                      style={{
                        backgroundImage: `linear-gradient(180deg, transparent 45%, rgb(0 0 0 / 0.34)), url(${visual.image})`,
                      }}
                    />
                  </Link>
                </div>

                <p className="text-base font-light leading-[1.4375rem] text-foreground/90">
                  {category.description}
                </p>

                <div className="space-y-4">
                  {category.templates.slice(0, 3).map((template) => (
                    <Link
                      key={template.slug}
                      href={`/dashboard/pools/new?template=${template.slug}`}
                      className="group flex items-center gap-2 text-sm font-normal leading-[1.4375rem] text-brand-ink transition-colors hover:text-brand-hot"
                    >
                      <CircleArrowRight className="size-[18px] shrink-0 text-primary transition-colors group-hover:text-brand-hot" />
                      <span>{template.name}</span>
                    </Link>
                  ))}
                </div>

                <div className="flex flex-col gap-4 pt-2">
                  <Button asChild variant="primaryGreen" className="w-fit">
                    <Link
                      href={`/dashboard/pools/new?template=${primaryTemplate?.slug}`}
                    >
                      <Plus /> Start pool
                    </Link>
                  </Button>
                  <Button asChild variant="secondaryGreen" className="w-fit">
                    <Link href={`/dashboard/templates?category=${category.slug}`}>
                      More templates <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </article>
            );
          })}
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

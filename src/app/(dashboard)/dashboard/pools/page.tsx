import Link from "next/link";
import {
  ArrowRight,
  CircleArrowRight,
  Plus,
} from "lucide-react";

import { PageShell } from "@/components/app/page-shell";
import { TemplateCategoryCard } from "@/components/app/template-category-card";
import { Button } from "@/components/ui/button";
import { FilterPill } from "@/components/ui/filter-pill";
import { TEMPLATE_CATEGORIES } from "@/lib/templates/catalog";

const poolFilters = [
  { label: "All formats", variant: "active" },
  { label: "Current tournaments", variant: "lime" },
  { label: "Upcoming events", variant: "sky" },
  { label: "Year-round pools", variant: "coral" },
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

export const unstable_instant = { prefetch: "runtime", samples: [{}] };

export default function DashboardPoolsPage() {
  return (
    <PageShell
      eyebrow="Pool management"
      title="Start a new pool"
      description="Choose a sport or event category, then launch from a popular template or browse every format."
      showHeader={false}
      heroAction={
        <Button asChild variant="secondaryGreen">
          <Link href="/dashboard">Back to workspace</Link>
        </Button>
      }
    >
      <section className="space-y-8">
        <div className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-4">
              <h2 className="text-[2.875rem] font-normal leading-none tracking-[-0.02em] text-brand-hot">
                Choose a pool format
              </h2>
              <div className="flex flex-wrap gap-2.5">
                {poolFilters.map((filter) => (
                  <FilterPill key={filter.label} variant={filter.variant}>
                    {filter.label}
                  </FilterPill>
                ))}
              </div>
            </div>
            <Button asChild variant="secondaryGreen">
              <Link href="/dashboard/templates">Browse all templates</Link>
            </Button>
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
    </PageShell>
  );
}

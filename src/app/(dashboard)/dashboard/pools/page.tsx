import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CircleArrowRight,
  ExternalLink,
  ListChecks,
  Plus,
  Trophy,
  Users,
} from "lucide-react";

import { PageShell } from "@/components/app/page-shell";
import { TemplateCategoryCard } from "@/components/app/template-category-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterPill } from "@/components/ui/filter-pill";
import {
  getCommissionerPoolSummaries,
  type CommissionerPoolSummary,
} from "@/lib/round-of-16/persistence";
import { TEMPLATE_CATEGORIES } from "@/lib/templates/catalog";

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

export const dynamic = "force-dynamic";

function formatDateTime(value: string) {
  if (!value) return "Not set";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString();
}

function ExistingPoolCard({ pool }: { pool: CommissionerPoolSummary }) {
  const submittedEntries = pool.entryCounts.submitted + pool.entryCounts.locked;

  return (
    <article className="flex min-h-[16rem] flex-col justify-between gap-5 rounded-lg border bg-surface-paper p-4">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{pool.status}</Badge>
          <Badge variant="outline">{pool.deadlineStatus}</Badge>
        </div>
        <div>
          <h3 className="text-xl font-bold tracking-normal text-brand-ink">
            {pool.poolName}
          </h3>
          <p className="mt-2 text-sm font-normal leading-6 text-muted-foreground">
            {pool.templateName}
          </p>
        </div>
        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2">
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Users className="size-4" />
              Invites
            </span>
            <span className="font-semibold text-brand-ink">
              {pool.inviteCounts.accepted}/{pool.inviteCounts.total} accepted
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2">
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <ListChecks className="size-4" />
              Entries
            </span>
            <span className="font-semibold text-brand-ink">
              {submittedEntries} submitted
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2">
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <CalendarClock className="size-4" />
              Lock
            </span>
            <span className="font-semibold text-brand-ink">
              {formatDateTime(pool.pickDeadline)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="primaryGreen">
          <Link href={`/dashboard/pools/${pool.poolId}/scoring`}>
            Score <Trophy />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/pools/${pool.poolSlug}`}>
            Public <ExternalLink />
          </Link>
        </Button>
      </div>
    </article>
  );
}

export default async function DashboardPoolsPage() {
  const activePools = await getCommissionerPoolSummaries();

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

        {activePools.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {activePools.map((pool) => (
              <ExistingPoolCard key={pool.poolId} pool={pool} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border bg-surface-paper p-5">
            <p className="font-semibold text-brand-ink">No published pools yet</p>
            <p className="mt-2 max-w-2xl text-sm font-normal leading-6 text-muted-foreground">
              Create a Round of 16 pool from the World Cup templates above to
              start tracking invites, entries, and scoring.
            </p>
          </div>
        )}
      </section>
    </PageShell>
  );
}

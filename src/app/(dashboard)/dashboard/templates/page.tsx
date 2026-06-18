import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { PageShell } from "@/components/app/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterPill } from "@/components/ui/filter-pill";
import {
  getAllTemplates,
  getCategoryBySlug,
  TEMPLATE_CATEGORIES,
  type TemplateCategory,
} from "@/lib/templates/catalog";

type DashboardTemplatesPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function getCategoryDisplayName(category: TemplateCategory) {
  return category.slug === "world-cup" ? "2026 World Cup" : category.name;
}

export default async function DashboardTemplatesPage({
  searchParams,
}: DashboardTemplatesPageProps) {
  const params = await searchParams;
  const categorySlug = Array.isArray(params.category)
    ? params.category[0]
    : params.category;
  const selectedCategory = getCategoryBySlug(categorySlug);
  const selectedCategoryName = selectedCategory
    ? getCategoryDisplayName(selectedCategory)
    : undefined;
  const templates = selectedCategory
    ? selectedCategory.templates.map((template) => ({
        ...template,
        category: selectedCategory,
      }))
    : getAllTemplates();

  return (
    <PageShell
      title={selectedCategoryName ?? "Templates"}
      description={
        selectedCategory
          ? `All available ${selectedCategoryName} pool formats, ready to launch into the setup wizard.`
          : "Browse every template category so commissioners start from a clear format, not blank setup."
      }
      topContent={
        <nav
          aria-label="Template categories"
          className="flex flex-wrap gap-3 pt-1"
        >
          <FilterPill asChild variant={selectedCategory ? "neutral" : "active"}>
            <Link href="/dashboard/templates">All Templates</Link>
          </FilterPill>
          {TEMPLATE_CATEGORIES.map((category) => (
            <FilterPill
              key={category.slug}
              asChild
              variant={
                selectedCategory?.slug === category.slug ? "active" : "neutral"
              }
            >
              <Link href={`/dashboard/templates?category=${category.slug}`}>
                {category.name}
              </Link>
            </FilterPill>
          ))}
        </nav>
      }
    >
      <LedgerPanel
        title={selectedCategoryName ?? "Template library"}
        description={
          selectedCategory
            ? selectedCategory.description
            : "Rows make the choices easy to compare before setup."
        }
      >
        <LedgerRows>
          {templates.map((template) => (
            <LedgerRow
              key={`${template.category.slug}-${template.slug}`}
              className="grid gap-4 md:grid-cols-[1.1fr_0.8fr_1.1fr_0.8fr_auto] md:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-brand-ink">
                    {template.name}
                  </h2>
                  <Badge variant="outline">{template.popularity}</Badge>
                </div>
                <p className="mt-1 text-sm font-normal text-muted-foreground">
                  {template.category.name}
                </p>
              </div>
              <p className="text-sm font-normal text-muted-foreground">
                {template.bestFor}
              </p>
              <p className="text-sm font-normal text-muted-foreground">
                {template.picks}
              </p>
              <Badge variant="outline">{template.lock}</Badge>
              <Button asChild variant="outline">
                <Link href={`/dashboard/pools/new?template=${template.slug}`}>
                  Use template <ArrowRight />
                </Link>
              </Button>
            </LedgerRow>
          ))}
        </LedgerRows>
      </LedgerPanel>
    </PageShell>
  );
}

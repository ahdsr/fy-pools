"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { PageShell } from "@/components/app/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterPill } from "@/components/ui/filter-pill";
import { signUpPathFor } from "@/lib/auth/paths";
import {
  getAllTemplates,
  getTemplateAvailability,
  canLaunchCatalogTemplate,
  getCategoryBySlug,
  TEMPLATE_CATEGORIES,
  type TemplateCategory,
} from "@/lib/templates/catalog";

type TemplateLibraryProps = {
  audience: "public" | "workspace";
};

function getCategoryDisplayName(category: TemplateCategory) {
  return category.slug === "world-cup" ? "2026 World Cup" : category.name;
}

export function TemplateLibrary({ audience }: TemplateLibraryProps) {
  const searchParams = useSearchParams();
  const categorySlug = searchParams.get("category") ?? undefined;
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
  const isPublic = audience === "public";
  const libraryPath = isPublic ? "/templates" : "/dashboard/templates";

  function setupPathFor(templateSlug: string) {
    const setupPath = `/dashboard/pools/new?template=${templateSlug}`;

    return isPublic ? signUpPathFor(setupPath) : setupPath;
  }

  return (
    <PageShell
      eyebrow={isPublic ? "Pool formats" : undefined}
      title={selectedCategoryName ?? "Templates"}
      description={
        selectedCategory
          ? `All available ${selectedCategoryName} pool formats, ready to launch into the setup wizard.`
          : isPublic
            ? "Explore ready-to-run sports pool formats before you create an account. Choose one when you are ready to launch your group."
            : "Browse every template category so commissioners start from a clear format, not blank setup."
      }
      heroAction={
        isPublic ? (
          <Button asChild variant="primaryGreen">
            <Link href={signUpPathFor("/dashboard/pools")}>Create a pool <ArrowRight /></Link>
          </Button>
        ) : undefined
      }
      showHeader={!isPublic ? false : true}
      topContent={
        <nav aria-label="Template categories" className="flex flex-wrap gap-3 pt-1">
          <FilterPill asChild variant={selectedCategory ? "neutral" : "active"}>
            <Link href={libraryPath}>All Templates</Link>
          </FilterPill>
          {TEMPLATE_CATEGORIES.map((category) => (
            <FilterPill
              key={category.slug}
              asChild
              variant={
                selectedCategory?.slug === category.slug ? "active" : "neutral"
              }
            >
              <Link href={`${libraryPath}?category=${category.slug}`}>
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
            : isPublic
              ? "Browse the formats first; sign in only when you are ready to create and manage a pool."
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
                  {!canLaunchCatalogTemplate(template) ? (
                    <Badge variant="outline">Coming soon</Badge>
                  ) : null}
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
              {canLaunchCatalogTemplate(template) ? (
                <Button asChild variant="outline">
                  <Link href={setupPathFor(template.slug)}>
                    {isPublic ? "Start with template" : "Use template"} <ArrowRight />
                  </Link>
                </Button>
              ) : (
                <Button type="button" variant="outline" disabled>
                  {getTemplateAvailability(template) === "coming-soon"
                    ? "Coming soon"
                    : "Unavailable"}
                </Button>
              )}
            </LedgerRow>
          ))}
        </LedgerRows>
      </LedgerPanel>
    </PageShell>
  );
}

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { PageShell } from "@/components/app/page-shell";
import { SectionHeader } from "@/components/app/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getAllTemplates,
  getCategoryBySlug,
  TEMPLATE_CATEGORIES,
} from "@/lib/templates/catalog";
import { TEMPLATE_PICK_TYPES } from "@/lib/templates/pick-types";

type DashboardTemplatesPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function DashboardTemplatesPage({
  searchParams,
}: DashboardTemplatesPageProps) {
  const params = await searchParams;
  const categorySlug = Array.isArray(params.category)
    ? params.category[0]
    : params.category;
  const selectedCategory = getCategoryBySlug(categorySlug);
  const templates = selectedCategory
    ? selectedCategory.templates.map((template) => ({
        ...template,
        category: selectedCategory,
      }))
    : getAllTemplates();

  return (
    <PageShell
      eyebrow="Template engine"
      title={selectedCategory ? `${selectedCategory.name} templates` : "Templates"}
      description={
        selectedCategory
          ? `All available ${selectedCategory.name} pool formats, ready to launch into the setup wizard.`
          : "Browse every template category so commissioners start from a clear format, not blank setup."
      }
    >
      <section className="space-y-5">
        <SectionHeader
          title="Template categories"
          description="Filter by sport or event type, then launch the exact format you want to create."
          action={
            selectedCategory ? (
              <Button asChild variant="outline">
                <Link href="/dashboard/templates">All templates</Link>
              </Button>
            ) : (
              <Badge variant="secondary">{templates.length} templates</Badge>
            )
          }
        />
        <div className="flex flex-wrap gap-2">
          {TEMPLATE_CATEGORIES.map((category) => (
            <Button
              key={category.slug}
              asChild
              variant={
                selectedCategory?.slug === category.slug
                  ? "default"
                  : "outline"
              }
              size="sm"
            >
              <Link href={`/dashboard/templates?category=${category.slug}`}>
                {category.name}
              </Link>
            </Button>
          ))}
        </div>
      </section>

      <LedgerPanel
        title={selectedCategory ? selectedCategory.name : "Template library"}
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
                <p className="mt-1 text-base font-normal text-muted-foreground">
                  {template.category.name}
                </p>
              </div>
              <p className="text-base font-normal text-muted-foreground">
                {template.bestFor}
              </p>
              <p className="text-base font-normal text-muted-foreground">
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

      <section className="space-y-4">
        <SectionHeader
          title="Minimum pick types"
          description="These are the first reusable field contracts."
        />
        <div className="flex flex-wrap gap-2">
          {TEMPLATE_PICK_TYPES.map((type) => (
            <Badge key={type} variant="outline">
              {type}
            </Badge>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

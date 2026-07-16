import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  canLaunchCatalogTemplate,
  type TemplateCategory,
} from "@/lib/templates/catalog";

type TemplateCategoryVisual = {
  label: string;
  image: string;
};

type TemplateCategoryCardProps = {
  category: TemplateCategory;
  visual: TemplateCategoryVisual;
  primaryIcon: LucideIcon;
  templateLinkIcon: LucideIcon;
  secondaryActionIcon: LucideIcon;
};

export function TemplateCategoryCard({
  category,
  visual,
  primaryIcon: PrimaryIcon,
  templateLinkIcon: TemplateLinkIcon,
  secondaryActionIcon: SecondaryActionIcon,
}: TemplateCategoryCardProps) {
  const primaryTemplate =
    category.templates.find(canLaunchCatalogTemplate) ?? category.templates[0];
  if (!primaryTemplate) return null;

  const primaryTemplateAvailable = canLaunchCatalogTemplate(primaryTemplate);

  const primaryTemplateHref = `/dashboard/pools/new?template=${primaryTemplate.slug}`;

  return (
    <article className="space-y-4">
      <div className="space-y-3">
        <h3 className="text-[2.125rem] font-normal leading-[2.75rem] tracking-[-0.02em] text-brand-ink">
          {visual.label}
        </h3>

        <div
          aria-label={`${category.name} pool templates`}
          className="group block overflow-hidden rounded-lg bg-muted"
        >
          <div
            className="aspect-[4/3] bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.03]"
            style={{
              backgroundImage: `linear-gradient(180deg, transparent 45%, rgb(0 0 0 / 0.34)), url(${visual.image})`,
            }}
          />
        </div>
      </div>

      <p className="text-base font-light leading-[1.4375rem] text-foreground/90">
        {category.description}
      </p>

      <div className="space-y-4">
        {category.templates.slice(0, 3).map((template) => (
          <div
            key={template.slug}
            className="flex items-center gap-2 text-sm font-normal leading-[1.4375rem] text-brand-ink"
          >
            <TemplateLinkIcon className="size-[18px] shrink-0 text-primary transition-colors group-hover:text-brand-hot" />
            {canLaunchCatalogTemplate(template) ? (
              <Link
                href={`/dashboard/pools/new?template=${template.slug}`}
                className="transition-colors hover:text-brand-hot"
              >
                {template.name}
              </Link>
            ) : (
              <span>{template.name} <span className="text-muted-foreground">(coming soon)</span></span>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 pt-2">
        {primaryTemplateAvailable ? (
          <Button asChild variant="primaryGreen" className="w-fit">
            <Link href={primaryTemplateHref}>
              <PrimaryIcon /> Start pool
            </Link>
          </Button>
        ) : (
          <Button type="button" variant="primaryGreen" className="w-fit" disabled>
            <PrimaryIcon /> Coming soon
          </Button>
        )}
        <Button asChild variant="secondaryGreen" className="w-fit">
          <Link href={`/dashboard/templates?category=${category.slug}`}>
            More templates <SecondaryActionIcon className="size-4" />
          </Link>
        </Button>
      </div>
    </article>
  );
}

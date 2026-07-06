import type { ComponentProps, CSSProperties } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import {
  HeaderAccountControls,
  HeaderBrandWordmark,
  SiteHeaderNav,
} from "@/components/app/mock-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MarketingHeaderProps = {
  className?: string;
};

export function MarketingHeader({ className }: MarketingHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-surface-inverse-foreground/10 bg-accent text-accent-foreground",
        className,
      )}
    >
      <nav className="relative flex h-14 w-full items-center justify-between px-5 md:h-16 md:px-8 lg:px-[43px]">
        <HeaderBrandWordmark />
        <SiteHeaderNav />
        <HeaderAccountControls />
      </nav>
    </header>
  );
}

type MarketingHeroVisualProps = {
  image: string;
  label: string;
  className?: string;
};

export function MarketingHeroVisual({
  image,
  label,
  className,
}: MarketingHeroVisualProps) {
  return (
    <figure
      aria-label={label}
      className={cn(
        "min-h-[360px] overflow-hidden rounded-lg border bg-cover bg-center ring-1 ring-white/5 lg:min-h-[470px]",
        className,
      )}
      style={
        {
          "--marketing-hero-image": `url(${image})`,
          backgroundImage:
            "var(--marketing-hero-overlay), var(--marketing-hero-image)",
        } as CSSProperties
      }
    />
  );
}

export type MarketingInfoItem = {
  label?: string;
  title: string;
  body: string;
};

type MarketingInfoGridProps = {
  items: MarketingInfoItem[];
  columns?: 2 | 3;
  headingLevel?: 2 | 3;
};

export function MarketingInfoGrid({
  items,
  columns = 3,
  headingLevel = 2,
}: MarketingInfoGridProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <div
      className={cn(
        "grid gap-4",
        columns === 2 ? "sm:grid-cols-2" : "md:grid-cols-3",
      )}
    >
      {items.map((item) => (
        <article key={item.title} className="border-t pt-5">
          {item.label ? (
            <p className="text-xs font-semibold text-brand-mark sm:text-sm">
              {item.label}
            </p>
          ) : null}
          <Heading className="mt-3 text-lg font-bold tracking-normal text-brand-ink sm:text-xl">
            {item.title}
          </Heading>
          <p className="mt-2 text-[0.9375rem] font-normal leading-6 text-muted-foreground sm:text-sm">
            {item.body}
          </p>
        </article>
      ))}
    </div>
  );
}

type MarketingFormatListProps = {
  formats: string[];
};

export function MarketingFormatList({ formats }: MarketingFormatListProps) {
  return (
    <ul className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
      {formats.map((format) => (
        <li
          key={format}
          className="border-t border-brand-rule/70 pt-3 text-[0.9375rem] font-semibold leading-6 text-brand-ink sm:text-sm sm:leading-normal"
        >
          {format}
        </li>
      ))}
    </ul>
  );
}

type MarketingAction = {
  href: string;
  label: string;
  icon?: LucideIcon;
  variant?: ComponentProps<typeof Button>["variant"];
};

type MarketingActionGroupProps = {
  actions: MarketingAction[];
};

export function MarketingActionGroup({ actions }: MarketingActionGroupProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {actions.map((action) => {
        const Icon = action.icon;

        return (
          <Button
            key={action.href}
            asChild
            variant={action.variant ?? "default"}
            size="lg"
          >
            <Link href={action.href}>
              {action.label}
              {Icon ? <Icon /> : null}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}

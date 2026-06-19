import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/app/section-header";

type LedgerPanelProps = Omit<React.ComponentProps<"section">, "title"> & {
  title?: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
};

export function LedgerPanel({
  title,
  description,
  action,
  className,
  children,
  ...props
}: LedgerPanelProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border bg-surface-paper text-card-foreground shadow-[0_20px_60px_color-mix(in_oklch,black,transparent_74%)] ring-1 ring-white/5",
        className,
      )}
      {...props}
    >
      {(title || description || action) && (
        <header className="border-b bg-surface-ledger/90 px-5 py-4">
          <SectionHeader
            title={title}
            description={description}
            action={action}
          />
        </header>
      )}
      <div>{children}</div>
    </section>
  );
}

export function LedgerRows({
  children,
  className,
}: React.ComponentProps<"div">) {
  return <div className={cn("divide-y", className)}>{children}</div>;
}

export function LedgerRow({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("px-5 py-4", className)} {...props}>
      {children}
    </div>
  );
}

type LedgerFeatureItem = {
  title: string;
  body: string;
  icon: LucideIcon;
  action?: React.ReactNode;
};

type LedgerFeatureRowsProps = Omit<React.ComponentProps<"div">, "children"> & {
  items: LedgerFeatureItem[];
};

export function LedgerFeatureRows({
  items,
  className,
  ...props
}: LedgerFeatureRowsProps) {
  return (
    <LedgerRows
      className={cn("grid md:grid-cols-2 md:divide-x md:divide-y-0", className)}
      {...props}
    >
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <LedgerRow key={item.title} className="space-y-5">
            <Icon className="size-5 text-brand-mark" />
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-[0.005em] text-brand-ink">
                {item.title}
              </h2>
              <p className="text-sm font-normal leading-6 text-muted-foreground">
                {item.body}
              </p>
            </div>
            {item.action}
          </LedgerRow>
        );
      })}
    </LedgerRows>
  );
}

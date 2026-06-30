import { AbstractShapeBackground } from "@/components/app/abstract-shape-background";
import { SiteFooter } from "@/components/app/site-footer";
import { cn } from "@/lib/utils";

type PublicPoolShellProps = {
  poolName: string;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: string;
  descriptionClassName?: string;
  scoreRefreshLabel?: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
};

export function PublicPoolShell({
  eyebrow = "Public pool",
  title,
  description,
  descriptionClassName,
  scoreRefreshLabel,
  meta,
  children,
}: PublicPoolShellProps) {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-background">
      <AbstractShapeBackground />

      <div className="relative z-10 mx-auto flex w-full max-w-[1268px] flex-col gap-7 px-4 py-5 sm:px-5 md:gap-9 md:px-6 md:py-8">
        <section className="grid gap-5 py-3 md:grid-cols-[minmax(0,1fr)_20rem] md:items-end md:gap-6 md:py-8">
          <div className="max-w-3xl">
            {eyebrow ? (
              <p className="mb-3 text-xs font-bold uppercase tracking-normal text-brand-mark sm:mb-4 sm:text-sm">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="text-[clamp(2.125rem,10vw,4.5rem)] font-normal leading-[1.08] text-brand-ink sm:leading-[1.04]">
              {title}
            </h1>
            {description ? (
              <p
                className={cn(
                  "mt-4 max-w-2xl text-[0.9375rem] font-normal leading-6 text-muted-foreground sm:mt-5 sm:text-base",
                  descriptionClassName,
                )}
              >
                {description}
              </p>
            ) : null}
          </div>
          {meta ? <aside className="grid gap-3">{meta}</aside> : null}
        </section>
        {children}
        {scoreRefreshLabel ? (
          <p className="pb-2 text-center text-[0.6875rem] font-normal leading-4 text-muted-foreground/70">
            Scores refreshed {scoreRefreshLabel}
          </p>
        ) : null}
      </div>
      <SiteFooter />
    </main>
  );
}

type PublicPoolMetaCardProps = React.ComponentProps<"div"> & {
  label: string;
  value?: React.ReactNode;
  valueClassName?: string;
};

export function PublicPoolMetaCard({
  label,
  value,
  valueClassName,
  className,
  children,
  ...props
}: PublicPoolMetaCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-surface-paper p-4 text-card-foreground shadow-[0_20px_60px_color-mix(in_oklch,black,transparent_82%)]",
        className,
      )}
      {...props}
    >
      <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground sm:text-sm">
        {label}
      </p>
      {value ? (
        <p
          className={cn(
            "mt-2 text-lg font-semibold leading-tight text-brand-ink sm:text-xl",
            valueClassName,
          )}
        >
          {value}
        </p>
      ) : null}
      {children}
    </div>
  );
}

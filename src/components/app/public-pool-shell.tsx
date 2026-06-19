import { AbstractShapeBackground } from "@/components/app/abstract-shape-background";
import { SiteFooter } from "@/components/app/site-footer";
import { cn } from "@/lib/utils";

type PublicPoolShellProps = {
  poolName: string;
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
};

export function PublicPoolShell({
  eyebrow = "Public pool",
  title,
  description,
  meta,
  children,
}: PublicPoolShellProps) {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-background">
      <AbstractShapeBackground />

      <div className="relative z-10 mx-auto flex w-full max-w-[1268px] flex-col gap-8 px-6 py-6 md:gap-9 md:py-8">
        <section className="grid gap-6 py-4 md:grid-cols-[minmax(0,1fr)_20rem] md:items-end md:py-8">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-bold uppercase tracking-normal text-brand-mark">
              {eyebrow}
            </p>
            <h1 className="text-[clamp(2.75rem,6vw,4.5rem)] font-normal leading-[1.02] text-brand-ink">
              {title}
            </h1>
            {description ? (
              <p className="mt-5 max-w-2xl text-base font-normal leading-6 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {meta ? <aside className="grid gap-3">{meta}</aside> : null}
        </section>
        {children}
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
      <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
        {label}
      </p>
      {value ? (
        <p
          className={cn(
            "mt-2 text-xl font-semibold leading-tight text-brand-ink",
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

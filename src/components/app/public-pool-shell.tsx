import { AbstractShapeBackground } from "@/components/app/abstract-shape-background";
import { LiveScoreRefresh } from "@/components/app/live-score-refresh";
import { SiteFooter } from "@/components/app/site-footer";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type PublicPoolShellProps = {
  poolName: string;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: string;
  descriptionClassName?: string;
  scoreRefreshLabel?: string;
  scoreRefreshSource?: string;
  liveScoreMatchDates?: string[];
  picksSubmitted?: boolean;
  editPicksHref?: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
};

export function PublicPoolShell({
  eyebrow = "Public pool",
  title,
  description,
  descriptionClassName,
  scoreRefreshLabel,
  scoreRefreshSource,
  liveScoreMatchDates,
  picksSubmitted = false,
  editPicksHref,
  meta,
  children,
}: PublicPoolShellProps) {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-background">
      <AbstractShapeBackground />

      <div className="relative z-10 flex w-full flex-col gap-7 px-4 py-5 sm:px-5 md:gap-9 md:py-8 lg:px-[43px]">
        {picksSubmitted ? (
          <div
            className="flex items-start gap-3 border border-brand-success/30 bg-cta-green-soft px-4 py-3 text-brand-ink"
            role="status"
          >
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-success" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Your picks are in.</p>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                Your predictions have been saved. You can update them until the pool locks.
              </p>
            </div>
            {editPicksHref ? (
              <Button asChild className="shrink-0" size="sm" variant="secondaryGreen">
                <Link href={editPicksHref}>Edit picks</Link>
              </Button>
            ) : null}
          </div>
        ) : null}
        <section className="grid gap-5 py-3 md:grid-cols-[minmax(0,1fr)_20rem] md:items-end md:gap-6 md:py-8">
          <div className="max-w-3xl">
            {eyebrow ? (
              <p className="mb-3 text-xs font-bold uppercase tracking-normal text-brand-mark sm:mb-4 sm:text-sm">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="display-heading-xl">{title}</h1>
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
        <PublicPoolScoreRefresh
          liveScoreMatchDates={liveScoreMatchDates}
          scoreRefreshLabel={scoreRefreshLabel}
          scoreRefreshSource={scoreRefreshSource}
        />
      </div>
      <SiteFooter />
    </main>
  );
}

type PublicPoolScoreRefreshProps = {
  scoreRefreshLabel?: string;
  scoreRefreshSource?: string;
  liveScoreMatchDates?: string[];
};

export function PublicPoolScoreRefresh({
  scoreRefreshLabel,
  scoreRefreshSource,
  liveScoreMatchDates,
}: PublicPoolScoreRefreshProps) {
  return (
    <>
      {liveScoreMatchDates ? (
        <LiveScoreRefresh matchDates={liveScoreMatchDates} />
      ) : null}
      {scoreRefreshLabel ? (
        <div className="pb-2 text-center text-[0.6875rem] font-normal leading-4 text-muted-foreground/70">
          <p>
            Scores updated {scoreRefreshLabel}
            {scoreRefreshSource ? ` from ${scoreRefreshSource}` : ""}
          </p>
        </div>
      ) : null}
    </>
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
        "border border-border/65 bg-surface-paper p-4 text-card-foreground",
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

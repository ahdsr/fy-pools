import { AbstractShapeBackground } from "@/components/app/abstract-shape-background";
import { LedgerPanel } from "@/components/app/ledger";
import { SiteFooter } from "@/components/app/site-footer";
import { cn } from "@/lib/utils";

type RouteLoadingScreenProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
};

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/80", className)}
      aria-hidden="true"
    />
  );
}

export function RouteLoadingScreen({
  eyebrow = "PoolWaffle",
  title = "Private sports pool hosting for serious commissioners.",
  description = "PoolWaffle helps you launch polished office pools and private sports contests without rebuilding spreadsheets every season.",
}: RouteLoadingScreenProps) {
  return (
    <main
      className="relative isolate min-h-screen overflow-hidden bg-background"
      aria-busy="true"
      aria-live="polite"
    >
      <AbstractShapeBackground />

      <div className="relative z-10 mx-auto flex w-full max-w-[1268px] flex-col gap-7 px-4 py-5 sm:px-5 md:gap-9 md:px-6 md:py-8">
        <section className="py-3 md:py-8">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-normal text-brand-mark sm:mb-4 sm:text-sm">
              {eyebrow}
            </p>
            <h1 className="display-heading-xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-[0.9375rem] font-normal leading-6 text-muted-foreground sm:mt-5 sm:text-base">
              {description}
            </p>
          </div>
        </section>

        <LedgerPanel
          title="Preparing page"
          description="The page will appear as soon as the data is ready."
        >
          <div className="grid gap-4 p-5">
            <div className="grid gap-3 md:grid-cols-3">
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-24" />
            </div>
            <div className="grid gap-3">
              <SkeletonBlock className="h-12" />
              <SkeletonBlock className="h-12" />
              <SkeletonBlock className="h-12" />
              <SkeletonBlock className="h-12" />
            </div>
          </div>
        </LedgerPanel>
      </div>
      <SiteFooter />
    </main>
  );
}

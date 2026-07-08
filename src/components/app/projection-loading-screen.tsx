import { LedgerPanel } from "@/components/app/ledger";
import { AbstractShapeBackground } from "@/components/app/abstract-shape-background";

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted/80 ${className}`}
      aria-hidden="true"
    />
  );
}

export function ProjectionLoadingScreen() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-background">
      <AbstractShapeBackground />

      <div className="relative z-10 mx-auto flex w-full max-w-[1268px] flex-col gap-7 px-4 py-5 sm:px-5 md:gap-9 md:px-6 md:py-8">
        <section className="py-3 md:py-8">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-normal text-brand-mark sm:mb-4 sm:text-sm">
              Projections
            </p>
            <h1 className="display-heading-xl">Who can still pass #1?</h1>
            <p className="mt-4 max-w-2xl text-[0.9375rem] font-normal leading-6 text-muted-foreground sm:mt-5 sm:text-base">
              Best current finish scenarios based on everyone&apos;s remaining picks.
            </p>
          </div>
        </section>

        <LedgerPanel
          title="Finding the best route"
          description="Checking remaining picks, shared scoring events, and projected rank changes."
        >
          <div className="grid gap-4 p-5">
            <div className="grid gap-3 md:grid-cols-3">
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-24" />
            </div>
            <div className="grid gap-3">
              <SkeletonBlock className="h-14" />
              <SkeletonBlock className="h-14" />
              <SkeletonBlock className="h-14" />
            </div>
          </div>
        </LedgerPanel>

        <LedgerPanel
          title="Pool projections"
          description="Preparing the projection table."
        >
          <div className="grid gap-3 p-5">
            <SkeletonBlock className="h-10" />
            <SkeletonBlock className="h-10" />
            <SkeletonBlock className="h-10" />
            <SkeletonBlock className="h-10" />
          </div>
        </LedgerPanel>
      </div>
    </main>
  );
}

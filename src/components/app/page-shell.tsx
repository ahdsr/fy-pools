import { AbstractShapeBackground } from "@/components/app/abstract-shape-background";
import { DashboardHeader } from "@/components/app/mock-auth";
import { SiteFooter } from "@/components/app/site-footer";

type PageShellProps = {
  eyebrow?: string;
  title: string;
  description: string;
  children: React.ReactNode;
  backHref?: string;
  heroAction?: React.ReactNode;
  status?: string;
  topContent?: React.ReactNode;
  showHeader?: boolean;
};

export function PageShell({
  eyebrow,
  title,
  description,
  children,
  heroAction,
  topContent,
  showHeader = true,
}: PageShellProps) {
  return (
    <>
      {showHeader ? <DashboardHeader /> : null}

      <main className="relative isolate min-h-screen overflow-hidden bg-background">
        <AbstractShapeBackground />

        <div className="relative z-10 mx-auto flex w-full max-w-[1268px] flex-col gap-7 px-4 py-5 sm:px-5 md:gap-9 md:px-6 md:py-8">
          {topContent ? <div>{topContent}</div> : null}
          <section className="py-9 md:py-16">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
              <div className="prose flex max-w-[625px] flex-col prose-h1:my-0 prose-h1:text-[clamp(2.125rem,10vw,3.5rem)] prose-h1:font-normal prose-h1:leading-[1.1] prose-h1:tracking-normal prose-h1:text-brand-ink prose-p:mb-0 prose-p:mt-5 prose-p:max-w-[625px] prose-p:text-[0.9375rem] prose-p:font-normal prose-p:leading-6 prose-p:text-foreground/80 sm:prose-p:mt-7 sm:prose-p:text-base md:prose-h1:leading-[1.14]">
                {eyebrow ? (
                  <p className="not-prose mb-3 text-xs font-bold uppercase tracking-normal text-brand-hot sm:mb-4 sm:text-sm">
                    {eyebrow}
                  </p>
                ) : null}
                <h1>{title}</h1>
                <p>{description}</p>
              </div>
              {heroAction ? (
                <div className="flex shrink-0 lg:pb-1">{heroAction}</div>
              ) : null}
            </div>
          </section>
          {children}
        </div>
        <SiteFooter />
      </main>
    </>
  );
}

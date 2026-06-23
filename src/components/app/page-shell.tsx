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

        <div className="relative z-10 mx-auto flex w-full max-w-[1268px] flex-col gap-8 px-6 py-6 md:gap-9 md:py-8">
          {topContent ? <div>{topContent}</div> : null}
          <section className="py-14 md:py-16">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="prose flex max-w-[625px] flex-col prose-h1:my-0 prose-h1:text-[clamp(2.75rem,6vw,3.5rem)] prose-h1:font-normal prose-h1:leading-[1.14] prose-h1:tracking-[-0.02em] prose-h1:text-brand-ink prose-p:mb-0 prose-p:mt-8 prose-p:max-w-[625px] prose-p:text-base prose-p:font-light prose-p:leading-[1.4375rem] prose-p:text-foreground/80">
                {eyebrow ? (
                  <p className="not-prose mb-4 text-sm font-bold uppercase tracking-normal text-brand-hot">
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

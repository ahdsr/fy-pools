import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AbstractShapeBackground } from "@/components/app/abstract-shape-background";
import { BrandWordmark } from "@/components/app/brand";

type PageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  backHref?: string;
  status?: string;
};

export function PageShell({
  eyebrow,
  title,
  description,
  children,
  backHref = "/dashboard",
  status = "Placeholder",
}: PageShellProps) {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-background">
      <AbstractShapeBackground />
      <header className="sticky top-0 z-50 w-full bg-accent text-accent-foreground">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <BrandWordmark className="[&_[aria-hidden=true]]:border-white/15 [&_[aria-hidden=true]]:bg-white [&_[aria-hidden=true]]:text-black [&_span]:text-white" />
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              className="text-white hover:bg-white/10 hover:text-white"
            >
              <Link href={backHref}>
                <ArrowLeft />
                Back
              </Link>
            </Button>
            <Badge className="border-white/15 bg-white/10 text-white">
              {status}
            </Badge>
          </div>
        </nav>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-6 md:gap-9 md:py-8">
        <section className="py-12 md:py-20">
          <div className="prose flex max-w-xl flex-col prose-h1:my-0 prose-h1:text-5xl prose-h1:font-black prose-h1:leading-[0.98] prose-h1:tracking-[-0.02em] prose-h1:text-brand-ink prose-p:mb-0 prose-p:mt-8 prose-p:max-w-2xl prose-p:text-base prose-p:font-normal prose-p:leading-7 prose-p:text-foreground/75 md:prose-h1:text-6xl">
            <p className="not-prose mb-4 text-sm font-bold uppercase tracking-normal text-brand-hot">
              {eyebrow}
            </p>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </section>
        {children}
      </div>
    </main>
  );
}

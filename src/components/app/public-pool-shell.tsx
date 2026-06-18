import Link from "next/link";

import { AbstractShapeBackground } from "@/components/app/abstract-shape-background";
import { BrandWordmark } from "@/components/app/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PublicPoolShellProps = {
  poolName: string;
  poolSlug: string;
  active: "overview" | "leaderboard" | "projections" | "entry";
  eyebrow?: string;
  title: string;
  description: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
};

const navItems = [
  { key: "overview", label: "Overview", href: "" },
  { key: "leaderboard", label: "Leaderboard", href: "/leaderboard" },
  { key: "projections", label: "Projections", href: "/projections" },
] as const;

export function PublicPoolShell({
  poolName,
  poolSlug,
  active,
  eyebrow = "Public pool",
  title,
  description,
  meta,
  children,
}: PublicPoolShellProps) {
  const baseHref = `/pools/${poolSlug}`;

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-background">
      <AbstractShapeBackground />
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-accent text-accent-foreground">
        <nav className="flex min-h-20 w-full flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-[43px]">
          <div className="flex items-center justify-between gap-4">
            <BrandWordmark className="[&_[aria-hidden=true]]:border-white/15 [&_[aria-hidden=true]]:bg-white [&_[aria-hidden=true]]:text-black [&_span]:text-white" />
            <Badge className="border-white/15 bg-white/10 text-white md:hidden">
              Public
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-white/15 bg-white/10 p-1">
              {navItems.map((item) => (
                <Link
                  key={item.key}
                  href={`${baseHref}${item.href}`}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium text-white/78 transition-colors hover:bg-white/10 hover:text-white",
                    active === item.key && "bg-white text-accent hover:bg-white hover:text-accent",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <Button
              asChild
              variant="ghost"
              className="text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild variant="primaryGreen">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </nav>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-[1268px] flex-col gap-8 px-6 py-6 md:gap-9 md:py-8">
        <section className="overflow-hidden rounded-lg border border-black/5 bg-surface-paper shadow-[0_20px_60px_color-mix(in_oklch,black,transparent_82%)]">
          <div
            className="min-h-[20rem] bg-cover bg-center"
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgb(0 0 0 / 0.72), rgb(0 0 0 / 0.34) 52%, rgb(0 0 0 / 0.08)), url(https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=1600&q=80)",
            }}
          >
            <div className="grid min-h-[20rem] gap-8 p-6 text-white md:grid-cols-[minmax(0,1fr)_20rem] md:p-8 lg:p-10">
              <div className="flex max-w-3xl flex-col justify-end">
                <p className="mb-4 text-sm font-bold uppercase tracking-normal text-cta-green">
                  {eyebrow}
                </p>
                <h1 className="text-[clamp(2.75rem,6vw,4.5rem)] font-normal leading-[1.02] tracking-[-0.02em]">
                  {title}
                </h1>
                <p className="mt-5 max-w-2xl text-base font-light leading-6 text-white/82">
                  {description}
                </p>
              </div>
              <aside className="grid content-end gap-3">
                <div className="rounded-lg border border-white/18 bg-black/30 p-4 backdrop-blur-md">
                  <p className="text-sm font-medium uppercase tracking-normal text-white/62">
                    Pool
                  </p>
                  <p className="mt-2 text-2xl font-semibold leading-tight text-white">
                    {poolName}
                  </p>
                </div>
                {meta}
              </aside>
            </div>
          </div>
        </section>
        {children}
      </div>
    </main>
  );
}

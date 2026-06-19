import Link from "next/link";

import { BrandWordmark } from "@/components/app/brand";
import { cn } from "@/lib/utils";

type SiteFooterProps = React.ComponentProps<"footer">;

const footerGroups = [
  {
    title: "Build",
    links: [
      { label: "Pool templates", href: "/dashboard/templates" },
      { label: "Create a pool", href: "/dashboard/pools" },
      { label: "Upload spreadsheet", href: "/upload-your-own" },
    ],
  },
  {
    title: "Run",
    links: [
      { label: "Workspace", href: "/dashboard" },
      {
        label: "Sample public pool",
        href: "/pools/marcins-2026-world-cup-pool",
      },
      {
        label: "Sample standings",
        href: "/pools/marcins-2026-world-cup-pool#leaderboard",
      },
    ],
  },
] as const;

export function SiteFooter({ className, ...props }: SiteFooterProps) {
  return (
    <footer
      className={cn(
        "relative z-10 border-t border-brand-rule/45 bg-surface-paper/92",
        className,
      )}
      {...props}
    >
      <div className="mx-auto grid w-full max-w-[1268px] gap-8 px-6 py-8 md:grid-cols-[minmax(0,1fr)_auto] md:py-10">
        <div className="max-w-xl space-y-4">
          <BrandWordmark />
          <p className="text-sm font-normal leading-6 text-muted-foreground">
            Private sports pool hosting for commissioners who need clean picks,
            locked entries, trusted scoring, and public standings.
          </p>
          <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
            Copyright 2026 PoolWaffle
          </p>
        </div>

        <nav
          aria-label="Footer navigation"
          className="grid gap-8 sm:grid-cols-2 md:min-w-[24rem]"
        >
          {footerGroups.map((group) => (
            <div key={group.title} className="space-y-3">
              <p className="text-sm font-semibold text-brand-ink">
                {group.title}
              </p>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm font-normal text-muted-foreground transition-colors hover:text-brand-hot"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </footer>
  );
}

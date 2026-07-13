import Link from "next/link";

import { BrandWordmark } from "@/components/app/brand";
import { cn } from "@/lib/utils";
import { WORLD_CUP_REFERENCE_LINKS } from "@/lib/world-cup-pool/reference-urls";

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
  {
    title: "References",
    links: WORLD_CUP_REFERENCE_LINKS,
  },
] as const;

export function SiteFooter({ className, ...props }: SiteFooterProps) {
  return (
    <footer
      className={cn(
        "relative z-10 shrink-0 border-t border-brand-rule/45 bg-surface-paper/92",
        className,
      )}
      {...props}
    >
      <div className="mx-auto flex w-full max-w-[1268px] flex-col gap-8 px-6 py-8 md:py-10">
        <nav
          aria-label="Footer navigation"
          className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
        >
          {footerGroups.map((group) => (
            <div key={group.title} className="space-y-3">
              <p className="text-sm font-semibold text-brand-ink">
                {group.title}
              </p>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    {link.href.startsWith("http") ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-normal text-muted-foreground transition-colors hover:text-brand-hot"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm font-normal text-muted-foreground transition-colors hover:text-brand-hot"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="max-w-xl space-y-4 border-t border-brand-rule/45 pt-8">
          <BrandWordmark />
          <p className="text-sm font-normal leading-6 text-muted-foreground">
            Private sports pool hosting for commissioners who need clean picks,
            locked entries, trusted scoring, and public standings.
          </p>
          <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
            Copyright 2026 PoolWaffle
          </p>
        </div>
      </div>
    </footer>
  );
}

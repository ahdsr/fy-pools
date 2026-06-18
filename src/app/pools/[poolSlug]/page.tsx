import Link from "next/link";
import { BarChart3, ClipboardList, Settings } from "lucide-react";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { PageShell } from "@/components/app/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type PoolPageProps = {
  params: Promise<{ poolSlug: string }>;
};

export default async function PoolPage({ params }: PoolPageProps) {
  const { poolSlug } = await params;

  return (
    <PageShell
      eyebrow="Pool home"
      title={poolSlug.replaceAll("-", " ")}
      description="A branded pool hub for players and commissioners to understand the next action quickly."
      backHref="/dashboard/pools"
    >
      <LedgerPanel
        title="Pool workspace"
        description="Three surfaces carry most of the MVP experience."
      >
        <LedgerRows className="grid md:grid-cols-3 md:divide-x md:divide-y-0">
        {[
          {
            title: "Leaderboard",
            body: "Current standings and score breakdowns.",
            href: `/pools/${poolSlug}/leaderboard`,
            icon: BarChart3,
          },
          {
            title: "Make picks",
            body: "Player pick entry flow and validation.",
            href: `/pools/${poolSlug}/make-picks`,
            icon: ClipboardList,
          },
          {
            title: "Commissioner",
            body: "Admin controls, invites, locks, and overrides.",
            href: `/pools/${poolSlug}/commissioner`,
            icon: Settings,
          },
        ].map((item) => (
          <LedgerRow key={item.title} className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <item.icon className="size-5 text-brand-mark" />
                <Badge variant="outline">Open</Badge>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-[0.005em] text-brand-ink">
                  {item.title}
                </h2>
              <p className="text-base font-normal leading-7 text-muted-foreground">
                {item.body}
              </p>
              </div>
              <Button asChild variant="outline">
                <Link href={item.href}>Open</Link>
              </Button>
          </LedgerRow>
        ))}
        </LedgerRows>
      </LedgerPanel>
    </PageShell>
  );
}

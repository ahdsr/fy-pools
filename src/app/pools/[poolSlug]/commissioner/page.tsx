import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { PageShell } from "@/components/app/page-shell";
import { PlaceholderGrid } from "@/components/app/placeholder-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CommissionerPageProps = {
  params: Promise<{ poolSlug: string }>;
};

export default async function CommissionerPage({
  params,
}: CommissionerPageProps) {
  const { poolSlug } = await params;

  return (
    <PageShell
      eyebrow="Commissioner controls"
      title="Commissioner"
      description="A calm admin ledger for setup, invites, locks, scoring, and audit history."
      backHref={`/pools/${poolSlug}`}
    >
      <LedgerPanel
        title="Pool setup snapshot"
        description="Commissioners should see the pool's operating state at a glance."
      >
        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pool-name">Pool name</Label>
            <Input id="pool-name" value="Sample pool" readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-code">Invite code</Label>
            <Input id="invite-code" value="FY-2026" readOnly />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="commissioner-note">Commissioner note</Label>
            <Textarea
              id="commissioner-note"
              value="Payment handling is outside the player join flow for MVP."
              readOnly
            />
          </div>
          <Button disabled>Publish controls come next</Button>
        </div>
      </LedgerPanel>
      <LedgerPanel title="Setup ledger">
        <LedgerRows className="grid md:grid-cols-3 md:divide-x md:divide-y-0">
          {["Invite players", "Review lock rules", "Confirm scoring"].map(
            (item) => (
              <LedgerRow key={item}>
                <p className="font-medium text-brand-ink">{item}</p>
                <p className="mt-1 text-base font-normal text-muted-foreground">
                  Ready for the next implementation pass.
                </p>
              </LedgerRow>
            ),
          )}
        </LedgerRows>
      </LedgerPanel>
      <PlaceholderGrid
        items={[
          {
            title: "Members",
            body: "Invite, remove, and assign commissioner/player roles.",
          },
          {
            title: "Overrides",
            body: "Manual corrections should create audit events and explainable score deltas.",
          },
          {
            title: "Exports",
            body: "CSV exports should cover entries, picks, standings, and payout tracking.",
          },
        ]}
      />
    </PageShell>
  );
}

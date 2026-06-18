import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { PageShell } from "@/components/app/page-shell";
import { PlaceholderGrid } from "@/components/app/placeholder-grid";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type MakePicksPageProps = {
  params: Promise<{ poolSlug: string }>;
};

export default async function MakePicksPage({ params }: MakePicksPageProps) {
  const { poolSlug } = await params;

  return (
    <PageShell
      eyebrow="Player entry"
      title="Make picks"
      description="A large, legible pick-entry flow with clear draft status and lock timing."
      backHref={`/pools/${poolSlug}`}
    >
      <div className="grid gap-5 lg:grid-cols-[16rem_1fr_18rem]">
        <LedgerPanel title="Steps">
          <LedgerRows>
            {["Group picks", "Knockout picks", "Bonus questions"].map(
              (step, index) => (
                <LedgerRow
                  key={step}
                  className="flex items-center gap-3"
                >
                  <span className="grid size-7 place-items-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <span className="font-medium text-brand-ink">{step}</span>
                </LedgerRow>
              ),
            )}
          </LedgerRows>
        </LedgerPanel>
        <LedgerPanel
          title="Sample pick controls"
          description="Template fields will drive these controls."
        >
          <div className="grid gap-5 p-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Group winner</Label>
              <Select disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sample-team">Sample team</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="series-score">Series score</Label>
              <Input id="series-score" placeholder="4-2" disabled />
            </div>
            <div className="flex items-end gap-2">
              <Checkbox id="locked" disabled />
              <Label htmlFor="locked">Locked after deadline</Label>
            </div>
          </div>
        </LedgerPanel>
        <LedgerPanel title="Draft status">
          <LedgerRows>
            <LedgerRow>
              <p className="text-base font-normal text-muted-foreground">
                Missing picks
              </p>
              <p className="text-2xl font-semibold text-brand-ink">3</p>
            </LedgerRow>
            <LedgerRow>
              <p className="text-base font-normal text-muted-foreground">
                Locks
              </p>
              <p className="font-semibold text-brand-ink">Jun 10</p>
            </LedgerRow>
            <LedgerRow>
              <Button className="w-full" disabled>
                Save draft comes next
              </Button>
            </LedgerRow>
          </LedgerRows>
        </LedgerPanel>
      </div>
      <PlaceholderGrid
        items={[
          {
            title: "Drafts",
            body: "Players should save progress before the lock deadline.",
          },
          {
            title: "Validation",
            body: "Template fields decide required picks, option sets, and legal score ranges.",
          },
          {
            title: "Reveal policy",
            body: "Hidden picks remain private until their configured lock moment.",
          },
        ]}
      />
    </PageShell>
  );
}

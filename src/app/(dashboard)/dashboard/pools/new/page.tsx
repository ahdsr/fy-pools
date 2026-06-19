import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { PageShell } from "@/components/app/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAllTemplates } from "@/lib/templates/catalog";

const setupSteps = [
  "Confirm pool name and event dates",
  "Choose pick fields and scoring rules",
  "Set lock windows and invite players",
];

type NewPoolPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function NewPoolPage({ searchParams }: NewPoolPageProps) {
  const params = await searchParams;
  const selectedTemplate = Array.isArray(params.template)
    ? params.template[0]
    : params.template;
  const template = getAllTemplates().find(
    (item) => item.slug === selectedTemplate,
  );
  const templateName = selectedTemplate
    ? template?.name ?? "Selected template"
    : "Choose a template";
  const categoryName = template?.category.name;

  return (
    <PageShell
      eyebrow="Pool wizard"
      title="Set up your pool"
      description="This is the first step of the pool creation flow. The selected template is carried in so setup can start from a proven format."
      backHref="/dashboard/pools"
      status="Wizard"
      showHeader={false}
    >
      <LedgerPanel
        title="Wizard start"
        description="The full form can build from this shell: template selection, pool details, scoring, locks, and invitations."
        action={
          <Badge variant="secondary">
            {categoryName ? `${categoryName} / ${templateName}` : templateName}
          </Badge>
        }
      >
        <div className="grid gap-6 p-5 lg:grid-cols-[1fr_0.8fr]">
          <div className="space-y-4">
            <div className="rounded-lg border bg-background p-5">
              <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
                Selected format
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-[0.005em] text-brand-ink">
                {templateName}
              </h2>
              <p className="mt-3 text-sm font-normal leading-6 text-muted-foreground">
                Commissioners land here after choosing a pool card. Next, this
                page can collect the pool name, event dates, scoring settings,
                and invite rules.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg">
                Continue setup <ArrowRight />
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/dashboard/pools">Change template</Link>
              </Button>
            </div>
          </div>

          <LedgerRows className="overflow-hidden rounded-lg border">
            {setupSteps.map((step, index) => (
              <LedgerRow key={step} className="flex items-center gap-3">
                <CheckCircle2 className="size-5 text-brand-success" />
                <div>
                  <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
                    Step {index + 1}
                  </p>
                  <p className="font-medium text-brand-ink">{step}</p>
                </div>
              </LedgerRow>
            ))}
          </LedgerRows>
        </div>
      </LedgerPanel>
    </PageShell>
  );
}

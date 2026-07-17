import type { Metadata } from "next";
import { Mail, Sparkles } from "lucide-react";

import { LedgerPanel, LedgerRow } from "@/components/app/ledger";
import { PageShell } from "@/components/app/page-shell";
import { Button } from "@/components/ui/button";
import { SUPPORT_EMAIL, earlyAccessMailto, supportMailto } from "@/lib/site-contact";

export const metadata: Metadata = {
  title: "Contact PoolWaffle",
  description: "Contact PoolWaffle for closed-beta support or early access to upcoming pool formats.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <PageShell
      eyebrow="Closed beta support"
      title="Questions, feedback, or an upcoming pool format?"
      description="Email PoolWaffle for account help, beta feedback, event-format requests, or help moving a spreadsheet-based pool online."
    >
      <section className="grid gap-5 lg:grid-cols-2">
        <LedgerPanel title="Get in touch" description="We read every message during the beta.">
          <LedgerRow className="space-y-4">
            <a className="inline-flex items-center gap-2 text-lg font-semibold text-brand-hot hover:underline" href={supportMailto()}>
              <Mail className="size-5" aria-hidden="true" />
              {SUPPORT_EMAIL}
            </a>
            <p className="text-sm leading-6 text-muted-foreground">
              Include your pool name, the email you use to sign in, and a short description of the issue so we can help quickly.
            </p>
            <Button asChild variant="primaryGreen">
              <a href={supportMailto()}>Email support</a>
            </Button>
          </LedgerRow>
        </LedgerPanel>
        <LedgerPanel title="Early access" description="Tell us what you want to run next.">
          <LedgerRow className="space-y-4">
            <p className="text-sm leading-6 text-muted-foreground">
              We are collecting interest in spreadsheet conversion and upcoming pool formats while the closed beta focuses on the formats available today.
            </p>
            <Button asChild variant="outline">
              <a href={earlyAccessMailto("a future pool format or spreadsheet conversion")}>
                <Sparkles aria-hidden="true" /> Request early access
              </a>
            </Button>
          </LedgerRow>
        </LedgerPanel>
      </section>
    </PageShell>
  );
}

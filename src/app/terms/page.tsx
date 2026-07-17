import type { Metadata } from "next";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { PageShell } from "@/components/app/page-shell";
import { LEGAL_EFFECTIVE_DATE, SUPPORT_EMAIL, supportMailto } from "@/lib/site-contact";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The closed-beta terms for using PoolWaffle to host and participate in sports pools.",
  alternates: { canonical: "/terms" },
};

const sections = [
  {
    title: "Closed beta service",
    body: "PoolWaffle is an early, closed-beta service for running private sports pools. Features, formats, availability, and access may change or end while we test and improve the product.",
  },
  {
    title: "Using PoolWaffle",
    body: "Use PoolWaffle only for lawful private sports-pool activities. You are responsible for the accuracy of the information you enter, protecting your account, and following the rules that apply to your group or event.",
  },
  {
    title: "Commissioners and participants",
    body: "Commissioners are responsible for their pool rules, invitations, prizes, and communications with participants. PoolWaffle does not run, sponsor, or guarantee any pool, prize, or agreement between a commissioner and participants.",
  },
  {
    title: "Content and shared pages",
    body: "Do not submit unlawful, infringing, abusive, or sensitive content. You are responsible for deciding what pool information is shared with participants or shown on a published pool page.",
  },
  {
    title: "Service limits",
    body: "The beta is provided as available. Sports data, scoring, schedules, and integrations can be delayed, incomplete, or unavailable. Back up any information that is important to you and review pool results before relying on them.",
  },
  {
    title: "Changes and access",
    body: "We may update these terms, change the service, or suspend access when needed to operate the beta, protect users, or address misuse. Continued use after an update means you accept the updated terms.",
  },
] as const;

export default function TermsPage() {
  return (
    <PageShell
      eyebrow="Closed beta"
      title="Terms of Use"
      description={`Effective ${LEGAL_EFFECTIVE_DATE}. These product terms set expectations for using PoolWaffle during the beta.`}
    >
      <LedgerPanel title="Using PoolWaffle responsibly">
        <LedgerRows>
          {sections.map((section) => (
            <LedgerRow key={section.title} className="space-y-2">
              <h2 className="text-lg font-semibold text-brand-ink">{section.title}</h2>
              <p className="text-sm leading-6 text-muted-foreground">{section.body}</p>
            </LedgerRow>
          ))}
        </LedgerRows>
      </LedgerPanel>
      <p className="text-sm leading-6 text-muted-foreground">
        Questions about these terms?{" "}
        <a className="font-semibold text-brand-hot hover:underline" href={supportMailto({ subject: "PoolWaffle terms question" })}>
          Email {SUPPORT_EMAIL}
        </a>
        .
      </p>
    </PageShell>
  );
}

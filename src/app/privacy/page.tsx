import type { Metadata } from "next";

import { LedgerPanel, LedgerRow, LedgerRows } from "@/components/app/ledger";
import { PageShell } from "@/components/app/page-shell";
import { LEGAL_EFFECTIVE_DATE, SUPPORT_EMAIL, supportMailto } from "@/lib/site-contact";

export const metadata: Metadata = {
  title: "Privacy Notice",
  description: "How PoolWaffle handles account, pool, pick, and support information during the closed beta.",
  alternates: { canonical: "/privacy" },
};

const sections = [
  {
    title: "What we handle",
    body: "PoolWaffle handles account details such as your name and email address, plus the pool details, invitations, picks, scoring information, and support messages needed to run a pool.",
  },
  {
    title: "Why we use it",
    body: "We use this information to authenticate accounts, create and operate pools, send you through account-confirmation and password-recovery flows, show standings, and answer support requests. We do not process payments in this closed beta.",
  },
  {
    title: "Service providers",
    body: "PoolWaffle uses Supabase for authentication and database services, Vercel to host the application, Gmail for the support inbox, and sports-data providers to prepare event and result information. Those providers process information only as needed to provide their services.",
  },
  {
    title: "Sharing and public pools",
    body: "Commissioners choose who they invite and whether their published pool pages can be viewed publicly. Do not include personal or sensitive information in pool names, entries, picks, or support messages that you would not want other pool participants to see.",
  },
  {
    title: "Your choices",
    body: "You can ask questions about your account or request help with your information by contacting us. We may retain operational records as needed to run the closed beta, resolve issues, and maintain the integrity of pool results.",
  },
] as const;

export default function PrivacyPage() {
  return (
    <PageShell
      eyebrow="Closed beta"
      title="Privacy Notice"
      description={`Effective ${LEGAL_EFFECTIVE_DATE}. This notice explains the limited information PoolWaffle needs to operate private sports pools during the beta.`}
    >
      <LedgerPanel title="How PoolWaffle handles information">
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
        Questions about this notice?{" "}
        <a className="font-semibold text-brand-hot hover:underline" href={supportMailto({ subject: "PoolWaffle privacy question" })}>
          Email {SUPPORT_EMAIL}
        </a>
        .
      </p>
    </PageShell>
  );
}

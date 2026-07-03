import Link from "next/link";
import { LockKeyhole, ShieldCheck } from "lucide-react";

import { LedgerPanel, LedgerRow } from "@/components/app/ledger";
import { PageShell } from "@/components/app/page-shell";
import { MockSignInForm, MockSignUpForm } from "@/components/app/mock-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getJoinPoolData } from "@/lib/round-of-16/persistence";
import { getSupabaseUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { RoundOf16PickForm } from "./round-of-16-pick-form";

type JoinPageProps = {
  params: Promise<{ inviteCode: string }>;
};

export default async function JoinPage({ params }: JoinPageProps) {
  const { inviteCode } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <PageShell
        eyebrow="Pool invite"
        title="Supabase is not configured"
        description="Participant links require Supabase environment variables before they can load."
        showHeader={false}
      >
        <LedgerPanel title="Missing configuration">
          <LedgerRow>
            <p className="text-sm font-normal leading-6 text-muted-foreground">
              Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
              and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
            </p>
          </LedgerRow>
        </LedgerPanel>
      </PageShell>
    );
  }

  const [joinData, user] = await Promise.all([
    getJoinPoolData(inviteCode),
    getSupabaseUser(),
  ]);

  if (!joinData || joinData.invite.status === "revoked" || joinData.invite.status === "expired") {
    return (
      <PageShell
        eyebrow="Pool invite"
        title="Invite unavailable"
        description="This participant link could not be found or is no longer active."
        showHeader={false}
      >
        <LedgerPanel title="Next step">
          <LedgerRow className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-normal leading-6 text-muted-foreground">
              Ask the commissioner for a fresh invite link.
            </p>
            <Button asChild variant="outline">
              <Link href="/">Back home</Link>
            </Button>
          </LedgerRow>
        </LedgerPanel>
      </PageShell>
    );
  }

  if (!user) {
    const nextPath = `/join/${encodeURIComponent(inviteCode)}`;

    return (
      <PageShell
        eyebrow="Pool invite"
        title={`Join ${joinData.pool.name}`}
        description="Create an account or sign in before submitting your Round of 16 picks."
        showHeader={false}
      >
        <section className="grid gap-5 lg:grid-cols-2">
          <LedgerPanel
            title="Create account"
            description="Use the email address where your commissioner sent the invite."
            action={<Badge variant="secondary">Participant</Badge>}
          >
            <LedgerRow>
              <MockSignUpForm nextPath={nextPath} />
            </LedgerRow>
          </LedgerPanel>
          <LedgerPanel title="Sign in" description="Already have an account?">
            <LedgerRow>
              <MockSignInForm nextPath={nextPath} />
            </LedgerRow>
          </LedgerPanel>
        </section>
      </PageShell>
    );
  }

  if (joinData.existingSubmission) {
    return (
      <PageShell
        eyebrow="Pool invite"
        title={joinData.pool.name}
        description="Your picks have already been submitted for this pool."
        showHeader={false}
      >
        <LedgerPanel
          title="Entry submitted"
          action={<ShieldCheck className="size-5 text-brand-success" />}
        >
          <LedgerRow>
            <p className="font-semibold text-brand-ink">
              Submitted{" "}
              {new Date(
                joinData.existingSubmission.submittedAt,
              ).toLocaleString()}
            </p>
            <p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">
              The commissioner has been notified.
            </p>
          </LedgerRow>
        </LedgerPanel>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Pool invite"
      title={joinData.pool.name}
      description={joinData.pool.settings.basics.description || "Make or update your Round of 16 picks before the pool deadline."}
      showHeader={false}
      heroAction={
        <Badge variant="outline" className="h-auto py-1.5">
          <LockKeyhole /> {joinData.invite.email}
        </Badge>
      }
    >
      <RoundOf16PickForm
        inviteCode={inviteCode}
        poolName={joinData.pool.name}
        settings={joinData.pool.settings}
      />
    </PageShell>
  );
}

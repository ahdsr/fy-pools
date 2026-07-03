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

function UnavailableInvite({
  title,
  description,
  body,
}: {
  title: string;
  description: string;
  body: string;
}) {
  return (
    <PageShell
      eyebrow="Pool invite"
      title={title}
      description={description}
      showHeader={false}
    >
      <LedgerPanel title="Next step">
        <LedgerRow className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-normal leading-6 text-muted-foreground">
            {body}
          </p>
          <Button asChild variant="outline">
            <Link href="/">Back home</Link>
          </Button>
        </LedgerRow>
      </LedgerPanel>
    </PageShell>
  );
}

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

  if (!joinData) {
    return (
      <UnavailableInvite
        title="Invite not found"
        description="This participant link does not match an active pool invite."
        body="Ask the commissioner to check the link or send a fresh invite."
      />
    );
  }

  if (joinData.invite.status === "revoked") {
    return (
      <UnavailableInvite
        title="Invite revoked"
        description="This participant link has been turned off by the commissioner."
        body="Ask the commissioner for a fresh invite link."
      />
    );
  }

  if (joinData.invite.status === "expired") {
    return (
      <UnavailableInvite
        title="Invite expired"
        description="This participant link is no longer active."
        body="Ask the commissioner if picks are still open or request a fresh invite."
      />
    );
  }

  if (
    user &&
    joinData.invite.status === "accepted" &&
    joinData.invite.acceptedBy &&
    joinData.invite.acceptedBy !== user.id
  ) {
    return (
      <UnavailableInvite
        title="Invite already accepted"
        description="This participant link is already tied to another account."
        body="Sign out and use the account that accepted this invite, or ask the commissioner for a new link."
      />
    );
  }

  if (!user) {
    const nextPath = `/join/${encodeURIComponent(inviteCode)}`;

    if (joinData.invite.status === "accepted" && joinData.invite.acceptedBy) {
      return (
        <PageShell
          eyebrow="Pool invite"
          title={`Return to ${joinData.pool.name}`}
          description="This invite has already been accepted. Sign in with the account that accepted it to continue."
          showHeader={false}
        >
          <LedgerPanel title="Sign in">
            <LedgerRow>
              <MockSignInForm nextPath={nextPath} />
            </LedgerRow>
          </LedgerPanel>
        </PageShell>
      );
    }

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

  if (joinData.deadlineHasPassed) {
    return (
      <PageShell
        eyebrow="Pool invite"
        title={joinData.pool.name}
        description="The pick deadline has passed. Round of 16 entries are locked."
        showHeader={false}
      >
        <LedgerPanel
          title={joinData.existingSubmission ? "Entry locked" : "Picks closed"}
          action={<ShieldCheck className="size-5 text-brand-success" />}
        >
          <LedgerRow>
            {joinData.existingSubmission ? (
              <>
                <p className="font-semibold text-brand-ink">
                  Submitted{" "}
                  {new Date(
                    joinData.existingSubmission.submittedAt,
                  ).toLocaleString()}
                </p>
                <p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">
                  Your submitted picks are locked because the deadline has
                  passed.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-brand-ink">
                  No submitted entry found
                </p>
                <p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">
                  The commissioner&apos;s pick deadline has passed, so new
                  entries are closed.
                </p>
              </>
            )}
          </LedgerRow>
        </LedgerPanel>
      </PageShell>
    );
  }

  if (joinData.existingSubmission) {
    return (
      <PageShell
        eyebrow="Pool invite"
        title={joinData.pool.name}
        description="Your picks have been submitted. You can update them until the deadline."
        showHeader={false}
        heroAction={
          <Badge variant="outline" className="h-auto py-1.5">
            <LockKeyhole /> {joinData.invite.email}
          </Badge>
        }
      >
        <LedgerPanel
          title="Entry submitted"
          action={<ShieldCheck className="size-5 text-brand-success" />}
        >
          <LedgerRow>
            <p className="font-semibold text-brand-ink">
              Last submitted{" "}
              {new Date(joinData.existingSubmission.submittedAt).toLocaleString()}
            </p>
            <p className="mt-1 text-sm font-normal leading-6 text-muted-foreground">
              Make changes below and submit again before the deadline.
            </p>
          </LedgerRow>
        </LedgerPanel>
        <RoundOf16PickForm
          inviteCode={inviteCode}
          poolName={joinData.pool.name}
          settings={joinData.pool.settings}
          initialPayload={joinData.existingSubmission.payload}
          existingSubmittedAt={joinData.existingSubmission.submittedAt}
        />
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

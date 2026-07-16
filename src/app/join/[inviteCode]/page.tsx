import Link from "next/link";
import { Suspense } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";

import { LedgerPanel, LedgerRow } from "@/components/app/ledger";
import { PageShell } from "@/components/app/page-shell";
import { MockSignInForm, MockSignUpForm } from "@/components/app/mock-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signInPathFor, signUpPathFor } from "@/lib/auth/paths";
import { getJoinPoolData } from "@/lib/round-of-16/persistence";
import { getNbaJoinPoolData, type NbaJoinData } from "@/lib/nba-series/persistence";
import { getSupabaseUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getKnockoutPoolStageDetails } from "@/lib/templates/round-of-16-draft";
import { RoundOf16PickForm } from "./round-of-16-pick-form";
import { NbaSeriesPickForm } from "./nba-series-pick-form";

type JoinPageProps = {
  params: Promise<{ inviteCode: string }>;
  searchParams: Promise<{ preview?: string }>;
};

export const unstable_instant = {
  prefetch: "runtime",
  samples: [
    {
      params: { inviteCode: "instant-navigation-sample" },
      searchParams: { preview: null },
    },
  ],
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

export default function JoinPage(props: JoinPageProps) {
  return (
    <Suspense fallback={<JoinPageSkeleton />}>
      <JoinPageContent {...props} />
    </Suspense>
  );
}

async function JoinPageContent({ params, searchParams }: JoinPageProps) {
  const { inviteCode } = await params;
  const { preview } = await searchParams;

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

  const [joinData, nbaJoinData, user] = await Promise.all([
    getJoinPoolData(inviteCode),
    getNbaJoinPoolData(inviteCode),
    getSupabaseUser(),
  ]);

  if (nbaJoinData) return <NbaJoinFlow inviteCode={inviteCode} joinData={nbaJoinData} user={user} />;

  if (!joinData) {
    return (
      <UnavailableInvite
        title="Invite not found"
        description="This participant link does not match an active pool invite."
        body="Ask the commissioner to check the link or send a fresh invite."
      />
    );
  }
  const stage = getKnockoutPoolStageDetails(joinData.pool.settings);

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

  const previewNewEntrant =
    joinData.invite.isShareLink &&
    (preview === "new" || preview === "new-entrant");
  const effectiveUser = previewNewEntrant ? null : user;
  const effectiveExistingSubmission = previewNewEntrant
    ? undefined
    : joinData.existingSubmission;
  const localTestEntrantMode =
    process.env.NODE_ENV === "development" &&
    joinData.invite.isShareLink &&
    preview === "test";

  if (localTestEntrantMode) {
    return (
      <PageShell
        eyebrow="Local testing"
        title={`Add an entry to ${joinData.pool.name}`}
        description="Create an additional test entry without signing out. This mode is only available locally."
        showHeader={false}
        heroAction={
          <Button asChild variant="outline">
            <Link href={`/join/${encodeURIComponent(inviteCode)}`}>
              Return to my picks
            </Link>
          </Button>
        }
      >
        <RoundOf16PickForm
          inviteCode={inviteCode}
          poolName={joinData.pool.name}
          poolSlug={joinData.pool.slug}
          settings={joinData.pool.settings}
          testGuestMode
        />
      </PageShell>
    );
  }

  if (
    !joinData.invite.isShareLink &&
    effectiveUser &&
    joinData.invite.status === "accepted" &&
    joinData.invite.acceptedBy &&
    joinData.invite.acceptedBy !== effectiveUser.id
  ) {
    return (
      <UnavailableInvite
        title="Invite already accepted"
        description="This participant link is already tied to another account."
        body="Sign out and use the account that accepted this invite, or ask the commissioner for a new link."
      />
    );
  }

  if (!effectiveUser) {
    const nextPath = `/join/${encodeURIComponent(inviteCode)}`;

    if (
      !joinData.invite.isShareLink &&
      joinData.invite.status === "accepted" &&
      joinData.invite.acceptedBy
    ) {
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

    if (joinData.invite.isShareLink) {
      return (
        <PageShell
          eyebrow="Pool invite"
          title={`Join ${joinData.pool.name}`}
          description={
            joinData.pool.settings.basics.description ||
            `Make your ${stage.pluralLabel.toLowerCase()} picks before the pool deadline.`
          }
          showHeader={false}
        >
          <LedgerPanel
            title="Sign in required"
            description="Entries are tied to verified accounts so picks, updates, and standings stay auditable."
          >
            <LedgerRow className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-normal leading-6 text-muted-foreground">
                Create an account or sign in before submitting picks for this pool.
              </p>
              {previewNewEntrant && user ? (
                <Button asChild variant="outline">
                  <Link href={`/join/${encodeURIComponent(inviteCode)}`}>
                    Return to your picks
                  </Link>
                </Button>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="primaryGreen">
                    <Link href={signUpPathFor(nextPath)}>Create account</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={signInPathFor(nextPath)}>Sign in</Link>
                  </Button>
                </div>
              )}
            </LedgerRow>
          </LedgerPanel>
        </PageShell>
      );
    }

    return (
      <PageShell
        eyebrow="Pool invite"
        title={`Join ${joinData.pool.name}`}
        description={`Create an account or sign in before submitting your ${stage.pluralLabel.toLowerCase()} picks.`}
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
        description={`The pick deadline has passed. ${stage.pluralLabel} entries are locked.`}
        showHeader={false}
      >
        <LedgerPanel
          title={effectiveExistingSubmission ? "Entry locked" : "Picks closed"}
          action={<ShieldCheck className="size-5 text-brand-success" />}
        >
          <LedgerRow>
            {effectiveExistingSubmission ? (
              <>
                <p className="font-semibold text-brand-ink">
                  Submitted{" "}
                  {new Date(
                    effectiveExistingSubmission.submittedAt,
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

  if (effectiveExistingSubmission) {
    return (
      <PageShell
        eyebrow="My pool picks"
        title={joinData.pool.name}
        description={`Your submitted picks were last updated ${new Date(effectiveExistingSubmission.submittedAt).toLocaleString()}. You can update them until the deadline.`}
        showHeader={false}
        heroAction={
          process.env.NODE_ENV === "development" &&
          joinData.invite.isShareLink ? (
            <Button asChild variant="outline">
              <Link
                href={`/join/${encodeURIComponent(inviteCode)}?preview=test`}
              >
                Create test entrant
              </Link>
            </Button>
          ) : undefined
        }
      >
        <RoundOf16PickForm
          inviteCode={inviteCode}
          poolName={joinData.pool.name}
          poolSlug={joinData.pool.slug}
          settings={joinData.pool.settings}
          initialPayload={effectiveExistingSubmission.payload}
          existingSubmittedAt={effectiveExistingSubmission.submittedAt}
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Pool invite"
      title={joinData.pool.name}
      description={joinData.pool.settings.basics.description || `Make or update your ${stage.pluralLabel.toLowerCase()} picks before the pool deadline.`}
      showHeader={false}
      heroAction={
        <Badge variant="outline" className="h-auto py-1.5">
          <LockKeyhole />{" "}
          {joinData.invite.isShareLink ? "Shared invite link" : joinData.invite.email}
        </Badge>
      }
    >
      <RoundOf16PickForm
        inviteCode={inviteCode}
        poolName={joinData.pool.name}
        poolSlug={joinData.pool.slug}
        settings={joinData.pool.settings}
      />
    </PageShell>
  );
}

function NbaJoinFlow({ inviteCode, joinData, user }: { inviteCode: string; joinData: NbaJoinData; user: Awaited<ReturnType<typeof getSupabaseUser>> }) {
  if (joinData.invite.status === "revoked" || joinData.invite.status === "expired") {
    return <UnavailableInvite title={`Invite ${joinData.invite.status}`} description="This participant link is no longer available." body="Ask the commissioner for a current invite link." />;
  }
  const nextPath = `/join/${encodeURIComponent(inviteCode)}`;
  if (!user) return <PageShell eyebrow="NBA Playoffs" title={`Join ${joinData.pool.name}`} description="Sign in to save a private, auditable playoff bracket." showHeader={false}><LedgerPanel title="Sign in required"><LedgerRow className="flex flex-wrap gap-3"><Button asChild variant="primaryGreen"><Link href={signUpPathFor(nextPath)}>Create account</Link></Button><Button asChild variant="outline"><Link href={signInPathFor(nextPath)}>Sign in</Link></Button></LedgerRow></LedgerPanel></PageShell>;
  if (!joinData.invite.isShareLink && joinData.invite.acceptedBy && joinData.invite.acceptedBy !== user.id) return <UnavailableInvite title="Invite already accepted" description="This invite belongs to another account." body="Ask the commissioner for a fresh invite link." />;
  if (joinData.deadlineHasPassed) return <PageShell eyebrow="NBA Playoffs" title={joinData.pool.name} description="The pick deadline has passed and entries are locked." showHeader={false}><LedgerPanel title={joinData.existingSubmission ? "Entry locked" : "Picks closed"}><LedgerRow><p className="text-sm text-muted-foreground">{joinData.existingSubmission ? "Your submitted bracket is available on the pool page." : "No submitted bracket was found before the deadline."}</p></LedgerRow></LedgerPanel></PageShell>;
  return <PageShell eyebrow="NBA Playoffs" title={joinData.pool.name} description={joinData.pool.settings.basics.description || "Pick every series winner and exact score before the deadline."} showHeader={false}><NbaSeriesPickForm inviteCode={inviteCode} poolSlug={joinData.pool.slug} settings={joinData.pool.settings} initialPayload={joinData.existingSubmission?.payload} existingSubmittedAt={joinData.existingSubmission?.submittedAt} /></PageShell>;
}

function JoinPageSkeleton() {
  return (
    <PageShell
      eyebrow="Pool invite"
      title="Pool invite"
      description="Checking invite details and preparing your picks."
      showHeader={false}
    >
      <LedgerPanel title="Loading invite" description="Preparing your pool entry.">
        <div className="grid gap-3 p-5" aria-busy="true" aria-live="polite">
          <div className="h-10 animate-pulse rounded-md bg-muted/80" />
          <div className="h-52 animate-pulse rounded-md bg-muted/80" />
          <div className="h-12 animate-pulse rounded-md bg-muted/80" />
        </div>
      </LedgerPanel>
    </PageShell>
  );
}

import { AuthSplitLayout } from "@/components/app/auth-split-layout";
import { MockSignInForm } from "@/components/app/mock-auth";
import { safeNextPath } from "@/lib/auth/paths";

type SignInPageProps = {
  searchParams: Promise<{ next?: string; auth_error?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { next, auth_error: authError } = await searchParams;
  const nextPath = safeNextPath(next);

  return (
    <AuthSplitLayout
      eyebrow="Your pool headquarters"
      title="Welcome back."
      description="Sign in to manage your pools, see the latest picks, and keep the friendly competition moving."
      footerCopy="PoolWaffle makes every match day easier to run."
      panelTitle="The group chat, but built for game day."
      panelDescription="Bring your people, picks, and scoreboards into one lively pool that is effortless to run."
    >
      <MockSignInForm
        nextPath={nextPath}
        initialMessage={
          authError === "callback"
            ? "We couldn't complete that sign-in. Please try again."
            : undefined
        }
      />
    </AuthSplitLayout>
  );
}

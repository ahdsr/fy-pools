import { AuthSplitLayout } from "@/components/app/auth-split-layout";
import { MockSignInForm } from "@/components/app/mock-auth";
import { postAuthRedirectPath } from "@/lib/auth/paths";

type SignInPageProps = {
  searchParams: Promise<{ next?: string; auth_error?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { next, auth_error: authError } = await searchParams;
  const nextPath = postAuthRedirectPath(next);

  return (
    <AuthSplitLayout
      eyebrow="Pool management"
      title="Welcome back."
      description="Sign in to manage pools, review participant entries, update deadlines, and check standings."
      panelTitle="Run every pool from one place."
      panelDescription="Invite players, collect picks, lock entries, and publish standings without moving between spreadsheets and group chats."
      centerContent
      centerIntro
      showLeftBrand={false}
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

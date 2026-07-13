import { redirect } from "next/navigation";

import { AuthSplitLayout } from "@/components/app/auth-split-layout";
import { MockSignInForm } from "@/components/app/mock-auth";
import { safeNextPath } from "@/lib/auth/paths";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseUser } from "@/lib/supabase/server";

type SignInPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(next);

  if (isSupabaseConfigured()) {
    const user = await getSupabaseUser();

    if (user) redirect(nextPath);
  }

  return (
    <AuthSplitLayout
      eyebrow="Your pool headquarters"
      title="Welcome back."
      description="Sign in to manage your pools, see the latest picks, and keep the friendly competition moving."
      footerCopy="PoolWaffle makes every match day easier to run."
      panelTitle="The group chat, but built for game day."
      panelDescription="Bring your people, picks, and scoreboards into one lively pool that is effortless to run."
      centerContent
    >
      <MockSignInForm nextPath={nextPath} />
    </AuthSplitLayout>
  );
}

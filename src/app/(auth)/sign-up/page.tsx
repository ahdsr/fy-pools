import { redirect } from "next/navigation";

import { AuthSplitLayout } from "@/components/app/auth-split-layout";
import { MockSignUpForm } from "@/components/app/mock-auth";
import { SignUpValueCarousel } from "@/components/app/sign-up-value-carousel";
import { safeNextPath } from "@/lib/auth/paths";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseUser } from "@/lib/supabase/server";

type SignUpPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(next);

  if (isSupabaseConfigured()) {
    const user = await getSupabaseUser();

    if (user) redirect(nextPath);
  }

  return (
    <AuthSplitLayout
      eyebrow="Create your pool"
      title="Start the pool everyone wants to join."
      description="Set up your home for friendly competition, invite your people, and make every match more fun."
      footerCopy="Create once, then let PoolWaffle handle game day."
      panelTitle="More games to care about."
      panelDescription="Create a polished home for your crew’s picks, scores, and bragging rights—without becoming the full-time scorekeeper."
      rightPanel={<SignUpValueCarousel />}
      centerContent
    >
      <MockSignUpForm nextPath={nextPath} />
    </AuthSplitLayout>
  );
}

import { AuthSplitLayout } from "@/components/app/auth-split-layout";
import { MockSignUpForm } from "@/components/app/mock-auth";
import { SignUpValueCarousel } from "@/components/app/sign-up-value-carousel";
import { postAuthRedirectPath } from "@/lib/auth/paths";

type SignUpPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { next } = await searchParams;
  const nextPath = postAuthRedirectPath(next);

  return (
    <AuthSplitLayout
      eyebrow="Create your pool"
      title="Start the pool everyone wants to join."
      description="Set up your home for friendly competition, invite your people, and make every match more fun."
      panelTitle="More games to care about."
      panelDescription="Create a polished home for your crew’s picks, scores, and bragging rights—without becoming the full-time scorekeeper."
      rightPanel={<SignUpValueCarousel />}
    >
      <MockSignUpForm nextPath={nextPath} />
    </AuthSplitLayout>
  );
}

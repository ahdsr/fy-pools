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
      eyebrow="Create an account"
      title="Set up your next sports pool."
      description="Create a private pool, invite participants, collect online picks, and keep scoring in one place."
      panelTitle="A clearer way to run a pool."
      panelDescription="Set the format, send invitations, track entries, and share standings your group can follow."
      rightPanel={<SignUpValueCarousel />}
      centerContent
    >
      <MockSignUpForm nextPath={nextPath} />
    </AuthSplitLayout>
  );
}

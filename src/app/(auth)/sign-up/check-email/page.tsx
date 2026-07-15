import Link from "next/link";
import { cookies } from "next/headers";

import { AuthSplitLayout } from "@/components/app/auth-split-layout";
import { ResendConfirmationForm } from "@/components/app/mock-auth";
import {
  PENDING_CONFIRMATION_EMAIL_COOKIE,
  PENDING_CONFIRMATION_NEXT_COOKIE,
} from "@/lib/auth/confirmation";
import { postAuthRedirectPath, signInPathFor, signUpPathFor } from "@/lib/auth/paths";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Check your email",
};

export default async function CheckEmailPage() {
  const cookieStore = await cookies();
  const email = cookieStore.get(PENDING_CONFIRMATION_EMAIL_COOKIE)?.value;
  const nextPath = postAuthRedirectPath(
    cookieStore.get(PENDING_CONFIRMATION_NEXT_COOKIE)?.value,
  );

  return (
    <AuthSplitLayout
      eyebrow="One last step"
      title="Check your email."
      description={
        email
          ? `We sent a confirmation link to ${email}. Open it to activate your account and continue to your pools.`
          : "Open the confirmation link we sent to activate your account and continue to your pools."
      }
      footerCopy="The confirmation link will sign you in automatically."
      panelTitle="Your pool is almost ready."
      panelDescription="Confirm your email, then start a pool, invite your people, and make game day easier to run."
    >
      <div className="space-y-4">
        <p className="text-sm leading-6 text-muted-foreground">
          If the email does not arrive in a few minutes, check your spam folder
          or send another confirmation link.
        </p>
        <ResendConfirmationForm />
        <Button asChild className="w-full" variant="primaryGreen">
          <Link href={signInPathFor(nextPath)}>Back to sign in</Link>
        </Button>
        <Button asChild className="w-full" variant="ghost">
          <Link href={signUpPathFor(nextPath)}>Use a different email</Link>
        </Button>
        <Button asChild className="w-full" variant="ghost">
          <Link href="/">Back to product home</Link>
        </Button>
      </div>
    </AuthSplitLayout>
  );
}

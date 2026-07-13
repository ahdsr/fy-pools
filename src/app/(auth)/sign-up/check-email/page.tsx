import Link from "next/link";

import { AuthSplitLayout } from "@/components/app/auth-split-layout";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Check your email",
};

export default function CheckEmailPage() {
  return (
    <AuthSplitLayout
      eyebrow="One last step"
      title="Check your email."
      description="We sent a confirmation link to the email address you used to create your account. Open it to activate your account and continue to your pools."
      footerCopy="The confirmation link will sign you in automatically."
      panelTitle="Your pool is almost ready."
      panelDescription="Confirm your email, then start a pool, invite your people, and make game day easier to run."
    >
      <div className="space-y-4">
        <p className="text-sm leading-6 text-muted-foreground">
          If the email does not arrive in a few minutes, check your spam folder
          or try signing in again.
        </p>
        <Button asChild className="w-full" variant="primaryGreen">
          <Link href="/sign-in">Back to sign in</Link>
        </Button>
        <Button asChild className="w-full" variant="ghost">
          <Link href="/">Back to product home</Link>
        </Button>
      </div>
    </AuthSplitLayout>
  );
}

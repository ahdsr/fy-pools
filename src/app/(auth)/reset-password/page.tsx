import Link from "next/link";

import { BrandWordmark } from "@/components/app/brand";
import { MockResetPasswordForm } from "@/components/app/mock-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { safeNextPath } from "@/lib/auth/paths";

type ResetPasswordPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(next);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <Card className="ledger-surface w-full max-w-md border bg-surface-paper shadow-sm ring-1 ring-foreground/5">
        <div className="ledger-rule h-1" />
        <CardHeader>
          <BrandWordmark />
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>
            Set a new password for your PoolWaffle account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <MockResetPasswordForm nextPath={nextPath} />
          <Button asChild variant="ghost" className="w-full">
            <Link href="/">Back to product home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

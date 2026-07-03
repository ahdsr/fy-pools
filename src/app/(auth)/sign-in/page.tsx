import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandWordmark } from "@/components/app/brand";
import { MockSignInForm } from "@/components/app/mock-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <Card className="ledger-surface w-full max-w-md border bg-surface-paper shadow-sm ring-1 ring-foreground/5">
        <div className="ledger-rule h-1" />
        <CardHeader>
          <BrandWordmark />
          <CardTitle>Sign in to PoolWaffle</CardTitle>
          <CardDescription>
            Use your email and password to manage pools or submit invited picks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <MockSignInForm nextPath={nextPath} />
          <Button asChild variant="ghost" className="w-full">
            <Link href="/">Back to product home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

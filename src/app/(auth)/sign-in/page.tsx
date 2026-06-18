import Link from "next/link";

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

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <Card className="ledger-surface w-full max-w-md border bg-surface-paper shadow-sm ring-1 ring-foreground/5">
        <div className="ledger-rule h-1" />
        <CardHeader>
          <BrandWordmark />
          <CardTitle>Sign in to PoolWaffle</CardTitle>
          <CardDescription>
            Use the mock admin account to preview signed-in pool management.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <MockSignInForm />
          <Button asChild variant="ghost" className="w-full">
            <Link href="/">Back to product home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

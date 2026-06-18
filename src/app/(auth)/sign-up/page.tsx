import Link from "next/link";

import { BrandWordmark } from "@/components/app/brand";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <Card className="ledger-surface w-full max-w-md border bg-surface-paper shadow-sm ring-1 ring-foreground/5">
        <div className="ledger-rule h-1" />
        <CardHeader>
          <BrandWordmark />
          <CardTitle>Create your PoolWaffle account</CardTitle>
          <CardDescription>
            Start a pool workspace, invite players, and publish your own live
            standings page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild className="w-full" variant="primaryGreen">
            <Link href="/sign-in">Continue with mock account</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/">Back to product home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

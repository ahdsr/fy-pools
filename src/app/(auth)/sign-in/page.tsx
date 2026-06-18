import Link from "next/link";

import { BrandWordmark } from "@/components/app/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <Card className="ledger-surface w-full max-w-md border bg-surface-paper shadow-sm ring-1 ring-foreground/5">
        <div className="ledger-rule h-1" />
        <CardHeader>
          <BrandWordmark />
          <CardTitle>Sign in to FY Pools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="commissioner@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="Not wired yet" />
          </div>
          <Button className="w-full" disabled>
            Auth wiring comes next
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/">Back to product home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

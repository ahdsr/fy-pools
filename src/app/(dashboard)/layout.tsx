import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { DashboardLoadingScreen } from "@/components/app/dashboard-loading-screen";
import { DashboardHeader } from "@/components/app/mock-auth";
import { getSupabaseUser } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <DashboardHeader />
      <Suspense fallback={<DashboardLoadingScreen />}>
        <AuthenticatedDashboard>{children}</AuthenticatedDashboard>
      </Suspense>
    </>
  );
}

async function AuthenticatedDashboard({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await connection();
  const user = await getSupabaseUser();

  if (!user) {
    redirect("/sign-in");
  }

  return children;
}

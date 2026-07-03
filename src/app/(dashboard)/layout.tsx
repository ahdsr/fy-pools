import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/app/mock-auth";
import { getSupabaseUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSupabaseUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <>
      <DashboardHeader />
      {children}
    </>
  );
}

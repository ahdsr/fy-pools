import { redirect } from "next/navigation";
import { connection } from "next/server";

import { DashboardHeader } from "@/components/app/mock-auth";
import { getSupabaseUser } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await connection();
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

import type { Metadata } from "next";

import { DashboardHeader } from "@/components/app/mock-auth";

export const metadata: Metadata = {
  title: "Commissioner workspace",
  description: "Create, manage, and score private sports pools in PoolWaffle.",
  robots: {
    index: false,
    follow: false,
  },
};

// The proxy handles route entry for this authenticated area. Individual data
// access functions still verify the user and pool ownership before returning
// or mutating private data.
export const unstable_instant = false;

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <DashboardHeader />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}

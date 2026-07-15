import type { Metadata } from "next";

import { DashboardHeader } from "@/components/app/mock-auth";

export const metadata: Metadata = {
  title: "Private pool invitation",
  description: "Sign in to join a private PoolWaffle sports pool and submit picks.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function JoinLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <DashboardHeader />
      {children}
    </>
  );
}

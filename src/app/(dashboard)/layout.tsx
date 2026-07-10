import { DashboardHeader } from "@/components/app/mock-auth";

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

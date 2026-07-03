import { DashboardHeader } from "@/components/app/mock-auth";

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

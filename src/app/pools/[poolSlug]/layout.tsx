import { PublicPoolRouteHeader } from "@/components/app/mock-auth";

export default function PublicPoolLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <PublicPoolRouteHeader />
      {children}
    </>
  );
}

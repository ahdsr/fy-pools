import { PublicPoolRouteHeader } from "@/components/app/mock-auth";
import { PUBLIC_POOL_SLUGS } from "@/lib/world-cup-pool/data";

export const dynamicParams = false;

export function generateStaticParams() {
  return PUBLIC_POOL_SLUGS.map((poolSlug) => ({ poolSlug }));
}

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

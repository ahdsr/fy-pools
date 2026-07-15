import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account access",
  description: "Sign in, create a PoolWaffle account, or manage your password.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}

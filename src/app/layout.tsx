import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { Suspense } from "react";

import { MockAuthProvider } from "@/components/app/mock-auth";
import { authUserFromSupabase } from "@/lib/auth/user";
import { getAppSiteUrl } from "@/lib/supabase/config";
import { getSupabaseUser } from "@/lib/supabase/server";
import "./globals.css";

const momoTrustSans = localFont({
  src: [
    {
      path: "./fonts/momo-trust-sans-300.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/momo-trust-sans-400.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/momo-trust-sans-500.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/momo-trust-sans-600.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/momo-trust-sans-700.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/momo-trust-sans-800.ttf",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-momo-trust-sans",
  display: "swap",
  fallback: ["system-ui", "Arial", "sans-serif"],
  adjustFontFallback: false,
});

const momoTrustDisplay = localFont({
  src: "./fonts/momo-trust-display-400.ttf",
  variable: "--font-momo-trust-display",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getAppSiteUrl()),
  title: {
    default: "PoolWaffle",
    template: "%s | PoolWaffle",
  },
  description:
    "Private sports pool hosting for commissioners, with templates, spreadsheet imports, player picks, scoring, projections, and leaderboards.",
  applicationName: "PoolWaffle",
  openGraph: {
    siteName: "PoolWaffle",
    type: "website",
    locale: "en_CA",
  },
  twitter: {
    card: "summary",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="premium-pools"
      className={`${momoTrustSans.variable} ${momoTrustDisplay.variable} ${geistMono.variable} ${momoTrustSans.className} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Suspense
          fallback={<AuthShellFallback />}
        >
          <AuthSessionProvider>{children}</AuthSessionProvider>
        </Suspense>
      </body>
    </html>
  );
}

async function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  let initialUser = null;

  try {
    initialUser = authUserFromSupabase(await getSupabaseUser());
  } catch {
    // Keep the shell usable when local Supabase configuration is absent.
  }

  return <MockAuthProvider initialUser={initialUser}>{children}</MockAuthProvider>;
}

function AuthShellFallback() {
  return <main className="min-h-screen bg-background" aria-busy="true" />;
}

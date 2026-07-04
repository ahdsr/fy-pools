import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";

import { MockAuthProvider } from "@/components/app/mock-auth";
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
  title: {
    default: "PoolWaffle",
    template: "%s | PoolWaffle",
  },
  description:
    "Private sports pool hosting for commissioners, with templates, spreadsheet imports, player picks, scoring, projections, and leaderboards.",
  applicationName: "PoolWaffle",
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
        <MockAuthProvider>{children}</MockAuthProvider>
      </body>
    </html>
  );
}

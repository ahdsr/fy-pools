import type { Metadata } from "next";
import {
  Geist_Mono,
  Momo_Trust_Display,
  Momo_Trust_Sans,
} from "next/font/google";

import { MockAuthProvider } from "@/components/app/mock-auth";
import "./globals.css";

const momoTrustSans = Momo_Trust_Sans({
  variable: "--font-momo-trust-sans",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: false,
});

const momoTrustDisplay = Momo_Trust_Display({
  variable: "--font-momo-trust-display",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
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

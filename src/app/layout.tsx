import type { Metadata } from "next";
import {
  Geist_Mono,
  Manrope,
  Outfit,
} from "next/font/google";

import { MockAuthProvider } from "@/components/app/mock-auth";
import "./globals.css";

const poolSans = Manrope({
  variable: "--font-pool-sans",
  subsets: ["latin"],
  display: "swap",
});

const poolHeading = Outfit({
  variable: "--font-pool-heading",
  subsets: ["latin"],
  display: "swap",
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
      className={`${poolSans.variable} ${poolHeading.variable} ${geistMono.variable} ${poolSans.className} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <MockAuthProvider>{children}</MockAuthProvider>
      </body>
    </html>
  );
}

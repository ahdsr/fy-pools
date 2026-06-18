import type { Metadata } from "next";
import { Geist_Mono, Momo_Trust_Sans } from "next/font/google";
import "./globals.css";

const momoTrustSans = Momo_Trust_Sans({
  variable: "--font-momo-trust-sans",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FY Pools",
  description: "Private sports pool hosting for commissioners and players.",
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
      className={`${momoTrustSans.variable} ${geistMono.variable} ${momoTrustSans.className} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

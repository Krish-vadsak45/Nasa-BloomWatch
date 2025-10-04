import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import "./globals.css";
import { CenterWrapper } from "@/components/center-wrapper";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "BloomVision - NASA Space Apps Challenge",
  description:
    "Using NASA Earth observation data to visualize and predict plant blooming events across the globe",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`font-sans ${inter.variable} ${GeistMono.variable} antialiased`}
      >
        <Suspense fallback={null}>
          <CenterWrapper>{children}</CenterWrapper>
        </Suspense>
        <Analytics />
      </body>
    </html>
  );
}

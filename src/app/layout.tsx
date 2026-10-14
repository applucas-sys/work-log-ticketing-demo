import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Condensed } from "next/font/google";
import "./globals.css";

const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex-sans", display: "swap" });
const condensed = IBM_Plex_Sans_Condensed({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-plex-condensed", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-plex-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Work Log Ticketing | US Travel",
  description: "Work log ticketing, permintaan bayar AP, dan pantauan invoice untuk tim US Travel.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={`${sans.variable} ${condensed.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}

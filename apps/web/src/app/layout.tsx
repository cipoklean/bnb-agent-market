import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

const ibmSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const ibmMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://bnb-agent-market.vercel.app"
  ),
  title: "BNB Agent Market Core — Discover · Hire · Verify",
  description:
    "A marketplace layer for discovering, hiring, paying, monitoring, and revoking AI agents on BNB Smart Chain. AlphaDesk for DeFi. TaskChain Bazaar for productivity.",
  keywords: [
    "BNB Smart Chain",
    "ERC-8004",
    "AI agents",
    "x402",
    "agent marketplace",
    "PancakeSwap",
  ],
  openGraph: {
    type: "website",
    title: "Hire agents you can trust. Stop them anytime.",
    description:
      "Discover, hire, pay, monitor, and revoke AI agents on BNB Smart Chain — spend-capped sessions with a memory-verified confirmation layer.",
    siteName: "BNB Agent Market Core",
  },
  twitter: {
    card: "summary_large_image",
    title: "BNB Agent Market Core",
    description:
      "Hire agents you can trust. Stop them anytime. ERC-8004 identity · x402 payments · revocable sessions.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ibmSans.variable} ${ibmMono.variable}`}>
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">{children}</main>
        <footer className="border-t border-border/50 py-6">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 text-[12px] text-muted sm:flex-row sm:px-6">
            <div>BNB Agent Market Core · AlphaDesk · TaskChain Bazaar</div>
            <div className="flex items-center gap-2">
              <span className="dot dot-green" /> Live 8004scan directory · execution adapters labeled
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

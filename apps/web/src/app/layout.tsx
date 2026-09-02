import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";
import { SigilLive, SigilSep } from "@/components/sigils";
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

// Display serif — the ledger voice. Headlines only, never body or data.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://bnb-agent-market.vercel.app"
  ),
  title: "BNB Agent Market — the front door for BSC's AI agents",
  description:
    "Find, compare and hire verified AI agents on BNB Chain. ERC-8004 on-chain identity, live 8004scan scores, x402 payments, spend-capped sessions you can revoke anytime.",
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
    title: "BNB Agent Market — the front door for BSC's AI agents",
    description:
      "Find, compare and hire verified AI agents on BNB Chain — live scores, spend caps, instant revoke.",
    siteName: "BNB Agent Market",
  },
  twitter: {
    card: "summary_large_image",
    title: "BNB Agent Market",
    description:
      "Find, compare and hire verified AI agents on BNB Chain. ERC-8004 identity · x402 payments · revocable sessions.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${ibmSans.variable} ${ibmMono.variable} ${fraunces.variable}`}
    >
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">{children}</main>
        <footer className="rule-gold py-6">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 text-[12px] text-muted sm:flex-row sm:px-6">
            <div className="flex flex-wrap items-center">
              Built for the Smart Money Era
              <SigilSep />
              Data live from{" "}
              <a
                href="https://8004scan.io"
                target="_blank"
                rel="noopener noreferrer"
                className="link"
              >
                8004scan
              </a>
              <SigilSep />
              Registry <span className="hash">0x8004…432</span>
            </div>
            <SigilLive label="Live ERC-8004 directory" />
          </div>
        </footer>
      </body>
    </html>
  );
}

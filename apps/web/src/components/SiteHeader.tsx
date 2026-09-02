"use client";
// Site header — the marketplace chrome: exact nav per the production spec,
// real injected-wallet connect (BSC mainnet enforced), green-dot connected
// state with disconnect, and a friendly "Wallet not detected" modal. Never
// crashes without window.ethereum.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, Menu, Wallet, X } from "lucide-react";
import { useMarket, initWalletSync } from "@/lib/store";
import { truncateAddress } from "@/lib/format";
import { walletAvailable, isWalletError, type WalletError } from "@/lib/wallet";
import { SigilMark } from "@/components/sigils";

const NAV = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/alphadesk", label: "DeFi & Trading" },
  { href: "/taskchain", label: "Productivity" },
  { href: "/submit", label: "Submit an agent" },
];

/** Secondary pages reachable from the dashboard/footer, not the main nav. */
const SECONDARY = [
  { href: "/dashboard", label: "My sessions" },
  { href: "/altana-sessions", label: "Altana sessions" },
  { href: "/memory", label: "Memory" },
  { href: "/evidence", label: "Evidence" },
  { href: "/compare", label: "Compare" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [walletMenu, setWalletMenu] = useState(false);
  const [modal, setModal] = useState<WalletError | null>(null);
  const [connecting, setConnecting] = useState(false);
  const { walletConnected, walletAddress, walletChainOk, connectWallet, disconnectWallet } = useMarket();
  const menuRef = useRef<HTMLDivElement>(null);

  // Rehydrate wallet state once (eth_accounts + account/chain listeners).
  useEffect(() => initWalletSync(), []);

  // Close the wallet dropdown on outside click.
  useEffect(() => {
    if (!walletMenu) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setWalletMenu(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [walletMenu]);

  const active = (href: string) => pathname.startsWith(href);

  const handleConnect = async () => {
    if (!walletAvailable()) {
      setModal({ kind: "not_detected" });
      return;
    }
    setConnecting(true);
    try {
      await connectWallet();
    } catch (e) {
      if (isWalletError(e)) setModal(e);
      else setModal({ kind: "unknown", message: String(e) });
    } finally {
      setConnecting(false);
    }
  };

  const errorCopy = (e: WalletError): { title: string; body: string } => {
    switch (e.kind) {
      case "not_detected":
        return {
          title: "Wallet not detected",
          body: "Install MetaMask (or any EVM wallet) to connect, then reload this page.",
        };
      case "user_rejected":
        return { title: "Request declined", body: "You dismissed the wallet request. Click Connect Wallet to try again." };
      case "wrong_chain":
        return { title: "Wrong network", body: e.message };
      default:
        return { title: "Connection failed", body: e.message };
    }
  };

  return (
    <header className="glass-bar sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-bronze/50 bg-gold/8">
            <SigilMark size={19} className="text-gold" />
          </span>
          <span className="leading-tight">
            <span className="font-display block text-[17px] font-semibold tracking-tight">
              BNB Agent Market
            </span>
            <span className="hidden text-[11px] text-muted sm:block">
              BSC&apos;s AI agent front door
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-btn px-3 py-1.5 text-[13px] font-medium transition-colors ${
                active(n.href)
                  ? "bg-primary/12 text-primary"
                  : "text-muted hover:bg-surface-2 hover:text-text"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {walletConnected && walletAddress ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setWalletMenu((v) => !v)}
                className="flex items-center gap-2 rounded-btn border border-border bg-surface-2/60 px-3 py-1.5 text-[13px] font-medium transition-colors hover:border-primary/40"
              >
                <span className={`dot ${walletChainOk ? "dot-green" : "dot-amber"}`} />
                <span className="tnum">{truncateAddress(walletAddress)}</span>
              </button>
              {walletMenu && (
                <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-52 overflow-hidden rounded-card border border-border bg-surface shadow-xl">
                  {!walletChainOk && (
                    <div className="border-b border-border/60 px-3 py-2 text-[12px] text-warning">
                      Not on BSC mainnet — switch from your wallet before hiring.
                    </div>
                  )}
                  <button
                    onClick={() => {
                      disconnectWallet();
                      setWalletMenu(false);
                    }}
                    className="block w-full px-3 py-2.5 text-left text-[13px] text-muted transition-colors hover:bg-surface-2 hover:text-text"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={handleConnect} disabled={connecting} className="btn-primary btn-sm">
              <Wallet size={14} />
              {connecting ? "Connecting…" : "Connect Wallet"}
            </button>
          )}
          <button
            className="rounded-btn border border-border p-2 text-muted hover:text-text lg:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border/60 bg-surface/95 px-4 py-3 backdrop-blur-xl lg:hidden">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className={`block rounded-btn px-3 py-2.5 text-[14px] ${
                active(n.href) ? "bg-primary/12 text-primary" : "text-muted"
              }`}
            >
              {n.label}
            </Link>
          ))}
          <div className="mt-2 border-t border-border/60 pt-2">
            {SECONDARY.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="block rounded-btn px-3 py-2 text-[13px] text-muted/80"
              >
                {n.label}
              </Link>
            ))}
          </div>
        </nav>
      )}

      {/* Friendly wallet-error modal — never a crash. */}
      {modal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setModal(null)}
        >
          <div
            className="w-full max-w-sm rounded-card border border-border bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-[17px] font-semibold">{errorCopy(modal).title}</h3>
              <button onClick={() => setModal(null)} aria-label="Close" className="text-muted hover:text-text">
                <X size={16} />
              </button>
            </div>
            <p className="body-sm mt-2">{errorCopy(modal).body}</p>
            {modal.kind === "not_detected" && (
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary btn-sm mt-4 inline-flex"
              >
                Install MetaMask <ExternalLink size={13} />
              </a>
            )}
            {modal.kind !== "not_detected" && (
              <button onClick={() => setModal(null)} className="btn-ghost btn-sm mt-4">
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export { SECONDARY };

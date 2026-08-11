"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Wallet, X, Hexagon } from "lucide-react";
import { useMarket } from "@/lib/store";
import { truncateAddress } from "@/lib/format";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/alphadesk", label: "AlphaDesk" },
  { href: "/taskchain", label: "TaskChain" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/memory", label: "Memory" },
  { href: "/evidence", label: "Evidence" },
  { href: "/submit", label: "Submit" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { walletConnected, walletAddress, connectWallet, disconnectWallet } = useMarket();

  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="glass-bar sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-primary/40 bg-primary/10">
            <Hexagon size={18} className="text-primary" />
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-semibold tracking-tight">
              BNB Agent Market
            </span>
            <span className="block text-[10px] uppercase tracking-[0.18em] text-muted">
              Discover · Hire · Verify
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
          {walletConnected ? (
            <button
              onClick={disconnectWallet}
              className="badge-gold !normal-case"
              title="Demo wallet — click to disconnect"
            >
              <Wallet size={12} />
              {truncateAddress(walletAddress ?? "")}
            </button>
          ) : (
            <button onClick={connectWallet} className="btn-primary btn-sm">
              <Wallet size={14} />
              Connect (demo)
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
        <nav className="border-t border-border/60 bg-surface/90 px-4 py-3 backdrop-blur-xl lg:hidden">
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
        </nav>
      )}
    </header>
  );
}

// AlphaDesk — DeFi & trading vertical. Product copy (guardrails) is kept; the
// agent grid is the LIVE directory (same 8004scan source as the marketplace).
// Vertical (category) metadata is not part of the indexer's registry fields —
// listed agents render with an honest "category unverified" caption.
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  FileText,
  Lock,
  Shield,
  StopCircle,
  Wallet,
  Zap,
} from "lucide-react";
import MarketClient from "@/components/MarketClient";
import { PanelGlass, SectionTitle } from "@/components/ui";
import { getDirectory } from "@/lib/directory-cache";
import { normalizeScanEntry, dedupeAndOrder } from "@/lib/scan-normalize";

export const dynamic = "force-dynamic";

const SAFETY = [
  { icon: Lock, title: "Spend caps", body: "You can set a spending limit — total and per action." },
  { icon: Shield, title: "Allowlisted contracts", body: "Your session terms only allow the contracts you list. Anything else is refused." },
  { icon: Zap, title: "Simulation first", body: "Every move is simulated before anything executes." },
  { icon: Clock, title: "Automatic expiry", body: "This session expires automatically after the time you choose." },
  { icon: StopCircle, title: "Revoke anytime", body: "You can stop the agent anytime — instantly." },
];

export default async function AlphaDeskPage() {
  const dir = await getDirectory({ chainId: 56, limit: 24 });
  const live = dedupeAndOrder(dir.agents.map((raw) => normalizeScanEntry(raw, 56)));

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Link href="/" className="link inline-flex items-center gap-1 text-[13px]">
          <ArrowLeft size={13} /> Home
        </Link>
      </div>

      {/* Hero */}
      <section className="flex flex-col items-center py-6 text-center">
        <span className="badge-gold mb-4">Vertical 01 — DeFi & Trading</span>
        <h1 className="title-page max-w-2xl !text-[32px] leading-tight sm:!text-[38px]">
          AlphaDesk
        </h1>
        <p className="body-sm mt-3 max-w-xl !text-[15px]">
          DeFi and trading agents on BNB Smart Chain — scoped to your session
          terms, bounded by your limits, and stoppable in one click.
        </p>
        <Link href="/marketplace" className="btn-primary mt-6">
          Browse the live directory <ArrowRight size={15} />
        </Link>
      </section>

      {/* Live directory */}
      <section className="flex flex-col gap-4">
        <SectionTitle
          title="AlphaDesk directory"
          sub="Live from 8004scan — the indexer does not record vertical categories, so agent categories are unverified here."
        />
        <MarketClient
          live={live}
          total={dir.total}
          degraded={dir.degraded}
          stale={dir.stale}
          source={dir.source}
          fetchedAt={dir.fetchedAt}
          note="category unverified"
        />
      </section>

      {/* Safety */}
      <section>
        <SectionTitle title="How sessions stay safe" sub="Every AlphaDesk session ships with these guardrails." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SAFETY.map((s) => (
            <PanelGlass key={s.title} className="flex flex-col gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-success/25 bg-success/10">
                <s.icon size={16} className="text-success" />
              </span>
              <h3 className="title-card">{s.title}</h3>
              <p className="body-sm">{s.body}</p>
            </PanelGlass>
          ))}
          <PanelGlass className="flex flex-col gap-2 sm:col-span-2 lg:col-span-3">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-primary" />
              <h3 className="title-card">Limits are enforced, not promised</h3>
            </div>
            <p className="body-sm">
              Your session terms (budget, allowlist, expiry, revoke) are enforced by your
              wallet session keys. Execution beyond that depends on the agent&apos;s own
              endpoints — every action is recorded with proof.
            </p>
          </PanelGlass>
        </div>
      </section>

      {/* Payments */}
      <section>
        <SectionTitle title="Payments" sub="Binance x402 — approve each payment, keep control." />
        <PanelGlass className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Wallet size={15} className="text-primary" />
            <h3 className="title-card">x402 payment requests</h3>
          </div>
          <p className="body-sm">
            When an agent completes a task, you receive a payment request with a session
            hash. You approve it, and a receipt with a transaction hash is recorded. No
            recurring charges — each request is separate and reviewable.
          </p>
        </PanelGlass>
      </section>
    </div>
  );
}

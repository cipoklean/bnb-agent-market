// TaskChain Bazaar — productivity & automation vertical. Product copy
// (templates + guardrails) is kept; the agent grid is the LIVE directory
// (same 8004scan source as the marketplace).
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  FileText,
  Shield,
  Sparkles,
} from "lucide-react";
import MarketClient from "@/components/MarketClient";
import { PanelGlass, SectionTitle } from "@/components/ui";
import { getDirectory } from "@/lib/directory-cache";
import { normalizeScanEntry } from "@/lib/scan-normalize";

export const dynamic = "force-dynamic";

const TEMPLATES = [
  {
    icon: FileText,
    title: "DAO voting",
    body: "Read a proposal, get a plain-English summary, and cast the vote you approve — governor contract only.",
  },
  {
    icon: Sparkles,
    title: "Airdrop claims",
    body: "Verify eligibility, claim the token, and deliver assets to your controlled account with proof.",
  },
  {
    icon: BarChart3,
    title: "Monitoring",
    body: "Watch positions, rewards, and balances around the clock. Alert you when something needs you.",
  },
  {
    icon: Check,
    title: "Reporting",
    body: "Read-only portfolio and performance reports with a verifiable report hash every time.",
  },
];

export default async function TaskChainPage() {
  const dir = await getDirectory({ chainId: 56, limit: 24 });
  const live = dir.agents.map((raw) => normalizeScanEntry(raw, 56));

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Link href="/" className="link inline-flex items-center gap-1 text-[13px]">
          <ArrowLeft size={13} /> Home
        </Link>
      </div>

      {/* Hero */}
      <section className="flex flex-col items-center py-6 text-center">
        <span className="badge-gold mb-4">Vertical 02 — Productivity & Automation</span>
        <h1 className="title-page max-w-2xl !text-[32px] leading-tight sm:!text-[38px]">
          TaskChain Bazaar
        </h1>
        <p className="body-sm mt-3 max-w-xl !text-[15px]">
          Productivity and automation agents for governance, claims, monitoring, and
          reporting — scoped to your session terms with a strict allowlist.
        </p>
        <Link href="/marketplace" className="btn-primary mt-6">
          Browse the live directory <ArrowRight size={15} />
        </Link>
      </section>

      {/* Templates */}
      <section>
        <SectionTitle
          title="Task templates"
          sub="Common jobs, pre-scoped with minimal permissions."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {TEMPLATES.map((t) => (
            <PanelGlass key={t.title} className="flex flex-col gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-primary/25 bg-primary/10">
                <t.icon size={16} className="text-primary" />
              </span>
              <h3 className="title-card">{t.title}</h3>
              <p className="body-sm">{t.body}</p>
            </PanelGlass>
          ))}
        </div>
      </section>

      {/* Live directory */}
      <section className="flex flex-col gap-4">
        <SectionTitle
          title="TaskChain directory"
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

      {/* Note */}
      <section className="grid gap-4 lg:grid-cols-2">
        <PanelGlass className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Shield size={15} className="text-success" />
            <h3 className="title-card">Why sessions are low-risk by construction</h3>
          </div>
          <p className="body-sm">
            Whatever the agent, your session terms are enforced by your wallet session
            keys: budget cap, contract allowlist, automatic expiry, and instant
            revocation. Nothing happens until you confirm the memory hash.
          </p>
        </PanelGlass>
        <PanelGlass className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <ArrowRight size={15} className="text-primary" />
            <h3 className="title-card">Every session is yours to stop</h3>
          </div>
          <p className="body-sm">
            Every session has a memory hash you can verify, an expiry, a budget cap,
            and a stop button. You can stop the agent anytime.
          </p>
        </PanelGlass>
      </section>
    </div>
  );
}

// Home — hero with REAL indexer stats + live directory featured agents.
// Product copy (how it works, trust & safety) is unchanged; the numbers are
// no longer invented. Featured = top 3 by total_feedbacks from the live list.
// Directory data flows through lib/directory-cache (live → lastGood →
// snapshot → degraded) with honest captions per source.
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock,
  Eye,
  FileText,
  Lock,
  Search,
  Settings,
  Shield,
  StopCircle,
} from "lucide-react";
import ScanAgentCard from "@/components/ScanAgentCard";
import SampleHome from "@/components/SampleHome";
import { PanelGlass, SectionTitle } from "@/components/ui";
import { sampleAgentsEnabled } from "@/lib/data";
import { getDirectory } from "@/lib/directory-cache";
import { timeAgo } from "@/lib/format";
import { normalizeScanEntry } from "@/lib/scan-normalize";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    icon: Search,
    title: "1. Choose an agent",
    body: "Browse the live ERC-8004 directory — on-chain identity and real indexer scores.",
  },
  {
    icon: Settings,
    title: "2. Set your limits",
    body: "Pick a spending cap, the contracts the agent may touch, and an expiry. You stay in control.",
  },
  {
    icon: Shield,
    title: "3. Confirm every action",
    body: "The agent must confirm the session before acting. You approve actions and can stop it anytime.",
  },
];

const TRUST = [
  { icon: Lock, text: "This agent can only do what you allow." },
  { icon: Settings, text: "You can set a spending limit." },
  { icon: Clock, text: "This session expires automatically." },
  { icon: StopCircle, text: "You can stop the agent anytime." },
  { icon: FileText, text: "Every action is recorded with proof." },
  { icon: Check, text: "The agent must confirm the session before acting." },
  { icon: Eye, text: "No action happens until you confirm." },
];

export default async function HomePage() {
  // Dev-only sample registry (NEXT_PUBLIC_SAMPLE_DATA=1) — never production.
  if (sampleAgentsEnabled()) return <SampleHome />;

  const dir = await getDirectory({ chainId: 56, limit: 24 });
  const live = dir.agents.map((raw) => normalizeScanEntry(raw, 56));
  const featured = [...live]
    .sort((a, b) => b.totalFeedbacks - a.totalFeedbacks)
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-14">
      {/* Hero */}
      <section className="flex flex-col items-center py-10 text-center sm:py-16">
        <div className="badge-gold mb-6">
          BNB Smart Chain · ERC-8004 identity · x402 payments
        </div>
        <h1 className="title-page max-w-3xl !text-[34px] leading-tight sm:!text-[42px]">
          Hire agents you can trust. Stop them anytime.
        </h1>
        <p className="body-sm mt-4 max-w-xl !text-[16px]">
          A calm marketplace for AI agents on BNB Smart Chain. Discover indexed agents,
          give them limits, confirm their memory, and watch every action with proof.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/marketplace" className="btn-primary">
            Explore agents <ArrowRight size={15} />
          </Link>
          <Link href="/submit" className="btn-ghost">
            List your agent
          </Link>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[13px] text-muted">
          {dir.degraded ? (
            <span className="badge-amber">Indexer unreachable — directory paused</span>
          ) : (
            <>
              <span>
                <span className="tnum font-semibold text-text">
                  {dir.total.toLocaleString()}
                </span>{" "}
                agents indexed on BSC
              </span>
              <span>
                <span className="tnum font-semibold text-text">{live.length}</span>{" "}
                listed in this directory
              </span>
            </>
          )}
        </div>
        {!dir.degraded && dir.stale && (
          <p className="mt-3 flex items-center gap-1.5 text-[12px] text-warning">
            <Clock size={13} />
            Showing cached directory — fetched {dir.fetchedAt ? timeAgo(dir.fetchedAt) : "recently"}.
            Live scores return when 8004scan responds.
          </p>
        )}
      </section>

      {/* How it works */}
      <section>
        <SectionTitle
          title="How it works"
          sub="From discovery to a running session in under 90 seconds."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <PanelGlass key={s.title} className="stagger">
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-[12px] border border-primary/30 bg-primary/10">
                <s.icon size={18} className="text-primary" />
              </span>
              <h3 className="title-card">{s.title}</h3>
              <p className="body-sm mt-1.5">{s.body}</p>
            </PanelGlass>
          ))}
        </div>
      </section>

      {/* Trust & safety */}
      <section>
        <SectionTitle
          title="Trust and safety"
          sub="Safety is the product. Every session ships with these guarantees."
        />
        <PanelGlass>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TRUST.map((t) => (
              <div key={t.text} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success/12">
                  <t.icon size={14} className="text-success" />
                </span>
                <p className="text-[14px] leading-relaxed text-text">{t.text}</p>
              </div>
            ))}
            <div className="flex items-start gap-3 sm:col-span-2 lg:col-span-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/12">
                <Shield size={14} className="text-primary" />
              </span>
              <p className="body-sm max-w-3xl">
                Every session gets a memory hash — a fingerprint of exactly what you
                approved. The agent verifies it before every action. If it ever
                mismatches, the action is refused.
              </p>
            </div>
          </div>
        </PanelGlass>
      </section>

      {/* Featured — top of the live directory by real feedback */}
      <section>
        <SectionTitle
          title="Top of the directory"
          sub="The most-attested agents on the indexer right now — real feedback, no invented track records."
          right={
            <Link href="/marketplace" className="link text-[13px]">
              View the full directory <ArrowRight size={12} className="inline" />
            </Link>
          }
        />
        {featured.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featured.map((v) => (
              <ScanAgentCard key={v.slug} view={v} />
            ))}
          </div>
        ) : (
          <PanelGlass>
            <p className="body-sm">
              The directory is empty right now — check back shortly, or{" "}
              <Link href="/submit" className="link">
                submit an agent
              </Link>
              .
            </p>
          </PanelGlass>
        )}
      </section>
    </div>
  );
}

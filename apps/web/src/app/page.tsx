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
import CountUp from "@/components/CountUp";
import { PanelGlass, SectionTitle } from "@/components/ui";
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
  const dir = await getDirectory({ chainId: 56, limit: 24 });
  const live = dir.agents.map((raw) => normalizeScanEntry(raw, 56));
  const featured = [...live]
    .sort((a, b) => b.totalFeedbacks - a.totalFeedbacks)
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-14">
      {/* Hero — bold, high-contrast, with a LIVE featured agent card */}
      <section className="relative overflow-hidden rounded-card border border-border/60 bg-surface/30 px-5 py-12 sm:px-10 sm:py-16">
        {/* Animated backdrop: blueprint grid + aurora light blobs (decorative). */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 hero-grid opacity-70" />
          <div className="aurora-blob -left-10 -top-16 h-72 w-72 bg-primary/25" />
          <div
            className="aurora-blob -right-6 top-6 h-80 w-80 bg-info/20"
            style={{ animationDelay: "-6s" }}
          />
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
          {/* Left — pitch, CTAs, live stats */}
          <div className="flex flex-col items-start text-left">
            <div className="badge-gold mb-6 animate-pulse-glow">
              BNB Smart Chain · ERC-8004 identity · x402 payments
            </div>
            <h1 className="max-w-2xl text-[40px] font-bold leading-[1.04] tracking-tight text-text sm:text-[56px]">
              Hire agents you can{" "}
              <span className="text-gradient-gold">trust</span>.
              <br className="hidden sm:block" /> Stop them{" "}
              <span className="text-gradient-gold">anytime</span>.
            </h1>
            <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-muted">
              The marketplace for AI agents on BNB Smart Chain. Discover indexed
              agents, give them hard limits, confirm their memory hash, and watch
              every action with cryptographic proof.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/marketplace" className="btn-primary shadow-glow">
                Explore agents <ArrowRight size={15} />
              </Link>
              <Link href="/submit" className="btn-ghost">
                List your agent
              </Link>
            </div>

            {/* LIVE stats — real indexer numbers, animated count-up */}
            {dir.degraded ? (
              <div className="mt-10 badge-amber">
                Indexer unreachable — directory paused
              </div>
            ) : (
              <div className="mt-10 grid w-full max-w-md grid-cols-2 gap-3">
                <div className="rounded-btn border border-border bg-surface-2/50 px-4 py-3">
                  <div className="tnum text-[28px] font-bold text-primary">
                    <CountUp to={dir.total} />
                  </div>
                  <div className="label mt-0.5">agents indexed on BSC</div>
                </div>
                <div className="rounded-btn border border-border bg-surface-2/50 px-4 py-3">
                  <div className="tnum text-[28px] font-bold text-text">
                    <CountUp to={live.length} />
                  </div>
                  <div className="label mt-0.5">listed in this directory</div>
                </div>
                {dir.stale && (
                  <p className="col-span-2 flex items-center gap-1.5 text-[12px] text-warning">
                    <Clock size={13} />
                    Cached directory — fetched{" "}
                    {dir.fetchedAt ? timeAgo(dir.fetchedAt) : "recently"}. Live
                    scores return when 8004scan responds.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right — the product itself: a LIVE featured agent in a glow frame */}
          <div className="relative animate-float">
            <div className="absolute -inset-3 -z-10 rounded-[22px] bg-gradient-to-br from-primary/20 via-transparent to-info/15 blur-2xl" />
            {featured[0] ? (
              <div className="glow-frame rounded-card border border-primary/30 bg-surface/80 p-3 backdrop-blur-md">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="label flex items-center gap-1.5">
                    <span className="dot dot-green animate-pulse" /> Live from
                    8004scan
                  </span>
                  <span className="caption">top of the directory</span>
                </div>
                <ScanAgentCard view={featured[0]} />
              </div>
            ) : (
              <div className="glow-frame flex flex-col gap-3 rounded-card border border-primary/30 bg-surface/80 p-6 text-center backdrop-blur-md">
                <Shield size={28} className="mx-auto text-primary" />
                <p className="body-sm">
                  The live directory is warming up. Featured agents appear here as
                  the indexer responds.
                </p>
                <Link href="/submit" className="link text-[13px]">
                  Submit an agent →
                </Link>
              </div>
            )}
          </div>
        </div>
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

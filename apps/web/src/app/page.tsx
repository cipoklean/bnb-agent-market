// Home — the real marketplace landing page.
// Hero + live search, the four pillar category tiles with LIVE counts,
// "Top agents right now" (score-ordered), and 3-card how-it-works /
// trust-and-safety sections. All numbers come from the live 8004scan
// directory via getDirectory — nothing invented.
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock,
  Eye,
  Grid3x3,
  HeartPulse,
  PenLine,
  Scale,
  Search,
  Settings,
  Shield,
  StopCircle,
  TrendingUp,
  Zap,
} from "lucide-react";
import ScanAgentCard from "@/components/ScanAgentCard";
import CountUp from "@/components/CountUp";
import HeroSearch from "@/components/HeroSearch";
import { PanelGlass, SectionTitle } from "@/components/ui";
import { getDirectory } from "@/lib/directory-cache";
import { timeAgo } from "@/lib/format";
import { normalizeScanEntry, dedupeAndOrder } from "@/lib/scan-normalize";
import { CATEGORY_META, CORE_CATEGORIES, type AgentCategory } from "@/lib/categories";

export const dynamic = "force-dynamic";

const CATEGORY_ICONS: Record<AgentCategory, typeof Scale> = {
  rebalancing: Scale,
  "grid-trading": Grid3x3,
  yield: TrendingUp,
  "health-factor": HeartPulse,
  other: Search,
};

const STEPS = [
  {
    icon: Search,
    title: "1. Find an agent",
    body: "Browse the live ERC-8004 directory — on-chain identity and real 8004scan scores on every card.",
  },
  {
    icon: Settings,
    title: "2. Set your limits",
    body: "Spend cap, allowed contracts, expiry — the session runs only inside the terms you set.",
  },
  {
    icon: PenLine,
    title: "3. Sign to activate",
    body: "You sign the session's SHA-256 manifest hash as confirmation proof. Revoke anytime, instantly.",
  },
];

const TRUST = [
  { icon: Shield, title: "Allowlisted contracts only", body: "The agent can only touch the contracts you list — anything else is refused." },
  { icon: Zap, title: "Spend caps on-chain", body: "Total and per-action budget caps; every spend is recorded against the session." },
  { icon: Clock, title: "Auto-expiring sessions", body: "Sessions die at their expiry — no forgotten permissions lingering on." },
  { icon: StopCircle, title: "Instant revoke", body: "One click stops the agent. No further actions execute." },
  { icon: Eye, title: "Proof on every action", body: "Each action carries a hash, signature, or receipt — the full trail is exportable." },
  { icon: Check, title: "Signed confirmation", body: "Nothing executes until you sign the manifest hash — the exact terms, fingerprinted." },
];

export default async function HomePage() {
  const dir = await getDirectory({ chainId: 56, limit: 24 });
  const live = dedupeAndOrder(dir.agents.map((raw) => normalizeScanEntry(raw, 56)));
  const top = live.slice(0, 3);

  // LIVE per-category counts from the fetched directory window.
  const counts: Record<string, number> = { all: live.length };
  for (const v of live) counts[v.category] = (counts[v.category] ?? 0) + 1;

  return (
    <div className="flex flex-col gap-16">
      {/* HERO — headline, subline, live search */}
      <section className="relative overflow-hidden rounded-card border border-border/60 bg-surface/30 px-5 py-14 sm:px-10 sm:py-20">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 hero-grid opacity-70" />
          <div className="aurora-blob -left-10 -top-16 h-72 w-72 bg-primary/25" />
          <div className="aurora-blob -right-6 top-6 h-80 w-80 bg-info/20" style={{ animationDelay: "-6s" }} />
        </div>

        <div className="flex flex-col items-start text-left">
          <div className="badge-gold mb-6 animate-pulse-glow">
            BNB Smart Chain · ERC-8004 identity · x402 payments
          </div>
          <h1 className="max-w-3xl text-[36px] font-bold leading-[1.06] tracking-tight text-text sm:text-[52px]">
            Find, compare and hire{" "}
            <span className="text-gradient-gold">verified AI agents</span> on BNB Chain
          </h1>
          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-muted">
            Live scores from 8004scan, spend-capped sessions you sign yourself,
            and one-click revoke. The front door for BSC&apos;s AI agents.
          </p>

          <HeroSearch />

          {/* LIVE stats */}
          {dir.degraded ? (
            <div className="mt-8 badge-amber">Indexer unreachable — directory paused</div>
          ) : (
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <div className="rounded-btn border border-border bg-surface-2/50 px-4 py-2.5">
                <span className="tnum text-[22px] font-bold text-primary">
                  <CountUp to={dir.total} />
                </span>
                <span className="caption ml-1.5">agents indexed on BSC</span>
              </div>
              <div className="rounded-btn border border-border bg-surface-2/50 px-4 py-2.5">
                <span className="tnum text-[22px] font-bold text-text">
                  <CountUp to={live.length} />
                </span>
                <span className="caption ml-1.5">listed in this directory</span>
              </div>
              {dir.stale && (
                <p className="flex items-center gap-1.5 text-[12px] text-warning">
                  <Clock size={13} /> Cached — fetched {dir.fetchedAt ? timeAgo(dir.fetchedAt) : "recently"}.
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* FOUR PILLAR TILES — live counts, click-through filters */}
      <section>
        <SectionTitle
          title="The four pillars"
          sub="Every category, equally deep — counts are live from the directory right now."
        />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {CORE_CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICONS[c];
            const meta = CATEGORY_META[c];
            return (
              <Link
                key={c}
                href={`/marketplace?category=${c}`}
                className="group flex flex-col gap-3 rounded-card border border-border bg-surface/40 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-primary/30 bg-primary/10 transition-colors group-hover:bg-primary/15">
                  <Icon size={20} className="text-primary" />
                </span>
                <div>
                  <div className="text-[16px] font-semibold text-text">{meta.label}</div>
                  <p className="caption mt-1">{meta.description}</p>
                </div>
                <div className="mt-auto flex items-baseline gap-1.5">
                  <span className="tnum text-[24px] font-bold text-primary">{counts[c] ?? 0}</span>
                  <span className="caption">agent{(counts[c] ?? 0) === 1 ? "" : "s"} live</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* TOP AGENTS RIGHT NOW — score-ordered live strip */}
      <section>
        <SectionTitle
          title="Top agents right now"
          sub="Sorted by 8004scan score, then feedback — the most-attested agents first."
          right={
            <Link href="/marketplace" className="link text-[13px]">
              View the full directory <ArrowRight size={12} className="inline" />
            </Link>
          }
        />
        {top.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {top.map((v) => (
              <ScanAgentCard key={v.slug} view={v} />
            ))}
          </div>
        ) : (
          <PanelGlass className="flex flex-col items-center gap-3 py-10 text-center">
            <Shield size={28} className="text-primary" />
            <p className="body-sm max-w-md">
              No verified agents in this category yet — be the first to{" "}
              <Link href="/submit" className="link">
                submit one
              </Link>
              .
            </p>
          </PanelGlass>
        )}
      </section>

      {/* HOW IT WORKS — three equal cards */}
      <section>
        <SectionTitle
          title="How it works"
          sub="From discovery to a signed session in under 90 seconds."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <PanelGlass key={s.title} className="flex flex-col gap-3 stagger">
              <span className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-primary/30 bg-primary/10">
                <s.icon size={19} className="text-primary" />
              </span>
              <h3 className="text-[17px] font-semibold text-text">{s.title}</h3>
              <p className="body-sm">{s.body}</p>
            </PanelGlass>
          ))}
        </div>
      </section>

      {/* TRUST AND SAFETY — three equal cards per row */}
      <section>
        <SectionTitle
          title="Trust and safety"
          sub="Safety is the product. Every session ships with these guarantees."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {TRUST.map((t) => (
            <PanelGlass key={t.title} className="flex flex-col gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-success/12">
                <t.icon size={16} className="text-success" />
              </span>
              <h3 className="text-[15px] font-semibold text-text">{t.title}</h3>
              <p className="body-sm !text-[13px]">{t.body}</p>
            </PanelGlass>
          ))}
        </div>
      </section>
    </div>
  );
}

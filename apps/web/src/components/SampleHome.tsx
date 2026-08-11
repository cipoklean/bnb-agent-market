"use client";
// SAMPLE MODE (dev-only, NEXT_PUBLIC_SAMPLE_DATA=1): the original home page,
// preserved verbatim against SAMPLE_AGENTS. Never used in the production path.
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
import AgentCard from "@/components/AgentCard";
import { PanelGlass, SectionTitle, Tooltip } from "@/components/ui";
import { SAMPLE_AGENTS } from "@/lib/data";

const STEPS = [
  {
    icon: Search,
    title: "1. Choose an agent",
    body: "Browse verified agents with on-chain identity, track records, and honest risk levels.",
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

export default function SampleHome() {
  const featured = SAMPLE_AGENTS.filter((a) => a.featured);
  const totalJobs = SAMPLE_AGENTS.reduce((s, a) => s + a.jobsCompleted, 0);

  return (
    <div className="flex flex-col gap-14">
      <section className="flex flex-col items-center py-10 text-center sm:py-16">
        <div className="badge-gold mb-6">
          SAMPLE MODE · BNB Smart Chain · ERC-8004 identity · x402 payments
        </div>
        <h1 className="title-page max-w-3xl !text-[34px] leading-tight sm:!text-[42px]">
          Hire agents you can trust. Stop them anytime.
        </h1>
        <p className="body-sm mt-4 max-w-xl !text-[16px]">
          A calm marketplace for AI agents on BNB Smart Chain. Discover verified agents,
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
          <span>
            <span className="tnum font-semibold text-text">{SAMPLE_AGENTS.length}</span> sample agents
          </span>
          <span>
            <span className="tnum font-semibold text-text">{totalJobs.toLocaleString()}</span> sample jobs
          </span>
          <Tooltip label="Dev-only sample data behind NEXT_PUBLIC_SAMPLE_DATA=1.">
            <span className="badge-amber !cursor-help">Sample data</span>
          </Tooltip>
        </div>
      </section>

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

      <section>
        <SectionTitle
          title="Featured agents"
          sub="Start with the most trusted agents in each vertical."
          right={
            <Link href="/marketplace" className="link text-[13px]">
              View all agents <ArrowRight size={12} className="inline" />
            </Link>
          }
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featured.map((a) => (
            <AgentCard key={a.id} agent={a} />
          ))}
        </div>
      </section>
    </div>
  );
}

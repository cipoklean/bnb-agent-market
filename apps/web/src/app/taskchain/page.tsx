"use client";
// TaskChain Bazaar — productivity & automation vertical landing
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
import AgentCard from "@/components/AgentCard";
import { PanelGlass, SectionTitle } from "@/components/ui";
import { AGENTS } from "@/lib/data";

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

export default function TaskChainPage() {
  const agents = AGENTS.filter((a) => a.vertical === "taskchain");

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
          reporting. Each one is scoped to a narrow job with a strict allowlist — the
          safest agents on the market.
        </p>
        <Link href="/marketplace?cat=taskchain" className="btn-primary mt-6">
          Browse TaskChain agents <ArrowRight size={15} />
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

      {/* Agents */}
      <section>
        <SectionTitle
          title="TaskChain agents"
          sub="Narrow-scope agents with read-only or single-contract permissions."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((a) => (
            <AgentCard key={a.id} agent={a} />
          ))}
        </div>
      </section>

      {/* Note */}
      <section className="grid gap-4 lg:grid-cols-2">
        <PanelGlass className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Shield size={15} className="text-success" />
            <h3 className="title-card">Why TaskChain agents are low-risk</h3>
          </div>
          <p className="body-sm">
            The Portfolio Reporter is strictly read-only — no transaction execution,
            reports only. The DAO Vote Executor can only call the governor contract's
            vote function. The Airdrop Claimer can only call the claim contract and is
            restricted to delivering to your account.
          </p>
        </PanelGlass>
        <PanelGlass className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <ArrowRight size={15} className="text-primary" />
            <h3 className="title-card">Every session is yours to stop</h3>
          </div>
          <p className="body-sm">
            Whatever the task, every session has a memory hash you can verify, an expiry,
            a budget cap, and a stop button. You can stop the agent anytime — no action
            happens until you confirm it.
          </p>
        </PanelGlass>
      </section>
    </div>
  );
}

"use client";
// AlphaDesk — DeFi & trading vertical landing (PancakeSwap agents)
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
import AgentCard from "@/components/AgentCard";
import { PanelGlass, SectionTitle, Tooltip, TrustNote } from "@/components/ui";
import { AGENTS } from "@/lib/data";
import { PANCAKE_STATUS } from "@/lib/adapters/pancake";
import { X402_STATUS } from "@/lib/adapters/x402";

const SAFETY = [
  { icon: Lock, title: "Spend caps", body: "You can set a spending limit — total and per action." },
  { icon: Shield, title: "Allowlisted contracts", body: "Allowed PancakeSwap contracts only. Anything else is refused." },
  { icon: Zap, title: "Simulation first", body: "Every move is simulated before anything executes." },
  { icon: Clock, title: "Automatic expiry", body: "This session expires automatically after the time you choose." },
  { icon: StopCircle, title: "Revoke anytime", body: "You can stop the agent anytime — instantly." },
];

export default function AlphaDeskPage() {
  const agents = AGENTS.filter((a) => a.vertical === "alphadesk");

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
          DeFi and trading agents on BNB Smart Chain. LP rebalancing, yield harvesting,
          and protected swaps — scoped to PancakeSwap contracts, bounded by your limits,
          and stoppable in one click.
        </p>
        <Link href="/marketplace?cat=alphadesk" className="btn-primary mt-6">
          Browse AlphaDesk agents <ArrowRight size={15} />
        </Link>
      </section>

      {/* Agents */}
      <section>
        <SectionTitle title="AlphaDesk agents" sub="PancakeSwap automation with simulation and slippage caps." />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((a) => (
            <AgentCard key={a.id} agent={a} />
          ))}
        </div>
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
              <h3 className="title-card">Slippage caps are enforced, not promised</h3>
            </div>
            <p className="body-sm">
              Rebalances and swaps only execute when the simulated slippage fits your cap.
              If a route breaks the cap, the action is refused and recorded as a blocked
              event — proof included.
            </p>
            <div className="flex flex-wrap gap-2">
              <Tooltip label={PANCAKE_STATUS}>
                <span className="badge-gray !cursor-help !normal-case">PancakeSwap adapter: {PANCAKE_STATUS}</span>
              </Tooltip>
            </div>
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
            <Tooltip label={X402_STATUS}>
              <span className="badge-gray !cursor-help !normal-case">x402 adapter: {X402_STATUS}</span>
            </Tooltip>
          </div>
          <p className="body-sm">
            When an agent completes a task, you receive a payment request with a session
            hash. You approve it, and a receipt with a transaction hash is recorded. No
            recurring charges — each request is separate and reviewable.
          </p>
          <TrustNote>
            This demo generates labeled payment requests and receipts. Nothing moves
            on-chain.
          </TrustNote>
        </PanelGlass>
      </section>
    </div>
  );
}

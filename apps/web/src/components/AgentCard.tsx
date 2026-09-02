"use client";
// AgentCard — marketplace listing card (Lumen Deck)
import Link from "next/link";
import { ArrowRight, Check, Zap } from "lucide-react";
import { Tooltip } from "@/components/ui";
import RiskBadge from "@/components/RiskBadge";
import type { Agent } from "@/lib/types";
import { formatPercent } from "@/lib/format";

export default function AgentCard({ agent }: { agent: Agent }) {
  return (
    <div className="card card-hover flex flex-col gap-4">
      <Link href={`/agents/${agent.id}`} className="group block">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="badge-bronze">{agent.category}</span>
          <Tooltip label="On-chain proof of this agent's history.">
            <span className="badge-gold !cursor-help">ERC-8004</span>
          </Tooltip>
          {agent.verified && (
            <span className="badge-green">
              <Check size={12} /> Verified
            </span>
          )}
          {agent.verifiedVia8004 && (
            <span className="badge-green">
              <Check size={12} /> Verified via 8004scan
            </span>
          )}
        </div>

        <h3 className="title-card mt-3 transition-colors group-hover:text-primary">
          {agent.name}
        </h3>
        <p className="body-sm mt-1 line-clamp-2">{agent.tagline}</p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-btn bg-surface-2/60 px-3 py-2">
            <div className="label">Success rate</div>
            <div className="tnum mt-0.5 flex items-center gap-1 text-[14px] font-semibold text-success">
              <Check size={12} />
              {formatPercent(agent.successRate)}
            </div>
          </div>
          <div className="rounded-btn bg-surface-2/60 px-3 py-2">
            <div className="label">Jobs done</div>
            <div className="tnum mt-0.5 text-[14px] font-semibold">
              {agent.jobsCompleted.toLocaleString()}
            </div>
          </div>
          <div className="rounded-btn bg-surface-2/60 px-3 py-2">
            <div className="label">Fee</div>
            <div className="tnum mt-0.5 text-[14px] font-semibold">
              {agent.avgFee} {agent.paymentToken}
            </div>
          </div>
        </div>
      </Link>

      <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-4">
        <RiskBadge risk={agent.riskLevel} />
        <div className="flex items-center gap-2">
          <Link href={`/agents/${agent.id}`} className="btn-ghost btn-sm">
            Details <ArrowRight size={13} />
          </Link>
          <Link href={`/hire?agent=${agent.id}`} className="btn-primary btn-sm">
            <Zap size={13} /> Hire
          </Link>
        </div>
      </div>
    </div>
  );
}

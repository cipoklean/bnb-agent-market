"use client";
// Agent Profile — identity, ERC-8004, performance chart, capabilities, attestations
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Shield,
  Zap,
} from "lucide-react";
import {
  CopyText,
  EmptyState,
  Panel,
  SectionTitle,
  StatCard,
  Tooltip,
  TrustNote,
} from "@/components/ui";
import TrustPanel from "@/components/TrustPanel";
import RiskBadge from "@/components/RiskBadge";
import { getAgent } from "@/lib/data";
import { useMarket } from "@/lib/store";
import { formatAmount, formatPercent, timeAgo } from "@/lib/format";
import type { FeeModel } from "@/lib/types";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";

const FEE_LABEL: Record<FeeModel, string> = {
  fixed: "Fixed",
  pay_per_task: "Pay per task",
  subscription: "Subscription",
  performance: "Performance-based",
};

export default function AgentProfilePage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { sessions } = useMarket();
  const agent = useMemo(() => getAgent(id ?? ""), [id]);

  const liveSession = useMemo(
    () =>
      sessions.find(
        (s) =>
          s.agent_id === id &&
          (s.status === "active" || s.status === "pending_confirmation")
      ),
    [sessions, id]
  );

  if (!agent) {
    return (
      <EmptyState
        icon={<AlertTriangle size={20} />}
        title="Agent not found"
        description="This agent may have been delisted or the link is wrong."
        action={
          <Link href="/marketplace" className="btn-ghost btn-sm">
            <ArrowLeft size={13} /> Back to marketplace
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/marketplace" className="link inline-flex items-center gap-1 text-[13px]">
          <ArrowLeft size={13} /> Marketplace
        </Link>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge-blue">{agent.category}</span>
              <Tooltip label="On-chain proof of this agent's history.">
                <span className="badge-gold !cursor-help">ERC-8004</span>
              </Tooltip>
              {agent.verified && (
                <span className="badge-green">
                  <Check size={12} /> Verified
                </span>
              )}
              <RiskBadge risk={agent.riskLevel} />
            </div>
            <h1 className="title-page mt-2">{agent.name}</h1>
            <p className="body-sm mt-1 max-w-2xl">{agent.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px]">
              <span className="flex items-center gap-1.5">
                <span className="label">Agent address</span>
                <CopyText text={agent.address} />
              </span>
              <span className="flex items-center gap-1.5">
                <span className="label">Owner</span>
                <CopyText text={agent.owner} />
              </span>
              <Tooltip label="The on-chain registry id that ties this agent to its track record.">
                <span className="flex items-center gap-1.5">
                  <span className="label">ERC-8004 id</span>
                  <CopyText text={agent.agentId8004} />
                </span>
              </Tooltip>
            </div>
          </div>
          <Link href={`/hire?agent=${agent.id}`} className="btn-primary shrink-0">
            <Zap size={14} /> Hire this agent
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <StatCard
          label="Success rate"
          value={formatPercent(agent.successRate)}
          hint="Across all completed jobs"
          tone="success"
          icon={<Check size={14} />}
        />
        <StatCard
          label="Jobs completed"
          value={agent.jobsCompleted.toLocaleString()}
          hint="Track record attested on-chain"
          tone="default"
          icon={<FileText size={14} />}
        />
        <StatCard
          label="Average fee"
          value={formatAmount(agent.avgFee, agent.paymentToken)}
          hint={`${FEE_LABEL[agent.feeModel]} · ${agent.paymentToken}`}
          tone="gold"
          icon={<Zap size={14} />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Performance */}
          <Panel>
            <SectionTitle
              title="Performance"
              sub="Success rate over the last 7 months."
            />
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={agent.performance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#263043" />
                <XAxis dataKey="label" stroke="#98A2B3" fontSize={12} tickLine={false} />
                <YAxis
                  domain={[0, 100]}
                  stroke="#98A2B3"
                  fontSize={12}
                  tickLine={false}
                  width={34}
                />
                <RechartsTooltip
                  contentStyle={{
                    background: "#121826",
                    border: "1px solid #263043",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#F5F7FA" }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="Success %"
                  stroke="#F0B90B"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#F0B90B", strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Panel>

          {/* Capabilities */}
          <Panel>
            <SectionTitle
              title="Capabilities"
              sub="What this agent can do — and what each task costs."
            />
            <div className="flex flex-col gap-3">
              {agent.capabilities.map((c) => (
                <div
                  key={c.id}
                  className="rounded-btn border border-border bg-surface-2/40 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[15px] font-semibold">{c.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="badge-gray">{FEE_LABEL[c.pricingType]}</span>
                      <span className="badge-gold tnum">
                        {formatAmount(c.priceAmount, c.paymentToken)}
                      </span>
                    </div>
                  </div>
                  <p className="body-sm mt-1">{c.description}</p>
                  {c.inputSchema && c.outputSchema && (
                    <p className="caption mt-2">
                      <span className="label !inline">Input</span>{" "}
                      <span className="hash">{c.inputSchema}</span>{" "}
                      <span className="label !inline ml-2">Output</span>{" "}
                      <span className="hash">{c.outputSchema}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Panel>

          {/* Risk controls */}
          <Panel>
            <SectionTitle
              title="Risk controls"
              sub="Limits this agent works inside — you set them when you hire."
            />
            <ul className="grid gap-2 sm:grid-cols-2">
              {agent.controls.map((c) => (
                <li key={c} className="flex items-center gap-2.5 text-[14px]">
                  <Shield size={14} className="shrink-0 text-success" />
                  {c}
                </li>
              ))}
            </ul>
          </Panel>

          {/* Attestations */}
          <Panel>
            <SectionTitle
              title="Attestations"
              sub="On-chain proof of this agent's history. Every entry is verifiable."
            />
            {agent.attestations.length === 0 && (
              <p className="body-sm">No attestations recorded yet.</p>
            )}
            <div className="flex flex-col gap-3">
              {agent.attestations.map((att) => (
                <div
                  key={att.id}
                  className="rounded-btn border border-border bg-surface-2/40 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="badge-blue">{att.type.replace("_", " ")}</span>
                    <span className="caption">{timeAgo(att.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-[14px] text-text">{att.data}</p>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
                    <span className="flex items-center gap-1.5">
                      <span className="label">Attester</span>
                      <CopyText text={att.attester} />
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="label">Tx hash</span>
                      <CopyText text={att.txHash} />
                    </span>
                    <Tooltip label="The IPFS record behind this attestation.">
                      <span className="flex items-center gap-1.5">
                        <span className="label">Proof</span>
                        <CopyText text={att.proofUri} />
                      </span>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <TrustNote>
                This agent can only do what you allow. You can set a spending limit and
                stop it anytime.
              </TrustNote>
            </div>
          </Panel>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {liveSession ? (
            <TrustPanel session={liveSession} />
          ) : (
            <Panel className="flex flex-col gap-3">
              <h3 className="title-card">No active session</h3>
              <p className="body-sm">
                Create a session with limits you control — budget, allowlist, expiry,
                and instant revocation. The primary way in is the Hire button up top.
              </p>
              <Link href={`/hire?agent=${agent.id}`} className="btn-ghost mt-1">
                <ArrowRight size={14} /> Start a session
              </Link>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

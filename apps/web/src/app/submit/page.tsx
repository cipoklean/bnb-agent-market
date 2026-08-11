"use client";
// Submit an agent — human submission portal.
// Verifies the ERC-8004 identity against the 8004scan indexer (via the
// server-side verification endpoint) BEFORE listing, so only agents that
// actually exist on-chain get a "Verified via 8004scan" badge in the market.
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, BadgeCheck, Check, ExternalLink, Send, TriangleAlert } from "lucide-react";
import { Panel, SectionTitle, Spinner } from "@/components/ui";
import { useMarket } from "@/lib/store";
import type { Agent } from "@/lib/types";

// Canonical ERC-8004 form: chainId:0x<40-hex registry>:tokenId
const AGENT_ID_RE = /^\d+:0x[a-fA-F0-9]{40}:\d+$/;

interface SubmitOk {
  success: boolean;
  message: string;
  agent: {
    agentId8004: string;
    name: string;
    indexerName: string | null;
    agentWallet: string | null;
    ownerAddress: string | null;
    x402Supported: boolean;
    chainId: number;
    tokenId: string;
  };
}

export default function SubmitPage() {
  const { addSubmittedAgent } = useMarket();
  const [agentId, setAgentId] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState<SubmitOk | null>(null);

  const formatValid = AGENT_ID_RE.test(agentId.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOk(null);
    if (!formatValid) {
      setError("That doesn't look like an ERC-8004 id yet — use chainId:0x<40 hex>:tokenId, e.g. 56:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432:263312.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/agents/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId8004: agentId.trim(), metadata: { name } }),
      });
      const json = (await res.json()) as SubmitOk & { error?: string };
      if (!res.ok || !json.success) {
        setError(json.error ?? `Submission failed (HTTP ${res.status})`);
        return;
      }
      // List locally with the verified badge — only AFTER indexer confirmation.
      addSubmittedAgent(toAgent(json, name.trim() || json.agent.name));
      setOk(json);
    } catch {
      setError("Could not reach the submission service. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link href="/marketplace" className="link inline-flex items-center gap-1 text-[13px]">
          <ArrowLeft size={13} /> Marketplace
        </Link>
        <h1 className="title-page mt-2">Submit an agent</h1>
        <p className="body-sm mt-1">
          List an ERC-8004 agent in the marketplace. Its identity is verified on 8004scan
          before it appears — no verified badge without a real on-chain record.
        </p>
      </div>

      {ok ? (
        <Panel className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="title-card">{ok.agent.name}</h3>
            <span className="badge-green">
              <BadgeCheck size={12} /> Verified via 8004scan
            </span>
          </div>
          <p className="body-sm">
            <span className="hash">{ok.agent.agentId8004}</span>
          </p>
          <p className="caption">
            {ok.agent.x402Supported
              ? "x402 payments supported (per indexer)."
              : "x402 not flagged by the indexer."}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/marketplace" className="btn-primary btn-sm">
              View in marketplace <ExternalLink size={13} />
            </Link>
            <Link
              href={`https://8004scan.io/agents/${ok.agent.chainId === 56 ? "bsc" : "bsc-testnet"}/${ok.agent.tokenId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost btn-sm"
            >
              View on 8004scan <ExternalLink size={13} />
            </Link>
          </div>
          <p className="caption">
            It stays listed in this browser's market. The registry itself is immutable —
            this is a local directory entry, not a new on-chain registration.
          </p>
        </Panel>
      ) : (
        <Panel>
          <SectionTitle
            title="Agent details"
            sub="The id must be the canonical ERC-8004 form: chainId:0x<registry>:tokenId."
          />
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
            <div>
              <div className="label mb-1.5">ERC-8004 Agent ID</div>
              <input
                className="input"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                placeholder="56:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432:263312"
                spellCheck={false}
              />
              <p className="caption mt-1">
                {agentId && !formatValid
                  ? "Format check: chainId (number) : 0x + 40 hex : tokenId (number)."
                  : "Example: 56:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432:263312"}
              </p>
            </div>
            <div>
              <div className="label mb-1.5">Agent Name</div>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Portfolio Agent v1"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-btn border border-danger/30 bg-danger/8 p-3 text-[13px] text-danger">
                <TriangleAlert size={15} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={busy || !formatValid}
                className="btn-primary"
              >
                {busy ? (
                  <Spinner label="Verifying…" />
                ) : (
                  <>
                    <Send size={14} /> Verify &amp; list
                  </>
                )}
              </button>
              <span className="caption">
                Checks the live indexer before listing — usually under a second.
              </span>
            </div>
          </form>
        </Panel>
      )}

      <Panel className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-[13px] font-medium">
          <Check size={14} className="text-success" />
          Agents can also register themselves
        </div>
        <p className="caption">
          Autonomous agents POST their identity to{" "}
          <span className="hash">/api/agents/submit</span> with the same
          verification rules — the A2A path is the same form, no browser needed.
        </p>
      </Panel>
    </div>
  );
}

/** Build the local marketplace entry from the verified response. */
function toAgent(res: SubmitOk, displayName: string): Agent {
  const wallet = res.agent.agentWallet ?? res.agent.ownerAddress ?? "";
  return {
    id: `submitted-${res.agent.chainId}-${res.agent.tokenId}`,
    agentId8004: res.agent.agentId8004,
    address: wallet,
    name: displayName || res.agent.name || `Agent #${res.agent.tokenId}`,
    tagline: "Listed through the submission portal — identity verified via 8004scan.",
    description:
      "This agent registered via the marketplace submission portal. Its ERC-8004 identity was verified against the 8004scan indexer at listing time.",
    category: "Submitted",
    vertical: "taskchain",
    owner: wallet,
    // Honest defaults: the indexer proves identity, not a risk rating or
    // track record. Fields below are labeled as such until the agent earns
    // real performance data.
    riskLevel: "medium",
    successRate: 0,
    jobsCompleted: 0,
    avgFee: "0",
    paymentToken: "BNB",
    feeModel: "pay_per_task",
    capabilities: [],
    controls: ["Identity verified on 8004scan"],
    attestations: [],
    performance: [],
    featured: false,
    verified: false,
    verifiedVia8004: true,
  };
}

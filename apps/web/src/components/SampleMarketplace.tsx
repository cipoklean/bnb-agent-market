// Sample Marketplace — displays agents from the verified submission portal
// and the live 8004scan indexer. No mock/demo agents are rendered.
//
// Agents appear here after being verified via ERC-8004 on-chain registry
// or submitted through the /submit portal.
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  ExternalLink,
  Download,
  FileText,
  Shield,
  TriangleAlert,
  Spinner,
} from "lucide-react";
import { Panel, SectionTitle } from "@/components/ui";
import { useMarket } from "@/lib/store";
import type { Agent } from "@/lib/types";
import { timeAgo } from "@/lib/format";

export default function SampleMarketplace() {
  const { submittedAgents } = useMarket();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In production, agents are loaded from the verified submission portal
    // or the live 8004scan indexer. No mock/demo data.
    setAgents(submittedAgents);
    setLoading(false);
  }, [submittedAgents]);

  if (loading) {
    return (
      <Panel>
        <Spinner label="Loading agents…" />
      </Panel>
    );
  }

  if (agents.length === 0) {
    return (
      <Panel>
        <SectionTitle title="No Verified Agents" subtitle="No agents currently listed." />
        <div className="mt-4">
          <p>
            No agents are currently listed. Submit an agent via the{" "}
            <Link href="/submit" className="font-medium">
              <Download size={14} /> submission portal
            </Link>{" "}.
            Agents will appear after ERC-8004 on-chain verification.
          </p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <SectionTitle title="Verified Agents" subtitle={`${agents.length} agent(s) listed`} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
          >
            <h3 className="text-[15px] font-medium capitalize">{agent.name}</h3>
            <p className="caption text-muted-foreground truncate">
              {agent.tagline || "ERC-8004 verified agent"}
            </p>
            <div className="mt-2 flex gap-2">
              <Link
                href={`/agents/${agent.id}`}
                className="text-primary hover underline cursor-pointer"
              >
                View Details
              </Link>
              <Link
                href={`https://8004scan.io/agents/${agent.chainId === 56 ? "bsc" : "bsc-testnet"}/${agent.tokenId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover underline cursor-pointer"
              >
                View on 8004scan
              </Link>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
// ERC-8004 adapter — agent identity + track record.
// STATUS: KNOWN. IdentityRegistry verified on BSC mainnet/testnet (memory/INTEGRATIONS.md,
// docs/research/ERC8004_RESEARCH_DOSSIER.md; live RPC check 2026-08-11).
// Live metrics for the mainnet-registered agent (tokenId 263312, Phase 2 evidence in
// docs/submission/evidence/) are read from the AltLayer 8004scan public REST API.
// Every other agent keeps the labeled demo data so the marketplace stays deterministic.
import { AGENTS, DEMO_MODE } from "../data";
import type { Agent, Erc8004ScanMetrics } from "../types";

export interface IErc8004Adapter {
  getAgentById(agentId: string): Promise<Agent | null>;
  getAgentByAddress(address: string): Promise<Agent | null>;
  listAgents(vertical?: "alphadesk" | "taskchain"): Promise<Agent[]>;
  getAttestations(agentId: string): Promise<Agent["attestations"]>;
  getLiveScanMetrics(agentId: string): Promise<Erc8004ScanMetrics | null>;
}

export const ERC8004_STATUS =
  "KNOWN — IdentityRegistry verified; live 8004scan reads for mainnet agent 263312 (demo fallback for others)" as const;

// The marketplace agent linked to our live ERC-8004 mainnet registration (Phase 2).
export const MAINNET_AGENT_LINK = {
  agentId: "portfolio-reporter",
  chainId: 56,
  tokenId: "263312",
  scanSlug: "bsc",
  scanUrl: "https://8004scan.io/agents/bsc/263312",
  apiUrl: "https://8004scan.io/api/v1/public/agents/56/263312",
  // Same-origin proxy (apps/web/src/app/api/8004scan/[chainId]/[tokenId]/route.ts):
  // 8004scan.io's first-resolved IP is blackholed from some networks and browsers
  // time out instead of rotating; the server route probes resolved IPs directly.
  proxyUrl: "/api/8004scan/56/263312",
} as const;

// Browser-side cap for the same-origin proxy call; the proxy has its own bound
// (3 IPs x 2.5s + plain-fetch fallback < 10s). On any failure below we fall
// back to demo data (console.warn) — the page never hangs.
const SCAN_FETCH_TIMEOUT_MS = 7_000;

const delay = () => new Promise((r) => setTimeout(r, 60));

// Maps the 8004scan API payload (snake_case) to our typed metrics (camelCase).
// Defensive: missing/odd values become null instead of breaking the UI.
function mapScanMetrics(d: Record<string, unknown>): Erc8004ScanMetrics {
  const num = (v: unknown): number | null => (typeof v === "number" ? v : null);
  return {
    chainId: Number(d.chain_id ?? 0),
    tokenId: String(d.token_id ?? ""),
    agentId: String(d.agent_id ?? ""),
    name: String(d.name ?? ""),
    totalScore: num(d.total_score),
    averageScore: num(d.average_score),
    healthScore: num(d.health_score),
    totalFeedbacks: Number(d.total_feedbacks ?? 0),
    x402Supported: Boolean(d.x402_supported),
    isActive: Boolean(d.is_active),
    isTestnet: Boolean(d.is_testnet),
    createdAt: String(d.created_at ?? ""),
    updatedAt: String(d.updated_at ?? ""),
    sourceUrl: MAINNET_AGENT_LINK.apiUrl,
    fetchedAt: new Date().toISOString(),
  };
}

export const erc8004Adapter: IErc8004Adapter = {
  async getAgentById(agentId) {
    await delay();
    const agent = AGENTS.find((a) => a.id === agentId) ?? null;
    if (!agent || agentId !== MAINNET_AGENT_LINK.agentId) return agent;
    // Our mainnet agent: merge real 8004scan metrics onto local metadata.
    // getLiveScanMetrics never throws — it returns null on failure, so the
    // page gracefully keeps the deterministic mock data.
    const metrics = await this.getLiveScanMetrics(agentId);
    return { ...agent, scanMetrics: metrics };
  },
  async getAgentByAddress(address) {
    await delay();
    return AGENTS.find((a) => a.address.toLowerCase() === address.toLowerCase()) ?? null;
  },
  async listAgents(vertical) {
    await delay();
    return vertical ? AGENTS.filter((a) => a.vertical === vertical) : AGENTS;
  },
  async getAttestations(agentId) {
    await delay();
    return AGENTS.find((a) => a.id === agentId)?.attestations ?? [];
  },
  async getLiveScanMetrics(agentId) {
    // Only the mainnet-registered agent gets a real fetch; every other id
    // returns null (callers keep demo data — marketplace stays deterministic).
    if (agentId !== MAINNET_AGENT_LINK.agentId) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SCAN_FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(MAINNET_AGENT_LINK.proxyUrl, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`8004scan proxy HTTP ${res.status}`);
      const body = (await res.json()) as { success?: boolean; data?: Record<string, unknown> };
      if (!body?.success || !body?.data) throw new Error("8004scan envelope missing data");
      return mapScanMetrics(body.data);
    } catch (err) {
      // Graceful fallback: page keeps mock data; never break the UI.
      console.warn(
        "[erc8004] 8004scan live metrics unavailable for",
        MAINNET_AGENT_LINK.apiUrl,
        "— falling back to demo data:",
        err instanceof Error ? err.message : err
      );
      return null;
    } finally {
      clearTimeout(timer);
    }
  },
};

export const erc8004DemoNote = DEMO_MODE
  ? "Demo adapter for non-registered agents — ERC-8004 identity shown from labeled demo data. The mainnet agent (Portfolio Reporter) reads LIVE metrics from the 8004scan API."
  : "";

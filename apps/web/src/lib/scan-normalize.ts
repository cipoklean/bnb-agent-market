// Live directory normalizers — pure functions shared by server components
// (marketplace / verticals / home) and client pages (agent detail, hire).
// No node imports and NO app-data imports: safe in both the server and
// browser bundles, and directly importable by node tests via strip-types.
import type { Agent, Capability, Erc8004ScanMetrics } from "./types";

export interface LiveAgentView {
  slug: string; // scan-{chainId}-{tokenId} (or submitted-* for local submissions)
  chainId: number;
  tokenId: string;
  canonicalId: string; // chainId:registry:tokenId
  registry: string;
  name: string;
  description: string;
  owner: string;
  totalScore: number | null;
  averageScore: number | null;
  healthScore: number | null;
  totalFeedbacks: number;
  x402Supported: boolean;
  verified: boolean; // indexer is_verified flag (publisher verification)
  imageUrl: string | null;
  source: "indexer" | "submission";
}

const numOrNull = (v: unknown): number | null => (typeof v === "number" ? v : null);
const strOr = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);

export function scanSlugFor(chainId: number | string, tokenId: string | number): string {
  return `scan-${chainId}-${tokenId}`;
}

/** Parse "scan-56-263312" → { chainId, tokenId }. */
export function parseScanId(id: string): { chainId: string; tokenId: string } | null {
  const m = /^scan-(\d+)-(\d+)$/.exec(id);
  return m ? { chainId: m[1], tokenId: m[2] } : null;
}

/** Parse the canonical ERC-8004 id "56:0x<40 hex>:263312". */
export function parseCanonicalId(id: string): { chainId: string; tokenId: string } | null {
  const m = /^(\d+):0x[a-fA-F0-9]{40}:(\d+)$/.exec(id);
  return m ? { chainId: m[1], tokenId: m[2] } : null;
}

export function isLiveSourced(id: string): boolean {
  return /^(scan-|submitted-)/.test(id) || parseCanonicalId(id) !== null;
}

/** One raw record from the 8004scan list endpoint → directory view-model. */
export function normalizeScanEntry(raw: Record<string, unknown>, chainId: number): LiveAgentView {
  const tokenId = String(raw.token_id ?? "").trim();
  const registry = strOr(raw.contract_address);
  return {
    slug: scanSlugFor(chainId, tokenId),
    chainId,
    tokenId,
    canonicalId: `${chainId}:${registry}:${tokenId}`,
    registry,
    name: strOr(raw.name).trim() || `Agent #${tokenId}`,
    description: strOr(raw.description),
    owner: strOr(raw.owner_address),
    totalScore: numOrNull(raw.total_score),
    averageScore: numOrNull(raw.average_score),
    healthScore: numOrNull(raw.health_score),
    totalFeedbacks: Number(raw.total_feedbacks ?? 0),
    x402Supported: raw.x402_supported === true,
    verified: raw.is_verified === true,
    imageUrl: strOr(raw.image_url).trim() || null,
    source: "indexer",
  };
}

/** Phase-4 submission-store entries → the same view-model (identity verified, no ratings). */
export function viewFromSubmission(sub: Agent): LiveAgentView {
  const parsed = parseCanonicalId(sub.agentId8004) ?? { chainId: "", tokenId: "" };
  const chainId = Number(parsed.chainId || 56);
  return {
    slug: sub.id,
    chainId,
    tokenId: parsed.tokenId || sub.id.replace(/^submitted-\d+-/, ""),
    canonicalId: sub.agentId8004,
    registry: sub.agentId8004.split(":")[1] ?? "",
    name: sub.name,
    description: sub.tagline,
    owner: sub.address,
    totalScore: null,
    averageScore: null,
    healthScore: null,
    totalFeedbacks: 0,
    x402Supported: false,
    verified: false,
    imageUrl: null,
    source: "submission",
  };
}

export function scanUrlFor(view: Pick<LiveAgentView, "chainId" | "tokenId">): string {
  const chain = view.chainId === 56 ? "bsc" : "bsc-testnet";
  return `https://8004scan.io/agents/${chain}/${view.tokenId}`;
}

export const GENERIC_CAPABILITY: Capability = {
  id: "cap-custom",
  name: "Custom session task — you set the terms",
  description: "You define the scope and the fee cap in the session terms.",
  pricingType: "pay_per_task",
  paymentToken: "BNB",
  priceAmount: "0",
};

/** Directory view → full Agent shape so existing profile/hire UI can render it. */
export function agentShapeFromView(v: LiveAgentView): Agent {
  return {
    id: v.slug,
    agentId8004: v.canonicalId,
    address: v.owner,
    name: v.name,
    tagline: "Live from the ERC-8004 directory — identity indexed by 8004scan.",
    description:
      v.description ||
      "Indexer-listed agent. Execution depends on the agent's own endpoints; your session terms (budget, allowlist, expiry, revoke) are enforced by your wallet session keys.",
    category: "Indexer-listed",
    vertical: "taskchain",
    owner: v.owner,
    // Unrated by us — no risk claim beyond the generic session guardrails.
    riskLevel: "medium",
    successRate: 0, // never displayed for live agents
    jobsCompleted: 0, // never displayed for live agents
    avgFee: "0",
    paymentToken: "BNB",
    feeModel: "pay_per_task",
    verified: false,
    verifiedVia8004: true,
    featured: false,
    capabilities: [GENERIC_CAPABILITY],
    controls: [
      "Your session limits: budget, allowlist, expiry, instant revoke",
      "Execution depends on the agent's own endpoints",
    ],
    attestations: [],
    performance: [],
  };
}

/** 8004scan "show" envelope → typed metrics (same mapping as the erc8004 adapter). */
export function metricsFromEnv(
  env: { data?: Record<string, unknown> },
  chainId: string,
  tokenId: string
): Erc8004ScanMetrics {
  const d = env.data ?? {};
  return {
    chainId: Number(d.chain_id ?? chainId),
    tokenId: String(d.token_id ?? tokenId),
    agentId: String(d.agent_id ?? `${chainId}:${strOr(d.contract_address)}:${tokenId}`),
    name: String(d.name ?? ""),
    totalScore: numOrNull(d.total_score),
    averageScore: numOrNull(d.average_score),
    healthScore: numOrNull(d.health_score),
    totalFeedbacks: Number(d.total_feedbacks ?? 0),
    x402Supported: d.x402_supported === true,
    isActive: d.is_active === true,
    isTestnet: d.is_testnet === true,
    createdAt: strOr(d.created_at),
    updatedAt: strOr(d.updated_at),
    sourceUrl: `https://8004scan.io/api/v1/public/agents/${chainId}/${tokenId}`,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Session-context agent lookup lives in lib/scan-resolve.ts (it needs the
 * dev-only sample registry); the pure view-model layer above stays import-free
 * so tests can load it directly.
 */


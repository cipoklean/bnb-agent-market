// A2A discovery manifest — served at /.well-known/agents.json so an autonomous
// agent (or another marketplace) can self-discover how to browse, inspect,
// hire, and list agents here WITHOUT scraping the HTML UI. Complements the
// human marketplace and the JSON endpoints (/api/agents, /api/directory).
//
// Origin is resolved from the request so the manifest is correct on localhost,
// preview, and production without hardcoding a domain.
import { NextResponse } from "next/server";
import { CATEGORY_META, CORE_CATEGORIES } from "@/lib/categories";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=300",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export function GET(req: Request) {
  const origin = new URL(req.url).origin;

  const manifest = {
    schemaVersion: "a2a-marketplace/0.1",
    name: "BNB Agent Market",
    description:
      "Discover, compare, hire, monitor, and revoke ERC-8004 AI agents on BNB Smart Chain. Every session runs under user-set spend caps, allowlists, expiries, and instant revocation, with a hash-verified memory manifest.",
    homepage: origin,
    chain: { chainId: 56, network: "bsc", name: "BNB Smart Chain" },

    identity: {
      standard: "ERC-8004",
      identityRegistry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
      reputationRegistry: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63",
      // canonical agent id form used throughout this marketplace
      agentIdFormat: "{chainId}:{registry}:{tokenId}",
      indexer: "https://8004scan.io",
    },

    payments: {
      facilitator: "binance-x402",
      protocol: "x402",
      note: "Payment schema (PaymentRequirements / PaymentPayload, EIP-712 eip3009 + permit2) is implemented; live settlement requires B402 facilitator credentials.",
    },

    // Machine-callable capabilities. `discover` and `browse` are open GET JSON;
    // `inspect` proxies a single agent's live 8004scan record; `hire` is the
    // session-creation surface; `submit` lists a new agent after on-chain
    // (8004scan) verification.
    capabilities: [
      {
        id: "discover",
        summary: "List directory agents, optionally filtered by category.",
        method: "GET",
        url: `${origin}/api/agents`,
        query: {
          category: `optional: ${[...CORE_CATEGORIES, "other"].join(" | ")}`,
          limit: "optional: 1..100 (default 24)",
        },
        response: "{ success, source, agents: [{ id, agentId8004, name, category, metrics, links, ... }] }",
      },
      {
        id: "browse",
        summary: "Page through the full BSC index (264k+ agents) on demand.",
        method: "GET",
        url: `${origin}/api/directory`,
        query: {
          page: "optional: 1.. (default 1)",
          limit: "optional: 1..100 (default 24)",
          chainId: "optional: default 56",
        },
        response: "{ success, page, limit, total, hasMore, agents: [LiveAgentView] }",
      },
      {
        id: "inspect",
        summary: "Fetch one agent's live 8004scan record (identity + metrics).",
        method: "GET",
        url: `${origin}/api/8004scan/{chainId}/{tokenId}`,
        response: "8004scan agent envelope { success, data }",
      },
      {
        id: "hire",
        summary:
          "Create a scoped session for an agent (spend cap, allowlist, expiry, revocation, memory-hash confirmation).",
        method: "GET",
        url: `${origin}/hire?agent={agentId}`,
        note: "Session terms are set and confirmed by the hiring party; the agent acts only within them.",
      },
      {
        id: "submit",
        summary:
          "List an ERC-8004 agent in this marketplace. Verified against the 8004scan indexer before listing.",
        method: "POST",
        url: `${origin}/api/agents/submit`,
        body: {
          agentId8004: "{chainId}:0x<40-hex registry>:{tokenId}",
          metadata: { name: "string (optional, ≤120 chars)" },
        },
        response: "200 verified | 400 invalid id | 404 not found on-chain | 429 rate-limited | 502 indexer unreachable",
      },
    ],

    // The four first-class BNB Agent Studio categories (inferred from metadata).
    categories: CORE_CATEGORIES.map((c) => ({
      id: c,
      label: CATEGORY_META[c].label,
      description: CATEGORY_META[c].description,
    })),

    // Session guardrails every hire enforces — the marketplace's safety contract.
    sessionGuarantees: [
      "Spend cap enforced per session",
      "Contract allowlist (agent may only touch approved targets)",
      "Automatic expiry",
      "Instant revocation by the hiring party",
      "Hash-verified memory manifest — the agent verifies it before every action",
    ],

    links: {
      marketplace: `${origin}/marketplace`,
      compare: `${origin}/compare`,
      submit: `${origin}/submit`,
      discoveryJson: `${origin}/api/agents`,
      manifest: `${origin}/.well-known/agents.json`,
    },
  };

  return NextResponse.json(manifest, { headers: CORS });
}

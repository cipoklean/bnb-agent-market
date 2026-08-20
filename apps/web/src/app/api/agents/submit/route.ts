// A2A Endpoint: Autonomous agents can POST here to list themselves.
// Humans use the same endpoint through /submit (the submission portal form).
// Verification is server-side via the same IP-rotation-safe 8004scan fetch the
// proxy route uses (lib/scan-server.ts) — an id only registers when the
// on-chain indexer confirms the agent exists.
//
// POST /api/agents/submit
//   { agentId8004: "56:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432:263312",
//     metadata: { name: "Portfolio Reporter v2" } }
import { NextResponse } from "next/server";
import { fetchScanAgent } from "@/lib/scan-server";

export const dynamic = "force-dynamic";

// Canonical ERC-8004 form: chainId:0x<40-hex registry address>:tokenId
// (e.g. "56:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432:263312").
const AGENT_ID_RE = /^\d+:0x[a-fA-F0-9]{40}:\d+$/;

// Abuse protection for this public, unauthenticated endpoint.
// NOTE: the limiter is a per-instance in-memory sliding window. It stops casual
// bursts/scrapers on a single serverless instance but is NOT a distributed
// guarantee — on multi-instance deploys front it with a shared store (Upstash/
// Redis) or the platform WAF for hard limits.
const MAX_BODY_BYTES = 4 * 1024; // 4 KiB — an id + a short name is <200 bytes
const RATE_LIMIT = 10; // requests
const RATE_WINDOW_MS = 60_000; // per minute, per IP
const NAME_MAX = 120;

const hits = new Map<string, number[]>();

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Sliding-window limiter. Returns true when the caller is over the limit. */
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  // Opportunistic cleanup so the map cannot grow unbounded.
  if (hits.size > 5_000) {
    hits.forEach((v, k) => {
      if (v.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(k);
    });
  }
  return recent.length > RATE_LIMIT;
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { success: false, error: "Rate limit exceeded — try again in a minute" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(RATE_WINDOW_MS / 1000)),
          "Cache-Control": "no-store",
        },
      }
    );
  }

  // Reject oversized payloads before buffering the whole body.
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return NextResponse.json(
      { success: false, error: "Request body too large" },
      { status: 413 }
    );
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { success: false, error: "Request body too large" },
      { status: 413 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const agentId8004 =
    typeof body.agentId8004 === "string" ? body.agentId8004.trim() : "";
  if (!AGENT_ID_RE.test(agentId8004)) {
    return NextResponse.json(
      {
        success: false,
        error: "agentId8004 must match chainId:0x<40 hex registry address>:tokenId",
      },
      { status: 400 }
    );
  }
  const name =
    typeof body.metadata === "object" &&
    body.metadata !== null &&
    typeof (body.metadata as Record<string, unknown>).name === "string"
      ? ((body.metadata as Record<string, unknown>).name as string).trim().slice(0, NAME_MAX)
      : "";

  const [chainId, , tokenId] = agentId8004.split(":");

  let upstream: { success?: boolean; data?: Record<string, unknown> };
  try {
    upstream = await fetchScanAgent(chainId, tokenId);
  } catch {
    return NextResponse.json(
      { success: false, error: "8004scan unreachable — try again later" },
      { status: 502 }
    );
  }

  const data = upstream.data;
  const matches =
    upstream.success === true &&
    !!data &&
    String(data.token_id) === String(Number(tokenId)) &&
    Number(data.chain_id) === Number(chainId);
  if (!matches) {
    return NextResponse.json(
      {
        success: false,
        error: `No agent found on 8004scan for ${agentId8004}`,
      },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      verified: true,
      // Honest wording: this endpoint VERIFIES the id against the on-chain
      // 8004scan indexer. It does not persist server-side (no DB in this
      // deployment) — the marketplace listing is materialised in the caller's
      // browser store, and the canonical record remains the on-chain registry.
      message:
        "Agent verified against the ERC-8004 indexer. Listing is materialised client-side; no server-side persistence.",
      agent: {
        agentId8004,
        name: name || data.name || `Agent #${tokenId}`,
        indexerName: data.name ?? null,
        agentWallet: data.agent_wallet ?? null,
        ownerAddress: data.owner_address ?? null,
        x402Supported: Boolean(data.x402_supported),
        chainId: Number(data.chain_id),
        tokenId: String(data.token_id),
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

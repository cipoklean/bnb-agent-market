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

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
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
      ? ((body.metadata as Record<string, unknown>).name as string).trim()
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
      message: "Agent registered to local directory",
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

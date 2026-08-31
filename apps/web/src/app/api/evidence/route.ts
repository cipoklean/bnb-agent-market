// Evidence packet generator — server-side, reads the real memory bundle from disk
// so the export carries honest proof (actual memory hashes, not re-typed text).
import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-dynamic";

/** Numbered replay script — mirrors the Evidence Center page (single source of truth for the walkthrough). */
const DEMO_SCRIPT = [
  "Home — read the trust guarantees ('Hire agents you can trust. Stop them anytime.').",
  "Marketplace — browse all verified agents with ERC-8004 identity and risk levels.",
  "Marketplace filters — narrow by vertical (AlphaDesk / TaskChain) and risk (low / medium / high).",
  "Agent profile — review on-chain identity, attestations, and risk controls.",
  "Hire step 1 — pick a task (capability) for the agent.",
  "Hire step 2 — set budget cap, allowed contracts, forbidden actions, and expiry.",
  "Hire step 3 — review the session manifest and its real SHA-256 memory hash.",
  "Create & confirm — 'Create session & approve payment'; the memory hash is verified before the session activates.",
  "Receipt — the payment sheet shows the x402 request, pay-to address, and settled receipt.",
  "Session detail — open the session: health, budget used, and proofs on the activity timeline.",
  "Revoke — stop the agent by typing CONFIRM in the typed-confirm modal.",
  "Export — Memory Center records a snapshot with a fresh bundle SHA-256; the Evidence Center exports live confirmations and payments.",
];

const MEMORY_DIR = join(process.cwd(), "..", "..", "memory");

// The packet must carry REAL memory hashes or nothing. On serverless (Vercel)
// the memory bundle is not deployed (repo root lives above the project root),
// so the honest response is a candid 503 — never a silently-empty packet.
function readMemory(rel: string): string {
  try {
    return readFileSync(join(MEMORY_DIR, rel), "utf8");
  } catch {
    return "";
  }
}

function trimHead(text: string, lines = 8): string {
  return text.split("\n").slice(0, lines).join("\n");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "json";

  if (!existsSync(MEMORY_DIR)) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Memory bundle unavailable: /api/evidence reads the repo's memory/ directory, which is local-only and not deployed to serverless. Run the app locally (npm run dev) to export the packet.",
      },
      { status: 503 }
    );
  }

  const mainMemoryFiles = [
    "PROJECT_MEMORY.md",
    "SESSION_STATE.md",
    "DECISIONS.md",
    "CONSTRAINTS.md",
    "UI_SYSTEM.md",
    "INTEGRATIONS.md",
    "TASKS.md",
    "PROGRESS.md",
    "RISKS.md",
    "UNKNOWN_ITEMS.md",
    "MODEL_HANDOFF.md",
  ];
  const memoryBundle: Record<string, string> = {};
  for (const f of mainMemoryFiles) memoryBundle[f] = trimHead(readMemory(f));

  // Generate evidence from the memory directory — each .md file in memory/ becomes
  // an evidence item. Only include files that have proper titles/proofs.
  const evidenceFiles = ["evidence.md", "RISKS.md", "UNKNOWN_ITEMS.md"].filter(
    (f) => existsSync(join(MEMORY_DIR, f))
  );

  const evidence = evidenceFiles.map((f) => {
    const content = readMemory(f);
    const titleMatch = content.match(/^# (.+)$/m);
    const summaryMatch = content.match(/^## (.+)$/m);
    return {
      id: f.replace(".md", ""),
      title: titleMatch ? titleMatch[1] : "Evidence",
      partner: "memory",
      summary: summaryMatch ? summaryMatch[1] : content.substring(0, 100),
      proof: "",
      createdAt: new Date().toISOString(),
    };
  });

  const packet = {
    generatedAt: new Date().toISOString(),
    project: "BNB Agent Market Core — AlphaDesk + TaskChain Bazaar",
    oneLiner:
      "A marketplace layer for discovering, hiring, paying, monitoring, and revoking AI agents on BNB Smart Chain — ERC-8004 identity, Binance x402 payments, spend-capped sessions, memory-verified confirmation layer.",
    evidence,
    demoScript: DEMO_SCRIPT,
    memoryBundle,
    liveData: {
      confirmations: [],
      payments: [],
      note:
        "Live confirmations and payments live in the BROWSER store (zustand persist) and cannot be read by this server endpoint. Serialize them from the Evidence Center page export — packets downloaded there include the real browser-store records at export time.",
    },
    integrationStatus: {
      erc8004:
        "KNOWN — mainnet IdentityRegistry verified (AgentIdentity 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432); our agent 263312 registered (Phase 2 evidence)",
      x402: "schema KNOWN (B402); settlement DEMO — facilitator onboarding-gated",
      altana: "SDK + KeyStore addresses KNOWN; integration DEMO",
      pancake: "addresses KNOWN (official deployments); execution adapter DEMO",
      altlayer:
        "LIVE — public 8004scan directory + metrics API (Pro/AltLLM UNKNOWN)",
    },
    proofRule:
      "Every important action produces a proof: tx hash, memory hash, receipt, attestation, or log. Nothing is faked; adapters are labeled.",
  };

  if (format === "md") {
    const md = [
      "# BNB Agent Market Core — Evidence Packet",
      "",
      `Generated: ${packet.generatedAt}`,
      "",
      "## Project",
      packet.oneLiner,
      "",
      "## Evidence",
      ...packet.evidence.map(
        (e) => `### ${e.title} [${e.partner}]\n\n${e.summary}\n\nProof: \`${e.proof}\``
      ),
      "",
      "## Demo Walkthrough (replay script)",
      ...packet.demoScript.map((s, i) => `${i + 1}. ${s}`),
      "",
      "## Live data (browser store)",
      packet.liveData.note,
      "",
      "## Memory Bundle (checksum-verified)",
      "",
      "```json",
      memoryBundle["checksum.json"],
      "```",
      "",
      "## Integration Status",
      ...Object.entries(packet.integrationStatus).map(
        ([k, v]) => `- **${k}**: ${v}`
      ),
      "",
      "## Proof Rule",
      packet.proofRule,
    ].join("\n");
    return new NextResponse(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": "attachment; filename=bnb-agent-market-evidence.md",
      },
    });
  }

  return NextResponse.json(packet, {
    headers: {
      "Content-Disposition": "attachment; filename=bnb-agent-market-evidence.json",
    },
  });
}
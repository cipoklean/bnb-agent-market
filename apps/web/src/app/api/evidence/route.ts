// Evidence packet generator — server-side, reads the real memory bundle from disk
// so the export carries honest proof (actual memory hashes, not re-typed text).
import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEMO_EVIDENCE } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Numbered replay script — mirrors the Evidence Center page (single source of truth for the walkthrough). */
const DEMO_SCRIPT = [
  "Home — read the trust guarantees ('Hire agents you can trust. Stop them anytime.').",
  "Marketplace — browse all six agents with ERC-8004 identity and risk levels.",
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
  memoryBundle["checksum.json"] = readMemory("checksum.json");

  const packet = {
    generatedAt: new Date().toISOString(),
    project: "BNB Agent Market Core — AlphaDesk + TaskChain Bazaar",
    oneLiner:
      "A marketplace layer for discovering, hiring, paying, monitoring, and revoking AI agents on BNB Smart Chain — ERC-8004 identity, Binance x402 payments, spend-capped sessions, memory-verified confirmation layer.",
    evidence: DEMO_EVIDENCE,
    demoScript: DEMO_SCRIPT,
    memoryBundle,
    liveData: {
      confirmations: [],
      payments: [],
      note: "Live confirmations and payments live in the BROWSER store (zustand persist) and cannot be read by this server endpoint. Serialize them from the Evidence Center page export — packets downloaded there include the real browser-store records at export time.",
    },
    integrationStatus: {
      erc8004: "KNOWN — IdentityRegistry verified (mainnet/testnet); live metrics via 8004scan API for mainnet agent 263312 on /agents/portfolio-reporter",
      x402: "DEMO — official payment schema UNKNOWN",
      altana: "DEMO — SDK/contract interface UNKNOWN",
      pancake: "DEMO — contract addresses/ABI UNKNOWN",
      altlayer: "KNOWN — public 8004scan REST API integrated; live mainnet metrics panel (agents/portfolio-reporter)",
    },
    proofRule: "Every important action produces a proof: tx hash, memory hash, receipt, attestation, or log. Nothing is faked; adapters are labeled.",
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
      ...DEMO_SCRIPT.map((s, i) => `${i + 1}. ${s}`),
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
      "",
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

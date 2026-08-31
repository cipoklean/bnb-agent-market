#!/usr/bin/env node
/**
 * scripts/register-pillar-agents.mjs — register the four-pillar agents on the
 * REAL BSC mainnet ERC-8004 Identity Registry (Build the Era rubric requires
 * all four categories surfaced with real, hireable depth).
 *
 * Uses the official bnbagent SDK flow (memory/INTEGRATIONS.md):
 *   ERC8004Agent(network="bsc-mainnet", wallet_provider=wallet)
 *     → generate_agent_uri(name, description, endpoints=[...])
 *     → register_agent(agent_uri) → { agentId, transactionHash, receipt }
 *
 * IMPORTANT (run it yourself — this script NEVER runs automatically):
 *   1) pip install bnbagent  (v0.4.2+, official BNB Chain SDK)
 *   2) export PRIVATE_KEY=0x…        — your funded mainnet key (gas per mint)
 *   3) export AGENT_ENDPOINT_URL=https://your-agent.example/.well-known/agent-card.json
 *   4) node --experimental-strip-types scripts/register-pillar-agents.mjs --confirm
 *
 * Without --confirm it prints the exact register() calls and exits (dry-run).
 * Each mint costs gas (~0.005–0.01 BNB); 4 mints total. After registering,
 * paste the agentIds into the submission text — they are the on-chain proof.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

const PILLAR_AGENTS = [
  {
    name: "AlphaDesk LP Rebalancer",
    description:
      "Rebalancing agent: manages PancakeSwap V3 LP ranges, resets out-of-range positions automatically within user-set slippage caps. Simulates every move before execution.",
    category: "rebalancing",
  },
  {
    name: "GridBot BSC",
    description:
      "Grid trading agent: places and manages automated grid orders within a price range, dollar-cost entry spacing, and per-order size caps.",
    category: "grid-trading",
  },
  {
    name: "CAKE Yield Optimiser",
    description:
      "Yield optimisation agent: routes liquidity to the highest available APR across PancakeSwap farms and vaults, auto-compounds harvests.",
    category: "yield",
  },
  {
    name: "Venus Health Guard",
    description:
      "Health factor monitoring agent: watches lending positions on Venus, alerts on collateral drift, and proposes repay actions before liquidation.",
    category: "health-factor",
  },
];

async function py(code) {
  const { stdout } = await run(process.env.PYTHON ?? "python", ["-c", code], {
    env: process.env,
  });
  return stdout.trim();
}

const confirm = process.argv.includes("--confirm");
const hasKey = Boolean(process.env.PRIVATE_KEY);
const endpoint = process.env.AGENT_ENDPOINT_URL ?? "";

console.log(`pillar-agent registration — mode: ${confirm ? "LIVE (will spend gas)" : "DRY RUN"}`);
console.log(`private key: ${hasKey ? "set" : "MISSING (required for live mode)"}`);
console.log(`A2A endpoint: ${endpoint || "not set — registration file will omit services[]"}`);
console.log("");

for (const a of PILLAR_AGENTS) {
  console.log(`— ${a.name} [${a.category}]`);
  console.log(`  ${a.description}`);
  console.log(`  register(string agentURI, MetadataEntry[]) → ERC-721 mint on 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 (BSC 56)`);
}

if (!confirm) {
  console.log("\nDry run only. Re-run with --confirm (and PRIVATE_KEY + AGENT_ENDPOINT_URL set) to mint.");
  process.exit(0);
}

if (!hasKey) {
  console.error("PRIVATE_KEY is required for live registration. Aborting.");
  process.exit(1);
}

const results = [];
for (const a of PILLAR_AGENTS) {
  const code = `
import json, os
from bnbagent import ERC8004Agent, AgentEndpoint, Wallet
wallet = Wallet(private_key=os.environ["PRIVATE_KEY"])
sdk = ERC8004Agent(network="bsc-mainnet", wallet_provider=wallet)
endpoints = []
ep = os.environ.get("AGENT_ENDPOINT_URL")
if ep:
    endpoints = [AgentEndpoint.a2a(ep)]
agent_uri = sdk.generate_agent_uri(${JSON.stringify(a.name)}, ${JSON.stringify(a.description)}, endpoints=endpoints)
result = sdk.register_agent(agent_uri=agent_uri)
print(json.dumps({"agentId": result.agentId, "tx": result.transactionHash}))
`;
  try {
    const out = await py(code);
    console.log(`✓ ${a.name} → ${out}`);
    results.push({ ...a, ...JSON.parse(out) });
  } catch (e) {
    console.error(`✗ ${a.name} failed: ${e.message}`);
    process.exitCode = 1;
  }
}

console.log("\n=== SUBMISSION TEXT (paste into hackathon submission) ===");
for (const r of results) {
  console.log(`${r.category}: ${r.name} — ${r.agentId} (tx ${r.tx})`);
}
console.log("\nNext: wait for 8004scan to index, then verify each id at https://8004scan.io/agents/bsc/<tokenId>");

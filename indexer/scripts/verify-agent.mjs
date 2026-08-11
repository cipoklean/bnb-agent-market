#!/usr/bin/env node
/**
 * verify-agent.mjs — Mainnet Bridge Phase 2: prove an ERC-8004 agent is
 * indexed by the AltLayer 8004scan public indexer.
 *
 * Usage:
 *   node indexer/scripts/verify-agent.mjs 97 <agentId>       # BSC testnet
 *   node indexer/scripts/verify-agent.mjs 56 <agentId>       # BSC mainnet
 *   node indexer/scripts/verify-agent.mjs --chainId 97 --agentId 1234
 *
 * Prints the API JSON and saves it (unchanged, verbatim) to
 * docs/submission/evidence/8004scan-verification.json.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const BASE = 'https://8004scan.io/api/v1/public';

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const chainId = Number(arg('--chainId', positional[0]));
const agentId = arg('--agentId', positional[1]);

if (!Number.isInteger(chainId) || !agentId) {
  console.error('Usage: node indexer/scripts/verify-agent.mjs <chainId> <agentId>');
  process.exit(2);
}

const url = `${BASE}/agents/${chainId}/${agentId}`;
console.log(`Fetching ${url}`);

const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
const text = await res.text();
if (!res.ok) {
  console.error(`8004scan returned HTTP ${res.status}:`);
  console.error(text.slice(0, 1000));
  process.exit(1);
}

let json;
try {
  json = JSON.parse(text);
} catch {
  console.error('8004scan returned non-JSON:');
  console.error(text.slice(0, 1000));
  process.exit(1);
}

console.log('--- 8004scan verification ---');
console.log(JSON.stringify(json, null, 2));

const data = json.data ?? json;
if (data) {
  console.log('--- summary ---');
  console.log(`agent_id      : ${data.agent_id ?? data.agentId ?? 'n/a'}`);
  console.log(`name          : ${data.name ?? 'n/a'}`);
  console.log(`total_score   : ${data.total_score ?? 'n/a'}`);
  console.log(`health_score  : ${data.health_score ?? 'n/a'}`);
  console.log(`feedback_count: ${data.feedback_count ?? data.total_feedbacks ?? 'n/a'}`);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const outDir = path.join(repoRoot, 'docs', 'submission', 'evidence');
mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, '8004scan-verification.json');
writeFileSync(outFile, JSON.stringify(json, null, 2) + '\n');
console.log(`Saved verbatim response to ${outFile}`);

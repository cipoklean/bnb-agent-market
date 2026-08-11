#!/usr/bin/env node
/**
 * tests/verify-mainnet-bridge-evidence.mjs — Mainnet Bridge Phase 2 evidence
 * verification (online; NOT part of the offline gate).
 *
 * Cross-checks the live on-chain + indexer state against the evidence files
 * written by indexer/scripts/register-agent.mjs + verify-agent.mjs:
 *   A. live 8004scan re-fetch for mainnet 56/263312 (and testnet 97/1798)
 *      — proves the indexer still serves both registrations
 *   B. independent on-chain proof via raw JSON-RPC eth_call (zero-dep, no viem):
 *      ownerOf(263312) and tokenURI(263312) on the mainnet IdentityRegistry,
 *      with tokenURI byte-equality against the saved evidence URI
 *   C. evidence artifacts (docs/submission/evidence/) cross-checked against the
 *      chain receipts (tx hashes, block, agentIds, URI decode)
 *   D. memory (TASKS / SESSION_STATE) references the real values
 *
 * Zero deps: node:child_process, node:fs, node:path, node:dns, global fetch.
 * Exits non-zero on any failure.
 *
 * Usage: node tests/verify-mainnet-bridge-evidence.mjs
 */
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve4 } from 'node:dns/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EVID = path.join(ROOT, 'docs', 'submission', 'evidence');

const WALLET = '0x3C8176953eadBeE7b9bF8C6a5d1CF1153D924E11';
const MAINNET_TX = '0xd4715ce1105898e9c5a28529271f9d505bc295db98e190f4c58d636118650c71';
const TESTNET_TX = '0xa1ae43b60b3405f155d80fec5d37b495f2c87cf8f1e8376925e01f657db8e1d0';
const MAINNET_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const MAINNET_AGENT = 263312;
const TESTNET_AGENT = 1798;
const MAINNET_RPC = 'https://bsc-dataseed.binance.org';
const SCAN = 'https://8004scan.io/api/v1/public';

let pass = 0;
let fail = 0;
const failures = [];
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; failures.push(name); console.log(`  FAIL  ${name} — ${detail}`); }
};

// --- HTTP helpers -----------------------------------------------------------
// 8004scan.io rotates 4 IPs; the first-resolved one is sometimes blackholed,
// so on connect failure re-try via curl pinned to each resolved address.
async function fetchRobust(url, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (res.ok) return { ok: true, body: await res.text() };
    } catch { /* fall through to pinned retry */ }
    try {
      let ips = [];
      try { ips = await resolve4(new URL(url).hostname); } catch { /* keep [] */ }
      for (const ip of ips) {
        const out = await new Promise((resolve) => {
          execFile('curl', ['-sS', '--max-time', '15', '--connect-timeout', '5',
            '--resolve', `${new URL(url).hostname}:443:${ip}`, url],
            { timeout: 25_000 }, (err, stdout) => resolve({ ok: !err, body: stdout }));
        });
        if (out.ok && out.body) return out;
      }
    } catch { /* try plain fetch again */ }
  }
  throw new Error(`unreachable after ${attempts} attempts: ${url}`);
}

// --- JSON-RPC (zero-dep eth_call) -------------------------------------------
function callData(selector, uint256Arg) {
  return `0x${selector}${BigInt(uint256Arg).toString(16).padStart(64, '0')}`;
}
async function ethCall(to, data) {
  const res = await fetch(MAINNET_RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to, data }, 'latest'] }),
    signal: AbortSignal.timeout(20_000),
  });
  const out = await res.json();
  if (!out.result) throw new Error(`eth_call failed: ${JSON.stringify(out.error ?? out)}`);
  return out.result;
}
function decodeString(word) {
  const hex = word.slice(2);
  const off = parseInt(hex.slice(0, 64), 16); // always 0x20 for string args
  const len = parseInt(hex.slice(off * 2, off * 2 + 64), 16);
  return Buffer.from(hex.slice(off * 2 + 64, off * 2 + 64 + len * 2), 'hex').toString('utf8');
}

// --- A. live 8004scan -------------------------------------------------------
console.log('=== A. live 8004scan re-fetch ===');
{
  const main = await fetchRobust(`${SCAN}/agents/56/${MAINNET_AGENT}`);
  const j = JSON.parse(main.body);
  const d = j.data ?? {};
  check('mainnet: success envelope', j.success === true, JSON.stringify(j).slice(0, 120));
  check('mainnet: canonical agent_id', d.agent_id === '56:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432:263312', d.agent_id);
  check('mainnet: is_testnet false', d.is_testnet === false, String(d.is_testnet));
  check('mainnet: is_active true', d.is_active === true, String(d.is_active));
  check('mainnet: x402_supported true', d.x402_supported === true, String(d.x402_supported));
  check('mainnet: created_tx_hash matches', d.created_tx_hash === MAINNET_TX, d.created_tx_hash);
  check('mainnet: owner = our wallet', (d.owner_address ?? '').toLowerCase() === WALLET.toLowerCase(), d.owner_address);

  const test = await fetchRobust(`${SCAN}/agents/97/${TESTNET_AGENT}`);
  const jt = JSON.parse(test.body);
  const dt = jt.data ?? {};
  check('testnet: canonical agent_id', dt.agent_id === '97:0x8004a818bfb912233c491871b3d84c89a494bd9e:1798', dt.agent_id);
  check('testnet: is_testnet true', dt.is_testnet === true, String(dt.is_testnet));
  check('testnet: created_tx_hash matches', dt.created_tx_hash === TESTNET_TX, dt.created_tx_hash);
}

// --- B. on-chain proof (raw JSON-RPC, no viem) ------------------------------
console.log('=== B. on-chain proof (mainnet IdentityRegistry) ===');
{
  const saved = JSON.parse(readFileSync(path.join(EVID, 'last-registration.json'), 'utf8')).agentUri;
  const ownerHex = await ethCall(MAINNET_REGISTRY, callData('6352211e', MAINNET_AGENT)); // ownerOf
  const uriHex = await ethCall(MAINNET_REGISTRY, callData('c87b56dd', MAINNET_AGENT)); // tokenURI
  const owner = `0x${ownerHex.slice(-40)}`;
  const uri = decodeString(uriHex);
  check('ownerOf(263312) = our wallet', owner.toLowerCase() === WALLET.toLowerCase(), owner);
  check('tokenURI is on-chain data URI', uri.startsWith('data:application/json;base64,'), uri.slice(0, 40));
  check('tokenURI byte-equal to saved evidence URI', uri === saved, `${uri.length} vs ${saved.length} chars`);
}

// --- C. evidence artifacts --------------------------------------------------
console.log('=== C. evidence artifacts cross-check ===');
{
  const reg = JSON.parse(readFileSync(path.join(EVID, 'last-registration.json'), 'utf8'));
  check('last-registration: agentId 263312 / mainnet', reg.agentId === '263312' && reg.chainId === 56, `${reg.agentId}/${reg.chainId}`);
  check('last-registration: tx matches', reg.transactionHash === MAINNET_TX, reg.transactionHash);
  check('last-registration: receipt success + block', reg.receipt.status === 'success' && reg.receipt.blockNumber === '115236467', JSON.stringify(reg.receipt));
  check('last-registration: URI decodes to Portfolio Reporter v1', (() => {
    try {
      const doc = JSON.parse(Buffer.from(reg.agentUri.split(',')[1], 'base64').toString('utf8'));
      return doc.name === 'Portfolio Reporter v1' && doc.x402Support === true && doc.type.includes('eip-8004');
    } catch { return false; }
  })(), 'URI decode failed');

  const scan = JSON.parse(readFileSync(path.join(EVID, '8004scan-verification.json'), 'utf8')).data ?? {};
  check('8004scan-verification.json: mainnet agent', scan.agent_id === '56:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432:263312', scan.agent_id);
  check('8004scan-verification.json: tx matches', scan.created_tx_hash === MAINNET_TX, scan.created_tx_hash);

  const scanT = JSON.parse(readFileSync(path.join(EVID, '8004scan-verification-testnet.json'), 'utf8')).data ?? {};
  check('testnet verification preserved', scanT.agent_id === '97:0x8004a818bfb912233c491871b3d84c89a494bd9e:1798', scanT.agent_id);
  check('testnet tx preserved', scanT.created_tx_hash === TESTNET_TX, scanT.created_tx_hash);

  const regT = JSON.parse(readFileSync(path.join(EVID, 'last-registration-testnet.json'), 'utf8'));
  check('testnet registration preserved', regT.agentId === '1798' && regT.chainId === 97, `${regT.agentId}/${regT.chainId}`);

  const md = readFileSync(path.join(EVID, 'agent-registration.md'), 'utf8');
  check('agent-registration.md: embeds both txs', md.includes(MAINNET_TX) && md.includes(TESTNET_TX), 'tx missing');
  check('agent-registration.md: embeds both agents', md.includes('263312') && md.includes('1798'), 'agentId missing');
  check('agent-registration.md: embeds both registries',
    md.includes('0x8004A169FB4a3325136EB29fA0ceB6D2e539a432') && md.includes('0x8004A818BFB912233c491871b3d84c89A494BD9e'), 'registry missing');
}

// --- D. memory --------------------------------------------------------------
console.log('=== D. memory references real values ===');
{
  const tasks = readFileSync(path.join(ROOT, 'memory', 'TASKS.md'), 'utf8');
  const sess = readFileSync(path.join(ROOT, 'memory', 'SESSION_STATE.md'), 'utf8');
  check('TASKS: Phase 2 DONE both legs', /Phase 2: Register test agents on BNB Chain — \*\*DONE both legs/.test(tasks), 'not marked done');
  check('TASKS: mainnet agentId + tx', tasks.includes('263312') && tasks.includes(MAINNET_TX), 'mainnet values missing');
  // SESSION_STATE's Next Best Action tracks the CURRENT bridge phase — it moved
  // 3→4 when Phase 3's ERC-8004 slice completed (2026-08-11), and 4→final
  // review when Phase 4 (production architecture) completed (2026-08-11).
  // Bump this assertion whenever a phase completes; it guards against stale memory.
  check('SESSION_STATE: Next Best Action = final review (Phase 4 done)', /Next Best Action: Final review \+ submission pack/.test(sess), 'next action wrong');
  check('SESSION_STATE: mainnet mint verified', sess.includes('263312') && (sess.includes(MAINNET_TX) || sess.includes('0xd4715ce1…650c71')), 'mainnet values missing');
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
if (fail > 0) { console.log('FAILED:', failures.join(', ')); process.exit(1); }

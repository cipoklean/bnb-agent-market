#!/usr/bin/env node
/**
 * BNB Agent Market Core — Easy Session Memory (ESM) demo (agent runner).
 *
 * ZERO dependencies (plain Node ESM). Run:
 *     node agent-runner/demo-esm.mjs
 *
 * Demonstrates the spec's AGENT RUNTIME RULES end-to-end:
 *   1. load ESM (session manifest) before acting
 *   2. verify session hash          (sha256 over canonical JSON, matches packages/memory)
 *   3. verify permissions           (packages/confirmation logic, inlined)
 *   4. verify budget
 *   5. verify expiry
 *   6. simulate before executing
 *   7. stop if unsure               -> scenario 2 proves a forbidden action is BLOCKED
 *   8. write action to event log    -> appends one JSON line to agent-runner/log.jsonl
 *   9. produce proof                -> 0x sha256-derived mock tx hash
 *  10. update session memory after action
 *
 * NOTE: all on-chain addresses (PancakeSwap, x402, ERC-8004) are UNKNOWN — everything
 * touching them here is an explicit MOCK, never real chain data. The execution itself
 * is a simulation; no funds move and no transactions are broadcast.
 */

import { createHash } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_PATH = join(__dirname, 'log.jsonl');

/* ============================ canonical JSON + sha256 ============================ */
/** Same canonicalization as packages/memory: sorted keys, no whitespace. */
function canonicalStringify(value) {
  if (value === null || value === undefined) return JSON.stringify(value ?? null);
  const t = typeof value;
  if (t === 'number' || t === 'boolean' || t === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(',')}]`;
  if (t === 'object') {
    const obj = value;
    return `{${Object.keys(obj)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`)
      .join(',')}}`;
  }
  throw new Error(`cannot canonicalize value of type ${t}`);
}

function sha256Hex(str) {
  return createHash('sha256').update(str).digest('hex');
}

/** 0x + sha256(canonical(manifest minus memory_hash)) — matches packages/memory.manifestHash. */
function computeManifestHash(manifest) {
  const clone = { ...manifest };
  delete clone.memory_hash;
  return `0x${sha256Hex(canonicalStringify(clone))}`;
}

/* ============================ confirmation gate (inlined) ============================ */
/**
 * Mirrors packages/confirmation.checkGate. Returns { allowed, reasons }.
 * An action must pass ALL of: hash, permissions, budget, expiry.
 */
function checkGate(manifest, action, spentSoFar = 0) {
  const reasons = [];

  // 1. Session hash.
  const expectedHash = computeManifestHash(manifest);
  const hashOk = Boolean(
    manifest.memory_hash && manifest.memory_hash.toLowerCase() === expectedHash.toLowerCase()
  );
  if (!hashOk) {
    reasons.push(
      `SESSION HASH FAIL: manifest.memory_hash=${manifest.memory_hash} != sha256(canonical)=${expectedHash}`
    );
  }

  // 2. Permissions (unified semantics): empty allowed_targets / allowed_selectors =
  //    unconstrained — they never block on their own. forbidden_actions ALWAYS denies.
  const p = manifest.permissions ?? { allowed_targets: [], allowed_selectors: [], forbidden_actions: [] };
  if (Array.isArray(p.forbidden_actions) && p.forbidden_actions.includes(action.selector)) {
    reasons.push(`PERMISSIONS FAIL: selector '${action.selector}' is forbidden`);
  }
  if (Array.isArray(p.allowed_targets) && p.allowed_targets.length > 0 && !p.allowed_targets.includes(action.target)) {
    reasons.push(`PERMISSIONS FAIL: target '${action.target}' not in allowed_targets`);
  }
  if (Array.isArray(p.allowed_selectors) && p.allowed_selectors.length > 0 && !p.allowed_selectors.includes(action.selector)) {
    reasons.push(`PERMISSIONS FAIL: selector '${action.selector}' not in allowed_selectors`);
  }

  // 3. Budget.
  const b = manifest.budget ?? { token: '?', max_total: 0, max_per_action: 0 };
  if (action.amount > b.max_per_action) {
    reasons.push(`BUDGET FAIL: amount ${action.amount} > max_per_action ${b.max_per_action}`);
  }
  if (spentSoFar + action.amount > b.max_total) {
    reasons.push(`BUDGET FAIL: spent ${spentSoFar} + amount ${action.amount} > max_total ${b.max_total}`);
  }

  // 4. Expiry.
  const expiryMs = Date.parse(manifest.expiry);
  if (Number.isNaN(expiryMs) || expiryMs <= Date.now()) {
    reasons.push(`EXPIRY FAIL: expiry ${manifest.expiry} is not in the future`);
  }

  return { allowed: reasons.length === 0, reasons, hashOk, expectedHash };
}

/* ============================ manifest builder ============================ */
/** Build the ESM session manifest for agent 'alpha-lp-rebalancer' per spec. */
function buildManifest() {
  const now = Date.now();
  return {
    session_id: 'sess-demo-alpha-lp-rebalance-001',
    product: 'bnb-agent-market-core',
    user_address: '0xUserDemo00000000000000000000000000000001',
    agent_id: 'agent-alpha-lp-rebalancer',
    agent_erc8004_id: '8004:0x0000000000000000000000000000000000000001', // PLACEHOLDER — official registry UNKNOWN
    scope: 'lp_rebalance',
    budget: { token: 'BNB', max_total: 5, max_per_action: 2 },
    permissions: {
      allowed_targets: ['0xPancakeSwapV3Router', '0xPancakeSwapPositionManager'],
      allowed_selectors: ['rebalance', 'collectFees'],
      forbidden_actions: ['transfer', 'withdrawToExternal'],
    },
    expiry: new Date(now + 7 * 86_400_000).toISOString(), // +7 days
    payment: { method: 'x402', amount: 0.4, currency: 'BNB', ref: 'x402-demo-req-0001' },
    created_at: new Date(now).toISOString(),
    status: 'active',
  };
}

/* ============================ printing helpers ============================ */
function section(title) {
  console.log(`\n${'='.repeat(72)}\n${title}\n${'='.repeat(72)}`);
}

function printManifest(manifest) {
  console.log('Session manifest (Easy Session Memory):');
  console.log(JSON.stringify(manifest, null, 2));
}

function printGateChecks(manifest, action, gate, spentSoFar) {
  console.log(`\nConfirmation gate — action { target: ${action.target}, selector: ${action.selector}, amount: ${action.amount} }`);
  console.log(`  [1/5] session hash  : ${gate.hashOk ? 'OK' : 'FAIL'}  (${manifest.memory_hash})`);
  const p = manifest.permissions;
  const targetOk = !p.allowed_targets.length || p.allowed_targets.includes(action.target);
  const selectorOk = (!p.allowed_selectors.length || p.allowed_selectors.includes(action.selector)) && !p.forbidden_actions.includes(action.selector);
  console.log(`  [2/5] permissions   : ${targetOk && selectorOk ? 'OK' : 'FAIL'}  (target allowed=${targetOk}, selector allowed=${selectorOk})`);
  console.log(`  [3/5] budget        : ${action.amount <= manifest.budget.max_per_action && spentSoFar + action.amount <= manifest.budget.max_total ? 'OK' : 'FAIL'}  (amount=${action.amount}, max_per_action=${manifest.budget.max_per_action}, spent=${spentSoFar}, max_total=${manifest.budget.max_total})`);
  const expiryMs = Date.parse(manifest.expiry);
  console.log(`  [4/5] expiry        : ${expiryMs > Date.now() ? 'OK' : 'FAIL'}  (${manifest.expiry})`);
  console.log(`  [5/5] verdict       : ${gate.allowed ? 'ALLOWED' : 'BLOCKED'}`);
}

function printSubAgentResult(r) {
  section('SUB-AGENT RESULT');
  console.log(`Task                : ${r.task}`);
  console.log(`Result              : ${r.result}`);
  console.log(`Proof               : ${r.proof}`);
  console.log(`Memory Hash         : ${r.memoryHash}`);
  console.log(`Events              : ${r.events}`);
  console.log(`Errors              : ${r.errors}`);
  console.log(`Next Recommendation : ${r.next}`);
}

/* ============================ event log ============================ */
function appendJsonLog(entry) {
  appendFileSync(LOG_PATH, `${JSON.stringify(entry)}\n`, 'utf8');
}

/* ============================ scenarios ============================ */
/** Scenario 1: allowed action — full happy path with mock execution + proof + log. */
function runAllowedScenario(manifest) {
  section('SESSION MANIFEST CONFIRMATION');
  printManifest(manifest);

  const action = { target: '0xPancakeSwapV3Router', selector: 'rebalance', amount: 1.5 };
  const spentSoFar = 0;
  const gate = checkGate(manifest, action, spentSoFar);
  printGateChecks(manifest, action, gate, spentSoFar);

  if (!gate.allowed) {
    printSubAgentResult({
      task: `rebalance BNB/USDT position via ${action.target}`,
      result: 'BLOCKED by confirmation gate (unexpected — see reasons)',
      proof: 'none (not executed)',
      memoryHash: manifest.memory_hash,
      events: 'none (not logged)',
      errors: gate.reasons.join(' | '),
      next: 'stop; do not act. Re-verify manifest before retrying.',
    });
    return false;
  }

  // Rule 6: simulate before executing.
  console.log('\nSimulation (Rule 6 — before execution):');
  const simulation = {
    target: action.target,
    selector: action.selector,
    estimatedGasWei: '210000000000000',
    slippageBps: 50,
    rebalanceRequired: true,
    simulated: true,
  };
  console.log(`  ${JSON.stringify(simulation, null, 2)}`);
  console.log('  simulation passed — proceeding to mock execution.');

  // Rule 9: produce proof — mock tx hash derived from sha256 over the action.
  const proofSeed = canonicalStringify({ session_id: manifest.session_id, action, spent_after: spentSoFar + action.amount, nonce: 1 });
  const proof = `0x${sha256Hex(proofSeed)}`;
  console.log(`\nExecuted (MOCK — no tx broadcast, no funds moved): ${action.selector} on ${action.target} for ${action.amount} BNB`);
  console.log(`Proof (mock tx hash) : ${proof}`);

  // Rule 8: write action to event log (one JSON line).
  const entry = {
    ts: new Date().toISOString(),
    event: 'agent_action_executed',
    session_id: manifest.session_id,
    agent_id: manifest.agent_id,
    scope: manifest.scope,
    action: { target: action.target, selector: action.selector, amount: action.amount },
    budget: { token: manifest.budget.token, spent_after: spentSoFar + action.amount, max_total: manifest.budget.max_total },
    memory_hash: manifest.memory_hash,
    proof,
    mode: 'MOCK',
  };
  appendJsonLog(entry);

  printSubAgentResult({
    task: `rebalance BNB/USDT position via ${action.target}`,
    result: 'EXECUTED (mock) — simulation only, no on-chain tx',
    proof,
    memoryHash: manifest.memory_hash,
    events: `1 JSON line appended to agent-runner/log.jsonl (event=agent_action_executed)`,
    errors: 'none',
    next: 'record spend (1.5 BNB) on SessionRegistry + update session memory once chain integration is wired.',
  });
  return true;
}

/** Scenario 2: FORBIDDEN action — must be blocked with reasons (proves the gate). */
function runBlockedScenario(manifest) {
  section('ATTEMPT 2 — FORBIDDEN ACTION (withdrawToExternal)');
  console.log('Same session manifest (hash still valid); the agent attempts an action that');
  console.log('violates permissions. The confirmation gate MUST block it before execution.\n');

  const action = { target: '0xPancakeSwapV3Router', selector: 'withdrawToExternal', amount: 0.1 };
  const gate = checkGate(manifest, action, 0);
  printGateChecks(manifest, action, gate, 0);

  if (gate.allowed) {
    console.log('\n!! GATE BROKEN: forbidden action was allowed — this must never happen.');
    return false;
  }

  console.log('\nBlocked — reasons:');
  for (const r of gate.reasons) console.log(`  - ${r}`);
  console.log('No execution, no proof, nothing written to the event log (Rules 7 & 8).');

  printSubAgentResult({
    task: `withdrawToExternal via ${action.target} (amount 0.1 BNB)`,
    result: 'BLOCKED by confirmation gate — not executed',
    proof: 'none (not executed)',
    memoryHash: manifest.memory_hash,
    events: 'none (rejected actions are not logged)',
    errors: gate.reasons.join(' | '),
    next: 'stop; agent must not act outside its session permissions. Ask the user for a scope/permission expansion or a new session.',
  });
  return true;
}

/* ============================ main ============================ */
function main() {
  console.log('BNB Agent Market Core — Easy Session Memory (ESM) demo');
  console.log('Runtime rules: load ESM -> verify hash -> permissions -> budget -> expiry -> simulate -> execute -> proof -> log');

  const manifest = buildManifest();
  manifest.memory_hash = computeManifestHash(manifest);

  const ok1 = runAllowedScenario(manifest);
  const ok2 = runBlockedScenario(manifest);

  section('DEMO COMPLETE');
  console.log(`Allowed scenario executed : ${ok1 ? 'YES (mock)' : 'NO'}`);
  console.log(`Forbidden scenario blocked: ${ok2 ? 'YES' : 'NO'}`);
  console.log(`Event log                 : ${LOG_PATH}`);
  if (!ok1 || !ok2) process.exitCode = 1;
}

main();

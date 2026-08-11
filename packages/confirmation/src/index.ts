/**
 * Confirmation gate — REAL logic, model-independent, zero third-party dependencies
 * (node builtins only). This is the canonical implementation used by backend services;
 * agent-runner/demo-esm.mjs mirrors it inline for the zero-dependency demo.
 *
 * Per spec "AGENT RUNTIME RULES" and the Easy Session Memory (ESM) design, an action
 * is allowed only if ALL of the following hold:
 *   1. SESSION HASH — manifest.memory_hash === sha256(canonical(manifest minus hash)).
 *   2. PERMISSIONS  — action selector ∉ forbidden_actions (ALWAYS enforced), and
 *                     IF allowed_targets is non-empty the target must be in it,
 *                     IF allowed_selectors is non-empty the selector must be in it.
 *                     Empty allowed_targets / allowed_selectors = unconstrained
 *                     (read-only sessions commonly leave both empty).
 *   3. BUDGET       — amount ≤ max_per_action and spentSoFar + amount ≤ max_total.
 *   4. EXPIRY       — manifest.expiry parses and is in the future.
 *
 * Deny on any failed check. Missing/empty permission lists never block on their own;
 * forbidden_actions is the only permission list that always denies.
 */

import { createHash } from 'node:crypto';

/** An action the agent wants to perform inside a session. */
export interface ActionAttempt {
  target: string; // protocol/contract target, e.g. '0xPancakeSwapV3Router'
  selector: string; // function/action name, e.g. 'rebalance'
  amount: number; // value at stake, in manifest.budget.token units
  spentSoFar?: number; // accumulated spend for the session (default 0)
  data?: string; // optional calldata / extra context
}

/** Structural shape of a session manifest (mirrors packages/memory types). */
export interface GateManifest {
  session_id: string;
  budget: { token: string; max_total: number; max_per_action: number };
  permissions: {
    allowed_targets: string[];
    allowed_selectors: string[];
    forbidden_actions: string[];
  };
  expiry: string; // ISO timestamp
  memory_hash?: string;
}

/** Result of the gate: allowed flag plus human-readable reasons. */
export interface GateResult {
  allowed: boolean;
  reasons: string[];
}

/** Canonical JSON serializer (same output as packages/memory). */
function canonicalStringify(value: unknown): string {
  if (value === null) return 'null';
  const t = typeof value;
  if (t === 'number' || t === 'boolean') return JSON.stringify(value);
  if (t === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(',')}]`;
  if (t === 'object') {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`)
      .join(',')}}`;
  }
  throw new Error(`cannot canonicalize value of type ${t}`);
}

/** Recompute and compare the manifest's memory_hash. */
function verifyMemoryHash(manifest: GateManifest): boolean {
  if (!manifest.memory_hash) return false;
  const clone = { ...manifest } as Record<string, unknown>;
  delete clone.memory_hash;
  const expected = `0x${createHash('sha256').update(canonicalStringify(clone)).digest('hex')}`;
  return expected.toLowerCase() === manifest.memory_hash.toLowerCase();
}

/**
 * Evaluate whether an action may proceed within a session manifest.
 * @param input.manifest The session manifest (ESM) the action runs under.
 * @param input.action   The action attempt.
 * @param input.proof    Optional caller-supplied proof context (currently unused by
 *                       the gate itself; reserved for future ZK / receipt checks).
 */
export function checkGate(input: {
  manifest: GateManifest;
  action: ActionAttempt;
  proof?: unknown;
}): GateResult {
  const { manifest, action } = input;
  const reasons: string[] = [];

  // 1. Session hash.
  if (!verifyMemoryHash(manifest)) {
    reasons.push(`memory_hash mismatch: manifest hash does not match sha256(canonical(manifest))`);
  }

  // 2. Permissions (unified semantics): empty allowed_targets / allowed_selectors =
  //    unconstrained — they never block on their own. forbidden_actions ALWAYS denies.
  const { allowed_targets, allowed_selectors, forbidden_actions } = manifest.permissions ?? {
    allowed_targets: [],
    allowed_selectors: [],
    forbidden_actions: [],
  };

  if (Array.isArray(forbidden_actions) && forbidden_actions.includes(action.selector)) {
    reasons.push(`selector '${action.selector}' is in forbidden_actions`);
  }
  if (Array.isArray(allowed_targets) && allowed_targets.length > 0 && !allowed_targets.includes(action.target)) {
    reasons.push(`target '${action.target}' not in allowed_targets`);
  }
  if (Array.isArray(allowed_selectors) && allowed_selectors.length > 0 && !allowed_selectors.includes(action.selector)) {
    reasons.push(`selector '${action.selector}' not in allowed_selectors`);
  }

  // 3. Budget.
  const spent = action.spentSoFar ?? 0;
  const { max_total, max_per_action } = manifest.budget ?? { max_total: 0, max_per_action: 0 };
  if (action.amount > max_per_action) {
    reasons.push(`amount ${action.amount} > max_per_action ${max_per_action}`);
  }
  if (spent + action.amount > max_total) {
    reasons.push(`spent ${spent} + amount ${action.amount} > max_total ${max_total}`);
  }

  // 4. Expiry.
  const expiryMs = Date.parse(manifest.expiry);
  if (Number.isNaN(expiryMs) || expiryMs <= Date.now()) {
    reasons.push(`manifest expired or unparseable (expiry=${manifest.expiry})`);
  }

  return {
    allowed: reasons.length === 0,
    reasons: reasons.length === 0 ? ['all gate checks passed'] : reasons,
  };
}

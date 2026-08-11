/**
 * Session memory utilities — REAL logic, zero fake.
 *
 * Canonical JSON serialization + SHA-256 manifest hashing, matching the spec's
 * "Memory: SHA-256 checksums" layer. This is the hash checked by the confirmation
 * gate (packages/confirmation) and recorded in session manifests / JSONL event logs
 * (see agent-runner/log.jsonl and memory/events.jsonl).
 *
 * Depends only on node:crypto — no third-party packages.
 */

import { createHash } from 'node:crypto';

/** Budget approved for a session (in budget.token units). */
export interface SessionBudget {
  token: string; // symbol, e.g. 'BNB'
  max_total: number;
  max_per_action: number;
}

/** Permission constraints for a session. */
export interface SessionPermissions {
  // Unified semantics: empty allowed_targets / allowed_selectors = UNCONSTRAINED
  // (any target / any selector — read-only sessions commonly leave both empty).
  // forbidden_actions ALWAYS denies, regardless of the other two lists.
  allowed_targets: string[];
  allowed_selectors: string[];
  forbidden_actions: string[];
}

/** Payment terms attached to a session. */
export interface SessionPayment {
  method: string; // e.g. 'x402'
  amount: number;
  currency: string;
  ref?: string; // payment request id / receipt hash
}

/** Session manifest (Easy Session Memory / ESM), mirroring the spec's data model. */
export interface SessionManifest {
  session_id: string;
  product: string;
  user_address: string;
  agent_id: string;
  agent_erc8004_id: string;
  scope: string; // human-readable scope summary
  budget: SessionBudget;
  permissions: SessionPermissions;
  expiry: string; // ISO timestamp
  payment: SessionPayment;
  memory_hash?: string; // sha256 of the manifest WITHOUT this field
  created_at: string; // ISO timestamp
  status: string; // e.g. 'pending' | 'active' | 'completed' | 'revoked'
}

/**
 * Canonical JSON: object keys sorted, no whitespace. Numbers are serialized via
 * JSON.stringify (plain integers in the safe range serialize without exponent drift).
 * The same function is mirrored in packages/x402 and packages/confirmation so every
 * package stays dependency-free.
 */
export function canonicalStringify(value: unknown): string {
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

/** Serialize a manifest to its canonical string (memory_hash excluded). */
export function serializeManifest(manifest: SessionManifest): string {
  const clone = { ...manifest } as Record<string, unknown>;
  delete clone.memory_hash; // the hash must never include itself
  return canonicalStringify(clone);
}

/** Compute the manifest hash: 0x + sha256(canonical(manifest minus hash)). */
export function manifestHash(manifest: SessionManifest): string {
  return `0x${createHash('sha256').update(serializeManifest(manifest)).digest('hex')}`;
}

/** Verify that manifest.memory_hash matches the recomputed hash. */
export function verifyManifestHash(manifest: SessionManifest): boolean {
  if (!manifest.memory_hash) return false;
  const expected = manifestHash(manifest);
  return expected.toLowerCase() === manifest.memory_hash.toLowerCase();
}

/** Cheap sha256 helper for proofs and event-log entries. */
export function sha256Hex(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

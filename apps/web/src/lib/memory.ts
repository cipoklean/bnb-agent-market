// Memory layer utilities — real SHA-256 hashing + session manifest building.
// Used by Hire Wizard, Memory Center, Confirm Center, Evidence Center.
import type { SessionManifest } from "./types";
import { shortId } from "./format";

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Canonical JSON: object keys sorted, no whitespace. Numbers are serialized via
 * JSON.stringify (plain integers in the safe range serialize without exponent drift).
 * Copied VERBATIM from packages/memory/src/index.ts so web, packages, and
 * agent-runner produce identical hashes for the same manifest.
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

/** Canonical serialization of a manifest (memory_hash excluded) — same output as packages/memory. */
export function serializeManifest(m: Omit<SessionManifest, "memory_hash">): string {
  const clone = { ...m } as Record<string, unknown>;
  delete clone.memory_hash; // the hash must never include itself
  return canonicalStringify(clone);
}

/** 0x + sha256(canonical(manifest minus hash)) — identical format to packages/memory.manifestHash. */
export async function manifestHash(m: Omit<SessionManifest, "memory_hash">): Promise<string> {
  return `0x${await sha256Hex(serializeManifest(m))}`;
}

/** Build a full manifest with computed hash. */
export async function buildManifest(input: {
  product: SessionManifest["product"];
  user_address: string;
  agent_id: string;
  agent_erc8004_id: string;
  scope: SessionManifest["scope"];
  budget: SessionManifest["budget"];
  permissions: SessionManifest["permissions"];
  expiry: string;
  payment: SessionManifest["payment"];
  sessionId?: string;
  createdAt?: string;
}): Promise<SessionManifest> {
  const { sessionId, createdAt, ...rest } = input;
  const base = {
    ...rest,
    // F6 — every manifest built after the canonical-hash upgrade is stamped v2 so
    // verifiers can tell a real tamper from an old-format fingerprint.
    hash_version: "v2" as const,
    session_id: sessionId ?? shortId("ses", 8),
    created_at: createdAt ?? new Date().toISOString(),
    status: "pending_confirmation" as const,
  };
  return { ...base, memory_hash: await manifestHash(base) };
}

export async function verifyManifestHash(m: SessionManifest): Promise<boolean> {
  const { memory_hash, ...rest } = m;
  const recomputed = await manifestHash(rest as Omit<SessionManifest, "memory_hash">);
  return recomputed === memory_hash;
}

export type ManifestHashStatus = "verified" | "seed" | "pre-upgrade" | "tamper";

/**
 * F6 — three-state hash classification (single source of truth for every
 * VERIFIED/MISMATCH badge in the app):
 * - "seed":        labeled demo placeholder hash — never shown as a tamper.
 * - "verified":    stored hash matches the current recomputation (unchanged).
 * - "pre-upgrade": no hash_version — the stored hash predates the canonical
 *                  serializer upgrade, so a mismatch is expected and is NOT
 *                  evidence of tampering.
 * - "tamper":      hash_version is set to the current format yet the hash
 *                  mismatches — the manifest changed after being fingerprinted.
 */
export async function classifyManifestHash(m: SessionManifest): Promise<ManifestHashStatus> {
  if (m.hash_version === "seed") return "seed";
  if (await verifyManifestHash(m)) return "verified";
  return m.hash_version ? "tamper" : "pre-upgrade";
}

export interface MemoryAttestation {
  sessionId: string;
  project: string;
  memoryHash: string;
  currentPhase: string;
  activeProduct: string;
  confirmedGoal: string;
  knownConstraints: string[];
  completedSinceLastSession: string[];
  inProgress: string[];
  blockedUnknown: string[];
  nextBestAction: string;
  model: string;
  confirmationRequired: "YES";
}

export async function buildAttestation(input: Omit<MemoryAttestation, "memoryHash">): Promise<MemoryAttestation> {
  const payload = JSON.stringify(input);
  return { ...input, memoryHash: await sha256Hex(payload) };
}

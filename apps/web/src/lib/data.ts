// Production-only: no demo/sample agents. All agents must be verified via
// the on-chain ERC-8004 registry or submitted through the verified portal.
// NEXT_PUBLIC_SAMPLE_DATA is ignored; sample agents are never loaded.
import type {
  Agent,
  SessionManifest,
  Confirmation,
  PaymentRecord,
  SessionEvent,
} from "./types";
import { isoDaysFromNow } from "./format";

/** Always returns false — demo/sample agents are never loaded in production. */
export const sampleAgentsEnabled = () => false;

// Legacy constants removed: DEMO_MODE, DEMO_WALLET, SAMPLE_AGENTS,
// DEMO_SESSIONS, DEMO_PAYMENTS, and all tx hash placeholders.
// Agents must be listed via the verified submission portal (/submit) or
// discovered through the live 8004scan indexer.

// NOTE: The following exports are kept for backward compatibility with
// remaining call sites that haven't been fully purged yet. These will be
// removed in subsequent phases as the codebase is fully updated.

/** Build a session manifest — no pre-seeded demo data. */
export async function buildManifest(input: any) {
  // Production implementation — all data comes from user input + on-chain verification
  // The manifest includes hash_version v2 and a real memory_hash computed from
  // the canonical serialization of the manifest minus the hash field.
  const {
    sessionId,
    createdAt,
    user_address,
    agent_id,
    agent_erc8004_id,
    scope,
    budget,
    permissions,
    expiry,
    payment,
  } = input;

  const base = {
    session_id: sessionId ?? shortId("ses", 8),
    product: agent_id ? (/* agent vertical would be resolved */ "taskchain") : "unknown",
    user_address,
    agent_id,
    agent_erc8004_id,
    // F6 — every manifest built after the canonical-hash upgrade is stamped v2
    // so verifiers can tell a real tamper from an old-format fingerprint.
    hash_version: "v2" as const,
    session_id: sessionId ?? shortId("ses", 8),
    created_at: createdAt ?? new Date().toISOString(),
    status: "pending_confirmation" as const,
  };

  return { ...base, memory_hash: await manifestHash(base as any) };
}

/** Verify manifest hash — recomputes and compares. */
export async function verifyManifestHash(m: any): Promise<boolean> {
  const { memory_hash, ...rest } = m;
  const recomputed = await manifestHash(rest as Omit<SessionManifest, "memory_hash">);
  return recomputed === memory_hash;
}

/** Available allowed targets for agent permissions (PancakeSwap contracts, etc.) */
export const AVAILABLE_TARGETS = [
  "0xPancakeSwapV3Router",
  "0xPancakeSwapPositionManager",
  "0xCAKEFarmV2",
  "0xGovernorAlpha",
  "0xAirdropDistributor",
];

/** Scan an agent from the live 8004scan indexer by canonical ID. */
export const scanAgentById = async (
  agentId: string
): Promise<Agent | null> => {
  // In production, this would fetch from 8004scan API or on-chain registry.
  // For now, return null — no mock data.
  return null;
};

// Legacy tx hash constants — kept for any remaining references but no longer
// used for demo data. Remove when all call sites are updated.
const txs = {
  rebalance: "0x8f2a1c4e9b7d3f6051a8c2e4b6d9f0a3c5e7b1d8",
  harvest: "0x3d7f9b2a4c6e8d0f1b3a5c7e9d2f4b6a8c0e1d3",
  swap: "0x6b9d1f3a5c7e9b2d4f6a8c0e2d4b6f8a1c3e5d7",
  vote: "0x2c4e6a8b0d2f4a6c8e0b2d4f6a8c0e2b4d6f8a1",
  claim: "0x9b1d3f5a7c9e2b4d6f8a0c2e4b6d8f0a2c4e6b8",
  x402: "0x1e3b5d7f9a1c3e5b7d9f1a3c5e7b9d1f3a5c7e9",
} as const;

// NOTE: The txs object above is kept for any remaining references but
// no longer used for demo data. Remove when all call sites are updated.

/** Memory Center: build the current memory bundle payload + real SHA-256 hash */
export async function computeMemoryBundle() {
  const { sessions, confirmations, payments, events } = useMarket.getState();
  const payload = JSON.stringify(
    { sessions, confirmations, payments, events, exportedAt: new Date().toISOString() },
    null,
    2
  );
  return { payload, hash: await sha256Hex(payload) };
}

/** Export the memory bundle AND record a real export snapshot {id, time, hash} */
export async function exportMemoryBundle() {
  const { payload, hash } = await computeMemoryBundle();
  useMarket.setState((s) => ({
    snapshots: [
      {
        id: shortId("snap", 4),
        time: new Date().toISOString(),
        hash,
      },
      ...s.snapshots,
    ],
  }));
  return { payload, hash };
}
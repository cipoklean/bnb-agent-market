// Directory resilience — server-side single source for the live marketplace.
// Layered fallback (NO-MOCK-DATA RULE — no snapshots, no sample agents):
//   1. live indexer result via listAgents() (5-minute in-memory TTL)
//   2. true degraded (nothing available) → { agents: [], degraded: true }
//
// CRITICAL: this module runs in Next.js server components. Never use a
// relative fetch('/api/...') here — it crashes server-side rendering with
// "Failed to parse URL". Call listAgents() from ./scan-server directly.
import { listAgents, type DirectoryResult } from "./scan-server";

export type DirectorySource = "live" | "degraded";

export interface DirectoryState extends DirectoryResult {
  stale: boolean;
  source: DirectorySource;
}

const DEFAULT_TTL_MS = 5 * 60_000;

function ttlMs(): number {
  const n = Number(process.env.DIRECTORY_TTL_MS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TTL_MS;
}

let lastGood: DirectoryResult | null = null;
let lastLiveAt = 0;

/**
 * Get the live agent directory. Tries the 8004scan indexer through the
 * module-level cache (listAgents has its own 60s upstream TTL); a fresh good
 * result is served for DIRECTORY_TTL_MS (default 5 min). On indexer failure
 * returns an empty, honestly-labeled degraded state — NEVER stale mock data.
 */
export async function getDirectory(opts?: {
  chainId?: number;
  limit?: number;
}): Promise<DirectoryState> {
  const now = Date.now();

  // 1) Fresh live result within the TTL — no network hit, still "live".
  if (lastGood && now - lastLiveAt < ttlMs()) {
    return { ...lastGood, stale: false, source: "live" };
  }

  // 2) Try the live indexer (listAgents never throws — it reports degraded).
  const res = await listAgents(opts);
  if (!res.degraded && res.agents.length > 0) {
    lastGood = res;
    lastLiveAt = now;
    return { ...res, stale: false, source: "live" };
  }

  // 3) True degraded — no live result, no mock fallbacks, no snapshots.
  return {
    agents: [],
    total: 0,
    degraded: true,
    stale: false,
    source: "degraded",
    fetchedAt: new Date().toISOString(),
  };
}

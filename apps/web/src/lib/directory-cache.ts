// Directory resilience — the live marketplace must NEVER render "0 + scary
// banner" when a recent good result exists. Layered fallback, in order:
//   1. live indexer result (5-minute TTL; module-level lastGood refreshed)
//   2. in-memory lastGood  → stale: true
//   3. bundled build-time snapshot (lib/directory-snapshot.json) → stale: true
//   4. true degraded (nothing available) → { agents: [], degraded: true }
// Server-only (imports scan-server). Env overrides (dev/test only):
//   SCAN_FORCE_FAIL=1            → listAgents reports degraded (prove fallbacks)
//   DIRECTORY_TTL_MS=<ms>        → override the 5-minute TTL (tests)
//   DIRECTORY_DISABLE_SNAPSHOT=1 → skip the bundled snapshot (prove degraded)
import { listAgents, type DirectoryResult } from "./scan-server";
import snapshotJson from "./directory-snapshot.json";

export type DirectorySource = "live" | "lastGood" | "snapshot" | "degraded";

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

export async function getDirectory(opts?: {
  chainId?: number;
  limit?: number;
}): Promise<DirectoryState> {
  const now = Date.now();

  // 1) Fresh live result within the TTL — no network hit, still "live".
  if (lastGood && now - lastLiveAt < ttlMs()) {
    return { ...lastGood, stale: false, source: "live" };
  }

  // 2) Try the live indexer (listAgents never throws).
  const res = await listAgents(opts);
  if (!res.degraded && res.agents.length > 0) {
    lastGood = res;
    lastLiveAt = now;
    return { ...res, stale: false, source: "live" };
  }

  // 3) In-memory lastGood — a recent good result exists; mark stale.
  if (lastGood) {
    return { ...lastGood, stale: true, source: "lastGood" };
  }

  // 4) Bundled build-time snapshot — last known good from the last deploy.
  if (
    process.env.DIRECTORY_DISABLE_SNAPSHOT !== "1" &&
    Array.isArray((snapshotJson as { agents?: unknown }).agents) &&
    (snapshotJson as { agents: unknown[] }).agents.length > 0
  ) {
    return {
      agents: (snapshotJson as { agents: Record<string, unknown>[] }).agents,
      total: Number(
        (snapshotJson as { total?: unknown }).total ??
          (snapshotJson as { agents: unknown[] }).agents.length
      ),
      degraded: false,
      fetchedAt: String((snapshotJson as { fetchedAt?: unknown }).fetchedAt ?? ""),
      stale: true,
      source: "snapshot",
    };
  }

  // 5) True degraded — no live result, no cache, no snapshot.
  return {
    agents: [],
    total: 0,
    degraded: true,
    stale: false,
    source: "degraded",
    fetchedAt: new Date().toISOString(),
  };
}

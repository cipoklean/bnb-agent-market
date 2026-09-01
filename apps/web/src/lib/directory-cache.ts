import { listAgents, deepScanAgents, type DirectoryResult, type DeepScanResult } from "./scan-server.ts";

export type DirectorySource = "live" | "degraded";

export interface DirectoryState extends DirectoryResult {
  stale: boolean;
  source: DirectorySource;
}

export interface DeepDirectoryState {
  /** Deduped deep window (~500 newest agents), already ordered newest-first. */
  agents: Record<string, unknown>[];
  /** Indexer total for the chain. */
  total: number;
  degraded: boolean;
  /** True when this render used the shallow window while the deep scan warms. */
  partial: boolean;
  /** How many pages (×100) the deep window actually covers. */
  pagesFetched: number;
  source: DirectorySource;
  fetchedAt: string;
}

const DEFAULT_TTL_MS = 5 * 60_000;
/** How long a cold render may WAIT for the deep scan before falling back. */
const DEEP_COLD_AWAIT_MS = 4_000;

function ttlMs(): number {
  const n = Number(process.env.DIRECTORY_TTL_MS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TTL_MS;
}

let lastGood: DirectoryResult | null = null;
let lastLiveAt = 0;

// ---- Deep-scan cache: TTL + single-flight ----
let deepGood: DeepScanResult | null = null;
let deepAt = 0;
let deepInFlight: Promise<DeepScanResult> | null = null;

function deepScan(chainId: number): Promise<DeepScanResult> {
  if (!deepInFlight) {
    deepInFlight = deepScanAgents({ chainId }).finally(() => {
      deepInFlight = null;
    });
  }
  return deepInFlight;
}

/**
 * DEEP directory (~500 agents) for the landing-page pillar counts.
 *
 * Behavior:
 *   - Warm cache (< 5 min old): served instantly, zero upstream calls.
 *   - Cold: wait up to DEEP_COLD_AWAIT_MS; if the scan lands, serve it.
 *     If it doesn't (slow indexer), serve the SHALLOW window marked
 *     partial:true and let the in-flight scan finish in the background —
 *     the next render (or any render within the next 5 minutes) gets it.
 *   - Never throws; worst case mirrors the shallow degraded state.
 */
export async function getDeepDirectory(opts?: {
  chainId?: number;
}): Promise<DeepDirectoryState> {
  const chainId = opts?.chainId ?? 56;
  const now = Date.now();

  // 1) Warm deep cache — instant, no network.
  if (deepGood && !deepGood.degraded && now - deepAt < ttlMs()) {
    return {
      agents: deepGood.agents,
      total: deepGood.total,
      degraded: false,
      partial: false,
      pagesFetched: deepGood.pagesFetched,
      source: "live",
      fetchedAt: deepGood.fetchedAt,
    };
  }

  // 2) Cold — kick (or join) the single-flight scan; wait bounded time.
  //    The scan keeps running in the background either way: if it is merely
  //    slow, it lands in the cache for the NEXT render.
  const scanP = deepScan(chainId);
  const landed = await Promise.race([
    scanP,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), DEEP_COLD_AWAIT_MS)),
  ]);

  if (landed && !landed.degraded && landed.agents.length > 0) {
    deepGood = landed;
    deepAt = now;
    return {
      agents: landed.agents,
      total: landed.total,
      degraded: false,
      partial: false,
      pagesFetched: landed.pagesFetched,
      source: "live",
      fetchedAt: landed.fetchedAt,
    };
  }

  // 3) Deep result unavailable right now (slow, partial, or failed). Serve the
  //    shallow window — it has its own cache and never throws — marked
  //    partial so the UI can caption honestly. NO recursion: the background
  //    scan populates the cache for the next request on its own.
  const shallow = await getDirectory({ chainId, limit: 100 });
  if (!shallow.degraded && shallow.agents.length > 0) {
    return {
      agents: shallow.agents,
      total: shallow.total,
      degraded: false,
      partial: true,
      pagesFetched: 1,
      source: "live",
      fetchedAt: shallow.fetchedAt,
    };
  }

  // 4) Everything failed — honest degraded, never mock data.
  return {
    agents: [],
    total: 0,
    degraded: true,
    partial: false,
    pagesFetched: 0,
    source: "degraded",
    fetchedAt: new Date().toISOString(),
  };
}

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

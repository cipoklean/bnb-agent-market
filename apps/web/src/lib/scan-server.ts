// Server-side fetch for the 8004scan public REST API — shared by the
// same-origin proxy route (/api/8004scan/[chainId]/[tokenId]), the agent
// submission endpoint (/api/agents/submit), and the LIVE directory pages
// (marketplace / verticals / home, via listAgents + cached stats).
//
// Node-only (node:https + node:dns/promises) — NEVER import from client code.
// WHY the IP-probe dance: 8004scan.io rotates 4 A-record IPs and the first one
// is blackholed from some networks. Node's fetch connects to the FIRST address
// only and fails; browsers give up (~13s) instead of rotating. This probes each
// resolved address with a short per-attempt timeout (SNI keeps the TLS cert
// valid) and returns the first working response. Worst case (3 IPs x 2s +
// 4s plain-fetch fallback = 10s) stays under Vercel's 10s function cap.
import { resolve4 } from "node:dns/promises";
import https from "node:https";

export const SCAN_HOST = "8004scan.io";
const MAX_IPS = 3;
// Timeouts sized to fit Vercel's 10s hobby function cap even in the worst
// chain: 3 IPs x 2s + 4s plain-fetch fallback = 10s. Typical case (first IP
// responds) finishes in ~300ms.
const PER_IP_TIMEOUT_MS = 2_000;
const BASE_URL = `https://${SCAN_HOST}/api/v1/public`;

/** HTTPS GET to a FORCED IP with the real Host header + SNI so TLS validates. */
function ipFetch(url: string, ip: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        hostname: ip,
        port: 443,
        path: u.pathname + u.search,
        method: "GET",
        headers: { Host: u.host, Accept: "application/json" },
        servername: u.host,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          const status = res.statusCode ?? 0;
          if (status >= 200 && status < 300) {
            try {
              resolve(JSON.parse(text));
            } catch {
              reject(new Error(`upstream returned non-JSON (HTTP ${status})`));
            }
          } else {
            reject(new Error(`upstream HTTP ${status}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.setTimeout(PER_IP_TIMEOUT_MS, () => req.destroy(new Error(`ip ${ip} timed out`)));
    req.end();
  });
}

/** GET a JSON envelope from 8004scan: IP-probe all A-records, then plain fetch. */
export async function scanHttpGet(url: string): Promise<unknown> {
  let ips: string[] = [];
  try {
    ips = (await resolve4(SCAN_HOST)).slice(0, MAX_IPS);
  } catch {
    ips = [];
  }

  let upstream: unknown;
  let lastError: unknown = null;
  if (ips.length > 0) {
    for (const ip of ips) {
      try {
        upstream = await ipFetch(url, ip);
        break;
      } catch (e) {
        lastError = e;
      }
    }
  }
  if (upstream === undefined) {
    // Final fallback: plain fetch — fine on networks where DNS order works.
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(4_000) });
      upstream = await r.json();
    } catch (e) {
      lastError = e;
    }
  }
  if (upstream === undefined) {
    throw new Error(
      `8004scan unreachable: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`
    );
  }
  return upstream;
}

export function scanAgentUrl(chainId: string, tokenId: string): string {
  return `${BASE_URL}/agents/${chainId}/${tokenId}`;
}

/**
 * Fetch an agent record from 8004scan. Resolves to the parsed JSON envelope
 * ({ success, data, meta }) or throws when the API is unreachable.
 */
export async function fetchScanAgent(
  chainId: string,
  tokenId: string
): Promise<{ success?: boolean; data?: Record<string, unknown> }> {
  return (await scanHttpGet(scanAgentUrl(chainId, tokenId))) as {
    success?: boolean;
    data?: Record<string, unknown>;
  };
}

// ---- LIVE DIRECTORY (list) ----

export interface DirectoryResult {
  agents: Record<string, unknown>[];
  total: number; // agents indexed on the requested chain (indexer count, real)
  degraded: boolean; // true when the indexer was unreachable
  fetchedAt: string;
}

const LIST_CACHE_TTL_MS = 60_000;
let listCache: { key: string; at: number; value: DirectoryResult } | null = null;

/**
 * List agents from the 8004scan directory. Server-side 60s in-memory TTL so a
 * burst of page loads hits the indexer at most once a minute. NEVER throws:
 * on failure returns { agents: [], total: 0, degraded: true } so pages render
 * the degraded banner + local submissions instead of crashing.
 */
export async function listAgents({
  chainId = 56,
  limit = 24,
}: { chainId?: number; limit?: number } = {}): Promise<DirectoryResult> {
  // Dev/test affordance: SCAN_FORCE_FAIL=1 simulates an indexer outage so the
  // resilience fallbacks (lastGood / snapshot / degraded) can be walked.
  // Never set in production.
  if (process.env.SCAN_FORCE_FAIL === "1") {
    return { agents: [], total: 0, degraded: true, fetchedAt: new Date().toISOString() };
  }
  const clamped = Math.min(Math.max(1, Math.floor(limit)), 100); // API caps at 100
  const key = `${chainId}:${clamped}`;
  const now = Date.now();
  if (listCache && listCache.key === key && now - listCache.at < LIST_CACHE_TTL_MS) {
    return listCache.value;
  }
  try {
    const env = (await scanHttpGet(
      `${BASE_URL}/agents?chainId=${chainId}&limit=${clamped}`
    )) as { success?: boolean; data?: unknown; meta?: { pagination?: { total?: number } } };
    const data = Array.isArray(env?.data) ? (env.data as Record<string, unknown>[]) : [];
    const rawTotal = Number(env?.meta?.pagination?.total ?? data.length);
    // Sanitize: a malformed upstream total must never surface as a negative
    // counter (e.g. "-5,338,596"). Fall back to the page length we actually got.
    const total = Number.isFinite(rawTotal) && rawTotal >= 0 ? rawTotal : data.length;
    const value: DirectoryResult = {
      agents: data,
      total,
      degraded: false,
      fetchedAt: new Date().toISOString(),
    };
    listCache = { key, at: now, value };
    return value;
  } catch {
    return { agents: [], total: 0, degraded: true, fetchedAt: new Date().toISOString() };
  }
}

export interface BrowseResult extends DirectoryResult {
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Browse a specific PAGE of the 8004scan directory (powers "Load more" and the
 * paginated A2A route /api/directory). Unlike listAgents this is page-aware and
 * NOT cached (each page is distinct). NEVER throws: on failure returns
 * { agents: [], degraded: true, hasMore: false }. Note the public API's
 * anonymous rate limit (~10 req/min) — callers should page on demand, not eagerly.
 */
export async function browseAgents({
  chainId = 56,
  page = 1,
  limit = 24,
}: { chainId?: number; page?: number; limit?: number } = {}): Promise<BrowseResult> {
  if (process.env.SCAN_FORCE_FAIL === "1") {
    return {
      agents: [], total: 0, degraded: true, fetchedAt: new Date().toISOString(),
      page, limit, hasMore: false,
    };
  }
  const clamped = Math.min(Math.max(1, Math.floor(limit)), 100);
  const pg = Math.max(1, Math.floor(page));
  try {
    const env = (await scanHttpGet(
      `${BASE_URL}/agents?chainId=${chainId}&limit=${clamped}&page=${pg}`
    )) as {
      success?: boolean;
      data?: unknown;
      meta?: { pagination?: { total?: number; hasMore?: boolean } };
    };
    const data = Array.isArray(env?.data) ? (env.data as Record<string, unknown>[]) : [];
    const total = Number(env?.meta?.pagination?.total ?? data.length);
    const hasMore =
      typeof env?.meta?.pagination?.hasMore === "boolean"
        ? env.meta.pagination.hasMore
        : pg * clamped < total;
    return {
      agents: data,
      total: Number.isFinite(total) ? total : data.length,
      degraded: false,
      fetchedAt: new Date().toISOString(),
      page: pg,
      limit: clamped,
      hasMore,
    };
  } catch {
    return {
      agents: [], total: 0, degraded: true, fetchedAt: new Date().toISOString(),
      page: pg, limit: clamped, hasMore: false,
    };
  }
}

// ---- DEEP SCAN (pillar counts) ----

export interface DeepScanResult {
  /** Deduped agents from the first PAGES pages (newest first). */
  agents: Record<string, unknown>[];
  /** Indexer total for the chain (same as listAgents.total). */
  total: number;
  degraded: boolean;
  /** How many directory pages were actually fetched. */
  pagesFetched: number;
  fetchedAt: string;
}

const DEEP_PAGES = 5; // 5 × 100 = ~500 newest agents, one pass
const DEEP_PAGE_LIMIT = 100; // API page max

/**
 * DEEP SCAN — fetch the first DEEP_PAGES pages of the directory in ONE
 * parallel pass (~500 newest agents) so the landing-page pillar tiles
 * count real, deep examples of all four categories (a real v3-rebalancer
 * like "Warden" sits ~500 deep; a single shallow page misses it).
 *
 * Cost model (verified against the live API 2026-08-31):
 *   - 5 requests, fired in parallel — ~700ms wall-clock when the indexer
 *     is healthy, worst case bounded by the per-IP timeout.
 *   - Per-page resilience: a page that fails (timeout / rate limit / HTTP
 *     error) is simply skipped; the scan succeeds with the pages that did
 *     land (>= 1 page = success). A deep 0-rate-limit upstream still pays
 *     off: partial windows beat single-page windows.
 *   - NEVER throws. Returns degraded:true only when every page failed.
 *
 * The caller (directory-cache getDeepDirectory) adds a 5-minute TTL +
 * single-flight so a page burst costs ZERO extra upstream requests.
 */
export async function deepScanAgents({
  chainId = 56,
  pages = DEEP_PAGES,
}: { chainId?: number; pages?: number } = {}): Promise<DeepScanResult> {
  if (process.env.SCAN_FORCE_FAIL === "1") {
    return {
      agents: [], total: 0, degraded: true, pagesFetched: 0,
      fetchedAt: new Date().toISOString(),
    };
  }
  const pgCount = Math.min(Math.max(1, Math.floor(pages)), 10);
  const fetched = await Promise.all(
    Array.from({ length: pgCount }, (_, i) => i + 1).map(async (page) => {
      try {
        const env = (await scanHttpGet(
          `${BASE_URL}/agents?chainId=${chainId}&limit=${DEEP_PAGE_LIMIT}&page=${page}`
        )) as {
          success?: boolean;
          data?: unknown;
          meta?: { pagination?: { total?: number } };
        };
        const data = Array.isArray(env?.data) ? (env.data as Record<string, unknown>[]) : [];
        const rawTotal = Number(env?.meta?.pagination?.total ?? 0);
        return { data, total: Number.isFinite(rawTotal) && rawTotal >= 0 ? rawTotal : 0 };
      } catch {
        return { data: [] as Record<string, unknown>[], total: 0 };
      }
    })
  );

  // Newest-first order preserved; dedupe by agent identity (the API can
  // shift records between pages mid-scan — dedupe keeps counts honest).
  const seen = new Set<string>();
  const agents: Record<string, unknown>[] = [];
  for (const page of fetched) {
    for (const a of page.data) {
      const key = String(a.agent_id ?? a.token_id ?? a.id ?? a.name);
      if (key === "undefined" || seen.has(key)) continue;
      seen.add(key);
      agents.push(a);
    }
  }
  const pagesFetched = fetched.filter((p) => p.data.length > 0).length;
  const total = fetched.find((p) => p.total > 0)?.total ?? agents.length;

  return {
    agents,
    total,
    degraded: pagesFetched === 0,
    pagesFetched,
    fetchedAt: new Date().toISOString(),
  };
}

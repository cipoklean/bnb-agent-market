// Server-side fetch for the 8004scan public REST API — shared by the
// same-origin proxy route (/api/8004scan/[chainId]/[tokenId]) and the agent
// submission endpoint (/api/agents/submit).
//
// Node-only (node:https + node:dns/promises) — NEVER import from client code.
// WHY the IP-probe dance: 8004scan.io rotates 4 A-record IPs and the first one
// is blackholed from some networks. Node's fetch connects to the FIRST address
// only and fails; browsers give up (~13s) instead of rotating. This probes each
// resolved address with a short per-attempt timeout (SNI keeps the TLS cert
// valid) and returns the first working response. Worst case (3 IPs x 2.5s +
// plain-fetch fallback) stays under Vercel's 10s function cap.
import { resolve4 } from "node:dns/promises";
import https from "node:https";

export const SCAN_HOST = "8004scan.io";
const MAX_IPS = 3;
const PER_IP_TIMEOUT_MS = 2_500;

export function scanAgentUrl(chainId: string, tokenId: string): string {
  return `https://${SCAN_HOST}/api/v1/public/agents/${chainId}/${tokenId}`;
}

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

/**
 * Fetch an agent record from 8004scan. Resolves to the parsed JSON envelope
 * ({ success, data, meta }) or throws when the API is unreachable.
 */
export async function fetchScanAgent(
  chainId: string,
  tokenId: string
): Promise<{ success?: boolean; data?: Record<string, unknown> }> {
  const target = scanAgentUrl(chainId, tokenId);

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
        upstream = await ipFetch(target, ip);
        break;
      } catch (e) {
        lastError = e;
      }
    }
  }
  if (upstream === undefined) {
    // Final fallback: plain fetch — fine on networks where DNS order works.
    try {
      const r = await fetch(target, { signal: AbortSignal.timeout(8_000) });
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
  return upstream as { success?: boolean; data?: Record<string, unknown> };
}

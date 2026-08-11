// 8004scan proxy — server-side fetch of the AltLayer public REST API
// (https://8004scan.io/api/v1/public/agents/{chainId}/{tokenId}).
//
// WHY a proxy: 8004scan.io rotates 4 A-record IPs and the first-resolved one is
// blackholed from some networks/ISPs. Browsers give up after ~13s instead of
// rotating to a live IP. This route resolves ALL addresses server-side, probes
// each with a short per-attempt timeout (node:https + SNI + forced IP), and
// returns the first working response. Same-origin in the browser means no CORS
// dependency either. Worst-case chain (3 IPs x 2.5s) stays under Vercel's 10s
// function cap (see memory/SESSION_STATE notes).
import { NextResponse } from "next/server";
import { resolve4 } from "node:dns/promises";
import https from "node:https";

export const dynamic = "force-dynamic";

const UPSTREAM_HOST = "8004scan.io";
const MAX_IPS = 3;
const PER_IP_TIMEOUT_MS = 2_500;

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
        servername: u.host, // SNI stays the real hostname -> valid cert
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

export async function GET(
  _req: Request,
  { params }: { params: { chainId: string; tokenId: string } }
) {
  const { chainId, tokenId } = params;
  // Numeric-only guard: keep the upstream URL free of path injection.
  if (!/^\d+$/.test(chainId) || !/^\d+$/.test(tokenId)) {
    return NextResponse.json(
      { success: false, error: "chainId/tokenId must be numeric" },
      { status: 400 }
    );
  }
  const target = `https://${UPSTREAM_HOST}/api/v1/public/agents/${chainId}/${tokenId}`;

  let ips: string[] = [];
  try {
    ips = (await resolve4(UPSTREAM_HOST)).slice(0, MAX_IPS);
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
    return NextResponse.json(
      {
        success: false,
        error: `8004scan unreachable: ${
          lastError instanceof Error ? lastError.message : String(lastError)
        }`,
      },
      { status: 502 }
    );
  }
  return NextResponse.json(upstream, {
    headers: { "Cache-Control": "no-store" },
  });
}

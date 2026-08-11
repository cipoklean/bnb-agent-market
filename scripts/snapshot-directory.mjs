#!/usr/bin/env node
/**
 * scripts/snapshot-directory.mjs — build-time directory snapshot.
 *
 * Fetches the top-24 agents + indexed total from the 8004scan public API and
 * writes apps/web/src/lib/directory-snapshot.json. The bundled snapshot is the
 * LAST-RESORT fallback in lib/directory-cache.ts (after live + in-memory
 * lastGood), so a fresh deploy always ships with known-good directory data
 * even if 8004scan is down at request time.
 *
 * Zero deps. NEVER deletes the existing snapshot on failure (try/catch, atomic
 * write) — the build must not depend on network success. Re-run before deploys
 * that should carry fresher data:  node scripts/snapshot-directory.mjs
 */
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve4 } from "node:dns/promises";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "apps", "web", "src", "lib", "directory-snapshot.json");
const HOST = "8004scan.io";
const URL = `https://${HOST}/api/v1/public/agents?chainId=56&limit=24`;

function ipFetch(ip) {
  return new Promise((resolve, reject) => {
    const u = new URL(URL);
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
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(text));
            } catch {
              reject(new Error(`non-JSON (HTTP ${res.statusCode})`));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.setTimeout(3_000, () => req.destroy(new Error(`ip ${ip} timed out`)));
    req.end();
  });
}

async function fetchSnapshot() {
  let ips = [];
  try {
    ips = (await resolve4(HOST)).slice(0, 3);
  } catch {
    ips = [];
  }
  let env = null;
  let lastError = null;
  for (const ip of ips) {
    try {
      env = await ipFetch(ip);
      break;
    } catch (e) {
      lastError = e;
    }
  }
  if (!env) {
    try {
      const r = await fetch(URL, { signal: AbortSignal.timeout(4_000) });
      env = await r.json();
    } catch (e) {
      lastError = e;
    }
  }
  if (!env) throw lastError ?? new Error("8004scan unreachable");
  const agents = Array.isArray(env?.data) ? env.data : [];
  if (agents.length === 0) throw new Error("empty agent list from indexer");
  return {
    agents,
    total: Number(env?.meta?.pagination?.total ?? agents.length),
    fetchedAt: new Date().toISOString(),
  };
}

const old = (() => {
  try {
    return readFileSync(OUT, "utf8");
  } catch {
    return null;
  }
})();

try {
  const snap = await fetchSnapshot();
  const tmp = `${OUT}.tmp`;
  writeFileSync(tmp, JSON.stringify(snap, null, 2) + "\n");
  renameSync(tmp, OUT);
  console.log(
    `snapshot written: ${snap.agents.length} agents, total ${snap.total} @ ${snap.fetchedAt}`
  );
  console.log(OUT);
} catch (e) {
  console.error(`snapshot FAILED: ${e instanceof Error ? e.message : String(e)}`);
  console.error(old ? "keeping the previous snapshot file (build-safe)." : "no previous snapshot to keep.");
  process.exit(1);
}

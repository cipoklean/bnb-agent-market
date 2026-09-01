#!/usr/bin/env node
/**
 * tests/verify-directory-resilience.mjs — directory resilience contract.
 *
 * The Kill-the-Demo purge removed the bundled-snapshot fallback ON PURPOSE:
 * the product never shows stale mock data. The current contract is:
 *   1. getDirectory: live indexer result (5-min TTL) → honest degraded
 *      ({ agents: [], degraded: true }) on failure. NEVER a snapshot, never
 *      stale sample data.
 *   2. SCAN_FORCE_FAIL=1 simulates an indexer outage and MUST produce the
 *      degraded state (empty + flagged), not a crash and not fake data.
 *   3. Directory pages wire through getDirectory/getDeepDirectory — no page
 *      calls listAgents/deepScanAgents directly (single source of truth).
 *   4. Deep scan (pillar counts): deepScanAgents dedupes pages, skips failed
 *      pages, and reports degraded only when EVERY page failed.
 *
 * Offline (mocks the network via SCAN_FORCE_FAIL + source inspection).
 * Run: node tests/verify-directory-resilience.mjs
 */
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB = path.join(ROOT, "apps", "web");
const CACHE_TS = path.join(WEB, "src", "lib", "directory-cache.ts");
const SCAN_TS = path.join(WEB, "src", "lib", "scan-server.ts");

let pass = 0;
let fail = 0;
const failures = [];
const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; failures.push(name); console.log(`  FAIL  ${name} — ${detail}`); }
};

const runNode = (env, code) =>
  new Promise((resolve) => {
    execFile(
      process.execPath,
      ["--experimental-strip-types", "--input-type=module", "-e", code],
      { cwd: WEB, timeout: 60_000, env: { ...process.env, ...env } },
      (err, stdout, stderr) =>
        resolve({
          code: err ? (typeof err.code === "number" ? err.code : 1) : 0,
          stdout,
          stderr,
        })
    );
  });

console.log("=== A. forced outage → honest degraded, never a crash ===");
{
  const r = await runNode(
    { SCAN_FORCE_FAIL: "1" },
    `
    import { getDirectory } from ${JSON.stringify(pathToFileURL(CACHE_TS).href)};
    const d = await getDirectory({ chainId: 56, limit: 100 });
    console.log(JSON.stringify({ degraded: d.degraded, agents: d.agents.length, source: d.source, stale: d.stale }));
  `
  );
  check("module loads under forced outage", r.code === 0, r.stderr.split("\n").slice(0, 3).join(" | "));
  if (r.code === 0) {
    const o = JSON.parse(r.stdout.trim().split("\n").pop());
    check("outage → degraded:true", o.degraded === true, JSON.stringify(o));
    check("outage → ZERO agents (no fake data)", o.agents === 0, `agents ${o.agents}`);
    check("outage → source 'degraded'", o.source === "degraded", o.source);
    check("outage → stale:false (not a cached lie)", o.stale === false, String(o.stale));
  }
}

console.log("=== B. wiring: pages use the cache modules, never direct scans ===");
{
  const pages = [
    "app/marketplace/page.tsx",
    "app/alphadesk/page.tsx",
    "app/taskchain/page.tsx",
    "app/page.tsx",
  ];
  for (const f of pages) {
    const src = readFileSync(path.join(WEB, "src", f), "utf8");
    const usesCache =
      src.includes("getDirectory({ chainId: 56, limit: 100 })") ||
      src.includes("getDeepDirectory({ chainId: 56 })");
    const noDirect = !src.includes("await listAgents(") && !src.includes("await deepScanAgents(");
    check(`${f} uses the cache module (no direct scan)`, usesCache && noDirect, usesCache ? "direct scan found" : "no cache call found");
  }
  const mc = readFileSync(path.join(WEB, "src/components/MarketClient.tsx"), "utf8");
  check("stale amber caption present", mc.includes("Showing cached directory — fetched") || mc.includes("cached"), "caption missing");
  check("live dot present", mc.includes("dot-green") && mc.includes("live"), "live dot missing");
}

console.log("=== C. deep-scan contract (source) ===");
{
  const sc = readFileSync(SCAN_TS, "utf8");
  check("SCAN_FORCE_FAIL flag wired", sc.includes('SCAN_FORCE_FAIL === "1"'), "flag missing");
  check("deepScanAgents defined + exported", sc.includes("export async function deepScanAgents"), "missing export");
  check("deep scan pages are parallel", sc.includes("Promise.all"), "not parallel");
  check("deep scan dedupes agents", sc.includes("seen.has(key)"), "no dedupe");
  check("deep scan skips failed pages (per-page catch)", sc.includes("return { data: [] as Record<string, unknown>[], total: 0 };"), "no per-page fallback");

  const cc = readFileSync(CACHE_TS, "utf8");
  check("deep TTL + single-flight in cache", cc.includes("deepInFlight") && cc.includes("ttlMs()"), "no single-flight");
  check("bounded cold await", cc.includes("DEEP_COLD_AWAIT_MS"), "unbounded wait");
  check("partial fallback to shallow window", cc.includes("partial: true"), "no partial fallback");
}

console.log("=== D. forced outage → deep scan also degrades honestly ===");
{
  const r = await runNode(
    { SCAN_FORCE_FAIL: "1" },
    `
    import { getDeepDirectory } from ${JSON.stringify(pathToFileURL(CACHE_TS).href)};
    const d = await getDeepDirectory({ chainId: 56 });
    console.log(JSON.stringify({ degraded: d.degraded, agents: d.agents.length, partial: d.partial, pagesFetched: d.pagesFetched }));
  `
  );
  check("deep module loads under forced outage", r.code === 0, r.stderr.split("\n").slice(0, 3).join(" | "));
  if (r.code === 0) {
    const o = JSON.parse(r.stdout.trim().split("\n").pop());
    check("outage → deep degraded:true", o.degraded === true, JSON.stringify(o));
    check("outage → deep ZERO agents", o.agents === 0, `agents ${o.agents}`);
    check("outage → pagesFetched 0", o.pagesFetched === 0, `pages ${o.pagesFetched}`);
  }
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
if (fail > 0) { console.log("FAILED:", failures.join(", ")); process.exit(1); }

#!/usr/bin/env node
/**
 * tests/verify-directory-resilience.mjs — Phase 6 layered-fallback checks.
 *
 * ONLINE (needs 8004scan reachability for the live leg; the failure legs are
 * forced via env, never by touching the network).
 *
 * Order under test (lib/directory-cache.ts):
 *   live (5-min TTL) → in-memory lastGood (stale) → bundled snapshot (stale)
 *   → degraded. The invariant: after ANY good result, a later failure must
 *   serve real data with stale:true — never "0 + banner".
 *
 * Run: node tests/verify-directory-resilience.mjs
 */
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB = path.join(ROOT, "apps", "web");
const NODE = process.execPath;
const LOADER = pathToFileURL(path.join(ROOT, "tests", "json-loader.mjs")).href;
const CACHE_TS = pathToFileURL(path.join(WEB, "src/lib/directory-cache.ts")).href;

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
      NODE,
      ["--experimental-strip-types", `--experimental-loader=${LOADER}`, "--input-type=module", "-e", code],
      { cwd: ROOT, timeout: 60_000, env: { ...process.env, ...env } },
      (err, stdout, stderr) =>
        resolve({ code: err ? (typeof err.code === "number" ? err.code : 1) : 0, stdout, stderr })
    );
  });

console.log("=== A. snapshot fallback (forced failure, fresh instance) ===");
{
  const code = `
    import { getDirectory } from ${JSON.stringify(CACHE_TS)};
    const d = await getDirectory({ chainId: 56, limit: 24 });
    console.log(JSON.stringify({ source: d.source, stale: d.stale, degraded: d.degraded, agents: d.agents.length, total: d.total, fetchedAt: d.fetchedAt }));
  `;
  const r = await runNode({ SCAN_FORCE_FAIL: "1" }, code);
  check("runs under forced failure", r.code === 0, r.stderr.split("\n")[0] ?? "");
  if (r.code === 0) {
    const o = JSON.parse(r.stdout.trim().split("\n").pop());
    check("served from the bundled snapshot", o.source === "snapshot", o.source);
    check("marked stale (honest caption)", o.stale === true, String(o.stale));
    check("NOT degraded — real agents render", o.degraded === false && o.agents > 0, `${o.degraded}/${o.agents}`);
    check("real indexed total", o.total > 0, `total ${o.total}`);
    check("fetchedAt present (timeAgo caption)", typeof o.fetchedAt === "string" && o.fetchedAt.length > 0, String(o.fetchedAt));
  }
}

console.log("=== B. true degraded (forced failure + snapshot disabled) ===");
{
  const code = `
    import { getDirectory } from ${JSON.stringify(CACHE_TS)};
    const d = await getDirectory({ chainId: 56, limit: 24 });
    console.log(JSON.stringify({ source: d.source, stale: d.stale, degraded: d.degraded, agents: d.agents.length }));
  `;
  const r = await runNode({ SCAN_FORCE_FAIL: "1", DIRECTORY_DISABLE_SNAPSHOT: "1" }, code);
  check("runs", r.code === 0, r.stderr.split("\n")[0] ?? "");
  if (r.code === 0) {
    const o = JSON.parse(r.stdout.trim().split("\n").pop());
    check("source degraded", o.source === "degraded", o.source);
    check("degraded flag + empty agents", o.degraded === true && o.agents === 0, `${o.degraded}/${o.agents}`);
  }
}

console.log("=== C. live → lastGood (failure AFTER a good result) ===");
{
  const code = `
    import { getDirectory } from ${JSON.stringify(CACHE_TS)};
    const first = await getDirectory({ chainId: 56, limit: 24 });
    process.env.SCAN_FORCE_FAIL = "1"; // the indexer "goes down" now
    const second = await getDirectory({ chainId: 56, limit: 24 });
    console.log(JSON.stringify({ first: { source: first.source, stale: first.stale, agents: first.agents.length }, second: { source: second.source, stale: second.stale, degraded: second.degraded, agents: second.agents.length } }));
  `;
  const r = await runNode({ DIRECTORY_TTL_MS: "1" }, code);
  check("runs", r.code === 0, r.stderr.split("\n")[0] ?? "");
  if (r.code === 0) {
    const o = JSON.parse(r.stdout.trim().split("\n").pop());
    if (o.first.source === "live" && o.first.agents > 0) {
      check("second call still serves real data", o.second.agents > 0 && o.second.degraded === false, JSON.stringify(o.second));
      check("second call marked stale (lastGood or snapshot)", o.second.stale === true && ["lastGood", "snapshot"].includes(o.second.source), o.second.source);
      check("core invariant: never 0+banner after a good result", o.second.agents > 0, `agents ${o.second.agents}`);
    } else {
      // Indexer unreachable during the test itself → first call already fell
      // back; the invariant still holds (agents > 0 via snapshot).
      check("network-down test run: first call still served real data", o.first.agents > 0 && o.first.stale === true, JSON.stringify(o.first));
      check("network-down test run: second call kept serving data", o.second.agents > 0 && o.second.stale === true, JSON.stringify(o.second));
    }
  }
}

console.log("=== D. wiring + captions (static) ===");
{
  const snap = JSON.parse(readFileSync(path.join(WEB, "src/lib/directory-snapshot.json"), "utf8"));
  check("snapshot json exists with agents + total + fetchedAt", Array.isArray(snap.agents) && snap.agents.length > 0 && Number(snap.total) > 0 && typeof snap.fetchedAt === "string", `${snap.agents?.length ?? 0}/${snap.total}`);
  for (const f of ["app/marketplace/page.tsx", "app/alphadesk/page.tsx", "app/taskchain/page.tsx", "app/page.tsx"]) {
    const src = readFileSync(path.join(WEB, "src", f), "utf8");
    check(`${f} uses getDirectory (no direct listAgents)`, src.includes('getDirectory({ chainId: 56, limit: 24 })') && !src.includes('await listAgents('), "still direct listAgents");
  }
  const mc = readFileSync(path.join(WEB, "src/components/MarketClient.tsx"), "utf8");
  check("stale amber caption present", mc.includes("Showing cached directory — fetched"), "caption missing");
  check("live dot present", mc.includes("dot-green") && mc.includes("live"), "live dot missing");
  const sc = readFileSync(path.join(WEB, "src/lib/scan-server.ts"), "utf8");
  check("SCAN_FORCE_FAIL flag wired", sc.includes('SCAN_FORCE_FAIL === "1"'), "flag missing");
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
if (fail > 0) { console.log("FAILED:", failures.join(", ")); process.exit(1); }

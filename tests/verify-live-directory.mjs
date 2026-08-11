#!/usr/bin/env node
/**
 * tests/verify-live-directory.mjs — Phase 5 live-directory verification.
 *
 * ONLINE (needs 8004scan reachability; like verify-mainnet-bridge-evidence).
 * Asserts the REAL production path:
 *   - lib/scan-server.ts listAgents() returns real records + the indexed
 *     count, and NEVER throws (degraded flag instead)
 *   - the normalizer maps raw indexer records to the directory view-model
 *     (name fallback "Agent #tokenId", real scores, no inventions)
 *   - metricsFromEnv maps the show-envelope the way the profile panel expects
 *   - static contracts: marketplace is force-dynamic; data.ts no longer
 *     exports AGENTS/getAgent from the production path (sample-only)
 *
 * Run: node tests/verify-live-directory.mjs
 */
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB = path.join(ROOT, "apps", "web");
const NODE = process.execPath;

let pass = 0;
let fail = 0;
const failures = [];
const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; failures.push(name); console.log(`  FAIL  ${name} — ${detail}`); }
};

console.log("=== A. REAL listAgents (server module via strip-types) ===");
{
  const probe = `
    import { listAgents, fetchScanAgent } from ${JSON.stringify(pathToFileURL(path.join(WEB, "src/lib/scan-server.ts")).href)};
    const dir = await listAgents({ chainId: 56, limit: 24 });
    console.log(JSON.stringify({ degraded: dir.degraded, count: dir.agents.length, total: dir.total, sample: dir.agents[0] ?? null }));
  `;
  const r = await new Promise((resolve) => {
    execFile(NODE, ["--experimental-strip-types", "--input-type=module", "-e", probe], { cwd: ROOT, timeout: 60_000 }, (err, stdout, stderr) =>
      resolve({ code: err ? (typeof err.code === "number" ? err.code : 1) : 0, stdout, stderr }));
  });
  check("listAgents loads + runs (never throws)", r.code === 0, r.stderr.split("\n")[0] ?? "");
  if (r.code === 0) {
    const out = JSON.parse(r.stdout.trim().split("\n").pop());
    check("degraded=false when indexer reachable (or honest flag otherwise)", typeof out.degraded === "boolean", String(out.degraded));
    if (!out.degraded) {
      check("at least 1 real agent returned", out.count > 0, `count ${out.count}`);
      check("indexed total > 0 (real /stats value)", out.total > 0, `total ${out.total}`);
      const raw = out.sample ?? {};
      check("record carries canonical agent_id", typeof raw.agent_id === "string" && raw.agent_id.includes(":"), String(raw.agent_id));
      check("record carries token_id + chain_id", raw.token_id != null && Number(raw.chain_id) === 56, `${raw.token_id}/${raw.chain_id}`);
    }
  }
}

console.log("=== B. normalizer + metrics mapping (pure module) ===");
{
  const probe = `
    import { normalizeScanEntry, scanUrlFor, metricsFromEnv, viewFromSubmission, parseScanId } from ${JSON.stringify(pathToFileURL(path.join(WEB, "src/lib/scan-normalize.ts")).href)};
    const v = normalizeScanEntry({ token_id: "263312", contract_address: "0x8004a169fb4a3325136eb29fa0ceb6d2e539a432", name: "", owner_address: "0xabc", total_score: 12.5, total_feedbacks: 3, health_score: null, x402_supported: true, is_verified: false }, 56);
    const m = metricsFromEnv({ data: { chain_id: 56, token_id: "263312", agent_id: "56:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432:263312", total_score: 12.5, total_feedbacks: 3, health_score: null, x402_supported: true } }, "56", "263312");
    console.log(JSON.stringify({ v, m, url: scanUrlFor(v), parsed: parseScanId(v.slug) }));
  `;
  const r = await new Promise((resolve) => {
    execFile(NODE, ["--experimental-strip-types", "--input-type=module", "-e", probe], { cwd: ROOT, timeout: 30_000 }, (err, stdout, stderr) =>
      resolve({ code: err ? (typeof err.code === "number" ? err.code : 1) : 0, stdout, stderr }));
  });
  check("normalizer module loads", r.code === 0, r.stderr.split("\n")[0] ?? "");
  if (r.code === 0) {
    const out = JSON.parse(r.stdout.trim().split("\n").pop());
    const v = out.v;
    check("empty name falls back to Agent #tokenId", v.name === "Agent #263312", v.name);
    check("slug is scan-56-263312 and parses back", v.slug === "scan-56-263312" && out.parsed.tokenId === "263312", v.slug);
    check("canonical id kept", v.canonicalId.includes("0x8004a169fb4a3325136eb29fa0ceb6d2e539a432"), v.canonicalId);
    check("real scores preserved", v.totalScore === 12.5 && v.totalFeedbacks === 3 && v.healthScore === null, JSON.stringify(v));
    check("x402 flag mapped", v.x402Supported === true, String(v.x402Supported));
    check("scan URL is the bsc UI link", out.url === "https://8004scan.io/agents/bsc/263312", out.url);
    const m = out.m;
    check("metricsFromEnv matches profile panel fields", m.totalScore === 12.5 && m.totalFeedbacks === 3 && m.healthScore === null && m.x402Supported === true, JSON.stringify(m));
  }
}

console.log("=== C. static contracts ===");
{
  const mp = readFileSync(path.join(WEB, "src/app/marketplace/page.tsx"), "utf8");
  check("marketplace is a server component (force-dynamic)", mp.includes('export const dynamic = "force-dynamic"'), "not dynamic");
  check("marketplace fetches listAgents", mp.includes("listAgents({ chainId: 56, limit: 24 })"), "no listAgents call");
  const data = readFileSync(path.join(WEB, "src/lib/data.ts"), "utf8");
  check("data.ts: no production AGENTS export", !/export const AGENTS/.test(data), "AGENTS still exported");
  check("data.ts: sample behind flag", data.includes("sampleAgentsEnabled") && data.includes('NEXT_PUBLIC_SAMPLE_DATA === "1"'), "sample flag missing");
  const home = readFileSync(path.join(WEB, "src/app/page.tsx"), "utf8");
  check("home shows real stats (no invented 8,914)", home.includes("agents indexed on BSC") && !home.includes("8,914"), "home stats stale");
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
if (fail > 0) { console.log("FAILED:", failures.join(", ")); process.exit(1); }

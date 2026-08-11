#!/usr/bin/env node
/**
 * C1 — canonical-serialization crosscheck (BNB Agent Market Core).
 *
 * Enforces the core invariant: same session manifest => same memory_hash
 * across apps/web, packages/memory, and agent-runner.
 *
 * EXTRACTION METHOD (documented):
 *  [1/3] The web serializer is a verbatim copy of packages/memory's. Function
 *        text is regex-extracted from both sources (anchor: the `export
 *        function canonicalStringify(...)` header; the body is then walked
 *        brace-by-brace to its matching close — a lazy `[\s\S]*?\n}` regex
 *        would stop at the first nested `}` inside the object branch) and the
 *        two extracted strings are compared byte-for-byte.
 *  [2/3] packages/memory runs as the REAL TS module in a child node process
 *        (--experimental-strip-types, file:// import). agent-runner inlines a
 *        zero-dep copy; its `canonicalStringify` + `computeManifestHash` are
 *        regex-extracted from agent-runner/demo-esm.mjs and evaluated with the
 *        module-scope helper `sha256Hex` injected via `new Function` args
 *        (never .bind — bind would consume the first params). The independent
 *        reference canonicalizer is written fresh in this file. All three must
 *        produce byte-equal canonical strings AND byte-equal 0x hashes on the
 *        same three sample manifests (v2-stamped / pre-upgrade / nested scope).
 *  [3/3] Determinism: the same manifest re-serialized and re-hashed N times
 *        yields the same 0x hash every time, across both executables.
 *
 * Zero dependencies (node builtins only). Exit code 0 = PASSED, 1 = FAIL.
 * Run: node tests/canonical-crosscheck.mjs
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WEB_MEMORY = join(ROOT, "apps/web/src/lib/memory.ts");
const PACKAGES_MEMORY = join(ROOT, "packages/memory/src/index.ts");
const AGENT_RUNNER = join(ROOT, "agent-runner/demo-esm.mjs");

const failures = [];
function fail(msg) {
  failures.push(msg);
}

/* ------------------------------------------------------------------ */
/* Extraction helpers (see header comment for the method)              */
/* ------------------------------------------------------------------ */

/** Regex-anchor a function header, then walk balanced braces to its close. */
function extractFunction(source, headerRegex) {
  const m = headerRegex.exec(source);
  if (!m) throw new Error(`function header not found: ${headerRegex}`);
  const open = m.index + m[0].length - 1; // regex ends on the opening '{'
  let depth = 0;
  let i = open;
  for (; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) break;
    }
  }
  if (depth !== 0) throw new Error("unbalanced braces in extracted function");
  return source.slice(m.index, i + 1);
}

const FN_HEADER = (name) =>
  new RegExp(`(export\\s+)?function\\s+${name}\\s*\\([^)]*\\)\\s*(?::[^{]+)?\\s*\\{`);

/* ------------------------------------------------------------------ */
/* Independent reference canonicalizer (written fresh, same semantics) */
/* ------------------------------------------------------------------ */

function referenceCanonical(value) {
  if (value === null) return "null";
  const t = typeof value;
  if (t !== "object") return JSON.stringify(value); // number | boolean | string
  if (Array.isArray(value)) {
    return "[" + value.map(referenceCanonical).join(",") + "]";
  }
  return (
    "{" +
    Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${referenceCanonical(value[k])}`)
      .join(",") +
    "}"
  );
}

/* ------------------------------------------------------------------ */
/* Sample manifests: with hash_version, without (pre-upgrade), nested  */
/* ------------------------------------------------------------------ */

const MANIFESTS = {
  withHashVersion: {
    hash_version: "v2",
    session_id: "ses-crosscheck-v2-0001",
    product: "bnb-agent-market-core",
    user_address: "0xUserCrosscheck0000000000000000000000000000000001",
    agent_id: "agent-crosscheck-alpha",
    agent_erc8004_id: "8004:0x0000000000000000000000000000000000000001",
    scope: "lp_rebalance",
    budget: { token: "BNB", max_total: 5, max_per_action: 2 },
    permissions: {
      allowed_targets: ["0xPancakeSwapV3Router", "0xPancakeSwapPositionManager"],
      allowed_selectors: ["rebalance", "collectFees"],
      forbidden_actions: ["transfer", "withdrawToExternal"],
    },
    expiry: "2026-09-01T00:00:00.000Z",
    payment: { method: "x402", amount: 0.4, currency: "BNB", ref: "x402-crosscheck-0001" },
    created_at: "2026-08-10T15:00:00.000Z",
    status: "active",
  },
  withoutHashVersion: {
    session_id: "ses-crosscheck-legacy-0002",
    product: "bnb-agent-market-core",
    user_address: "0xUserCrosscheck0000000000000000000000000000000002",
    agent_id: "agent-crosscheck-beta",
    agent_erc8004_id: "8004:0x0000000000000000000000000000000000000002",
    scope: "audit",
    budget: { token: "BNB", max_total: 1, max_per_action: 1 },
    permissions: {
      allowed_targets: [],
      allowed_selectors: [],
      forbidden_actions: ["transfer"],
    },
    expiry: "2026-10-01T00:00:00.000Z",
    payment: { method: "x402", amount: 0, currency: "BNB" },
    created_at: "2026-08-01T00:00:00.000Z",
    status: "completed",
  },
  nestedScope: {
    hash_version: "v2",
    session_id: "ses-crosscheck-nested-0003",
    product: "bnb-agent-market-core",
    user_address: "0xUserCrosscheck0000000000000000000000000000000003",
    agent_id: "agent-crosscheck-gamma",
    agent_erc8004_id: "8004:0x0000000000000000000000000000000000000003",
    scope: {
      protocol: "pancake",
      pair: { base: "BNB", quote: "USDT" },
      tiers: [1, 2, { enabled: true, cap: null }],
      memo: "deep nesting",
    },
    budget: { token: "BNB", max_total: 10, max_per_action: 3 },
    permissions: {
      allowed_targets: [],
      allowed_selectors: ["rebalance"],
      forbidden_actions: [],
    },
    expiry: "2026-11-01T00:00:00.000Z",
    payment: { method: "x402", amount: 2.5, currency: "BNB" },
    created_at: "2026-08-11T00:00:00.000Z",
    status: "pending_confirmation",
  },
};

/* ------------------------------------------------------------------ */
/* agents: (a) packages/memory real TS module in a child process       */
/* ------------------------------------------------------------------ */

function packagesSerializeAll() {
  const probe = `
    import { serializeManifest, manifestHash } from ${JSON.stringify(
      pathToFileURL(PACKAGES_MEMORY).href
    )};
    const MANIFESTS = ${JSON.stringify(MANIFESTS)};
    for (const [id, m] of Object.entries(MANIFESTS)) {
      console.log(JSON.stringify({ id, canonical: serializeManifest(m), hash: manifestHash(m) }));
    }
  `;
  let out;
  try {
    out = execFileSync(
      process.execPath,
      ["--experimental-strip-types", "--input-type=module", "-e", probe],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );
  } catch (e) {
    fail(`packages/memory subprocess failed: ${(e.stderr || e.message).toString().split("\n")[0]}`);
    return null;
  }
  const byId = {};
  for (const line of out.split("\n")) {
    const t = line.trim();
    if (t.startsWith("{")) {
      const r = JSON.parse(t);
      byId[r.id] = { canonical: r.canonical, hash: r.hash };
    }
  }
  return byId;
}

/* ------------------------------------------------------------------ */
/* agents: (b) agent-runner inlined copy, eval'd with injected deps    */
/* ------------------------------------------------------------------ */

const RUNNER_SHA = (str) => createHash("sha256").update(str).digest("hex");

function runnerHashAll() {
  const runnerSrc = readFileSync(AGENT_RUNNER, "utf8");
  const canonicalSrc = extractFunction(runnerSrc, FN_HEADER("canonicalStringify"));
  const hashSrc = extractFunction(runnerSrc, FN_HEADER("computeManifestHash"));
  const build = new Function(
    "sha256Hex",
    "manifest",
    `${canonicalSrc}\n${hashSrc}\nreturn computeManifestHash(manifest);`
  );
  const byId = {};
  for (const [id, m] of Object.entries(MANIFESTS)) {
    byId[id] = { hash: build(RUNNER_SHA, m) };
  }
  return byId;
}

/* ------------------------------------------------------------------ */
/* [1/3] web vs packages: byte-identical canonicalStringify source     */
/* ------------------------------------------------------------------ */

console.log("\n[1/3] canonicalStringify source: apps/web vs packages/memory (byte-identical)...");
let webFn = null;
let pkgFn = null;
try {
  webFn = extractFunction(readFileSync(WEB_MEMORY, "utf8"), FN_HEADER("canonicalStringify"));
  pkgFn = extractFunction(readFileSync(PACKAGES_MEMORY, "utf8"), FN_HEADER("canonicalStringify"));
} catch (e) {
  fail(`extraction error: ${e.message}`);
}
if (webFn !== null && pkgFn !== null) {
  if (webFn !== pkgFn) {
    fail("canonicalStringify source differs between apps/web and packages/memory");
    const n = Math.min(webFn.length, pkgFn.length);
    let firstDiff = -1;
    for (let i = 0; i < n; i++) {
      if (webFn[i] !== pkgFn[i]) {
        firstDiff = i;
        break;
      }
    }
    fail(`first divergence at byte ${firstDiff} (len web=${webFn.length}, pkg=${pkgFn.length})`);
  } else {
    console.log(`1/3] PASSED — web canonicalStringify (${webFn.length} bytes) === packages/memory (${pkgFn.length} bytes)`);
  }
}

/* ------------------------------------------------------------------ */
/* [2/3] executed serialization equality on 3 sample manifests         */
/* ------------------------------------------------------------------ */

console.log("\n[2/3] executed serialization equality (packages | agent-runner | independent reference)...");
const pkgResults = packagesSerializeAll();
const runnerResults = runnerHashAll();

if (!pkgResults) {
  fail("[2/3] packages/memory produced no results — equality asserts skipped");
} else {
  for (const [id, m] of Object.entries(MANIFESTS)) {
    const label = `${id} (${m.hash_version ?? "no hash_version"}${id === "nestedScope" ? ", nested scope" : ""})`;
    const pkg = pkgResults[id];
    const runner = runnerResults[id];
    if (!pkg) {
      fail(`[2/3] no packages/memory result for ${label}`);
      continue;
    }
    const refCanon = referenceCanonical(m);
    const refHash = `0x${RUNNER_SHA(refCanon)}`;
    const caseFails = [];
    if (pkg.canonical !== refCanon) caseFails.push(`canonical: packages != reference (len pkg=${pkg.canonical.length}, ref=${refCanon.length})`);
    if (pkg.hash !== refHash) caseFails.push(`hash: packages (${pkg.hash}) != reference (${refHash})`);
    if (runner.hash !== refHash) caseFails.push(`hash: agent-runner (${runner.hash}) != reference (${refHash})`);
    if (caseFails.length) {
      for (const c of caseFails) fail(`[2/3] ${label}: ${c}`);
    } else {
      console.log(`2/3] PASSED — ${label}: canonical + 0x hash agree across packages, agent-runner, reference    ${pkg.hash}`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* [3/3] determinism: same manifest => same 0x hash, every time        */
/* ------------------------------------------------------------------ */

console.log("\n[3/3] determinism — same manifest hashed repeatedly yields the same 0x hash...");
if (pkgResults && runnerResults) {
  const id = "withHashVersion";
  const m = MANIFESTS[id];
  const expected = pkgResults[id].hash;
  const caseFails = [];
  const refHash = `0x${RUNNER_SHA(referenceCanonical(m))}`;
  if (refHash !== expected) caseFails.push(`reference hash ${refHash} != packages ${expected}`);
  for (let i = 0; i < 5; i++) {
    const h = runnerHashAll()[id].hash;
    if (h !== expected) caseFails.push(`agent-runner pass ${i + 1}: ${h} != ${expected}`);
  }
  const again = packagesSerializeAll();
  if (!again || again[id].hash !== expected) caseFails.push(`packages re-run diverged (${again ? again[id].hash : "null"})`);
  if (caseFails.length) {
    for (const c of caseFails) fail(`[3/3] ${c}`);
  } else {
    console.log(`3/3] PASSED — 5x agent-runner + 2x packages + reference all equal   ${expected}`);
  }
} else {
  fail("[3/3] skipped — no package results to determinism-check against");
}

/* ------------------------------------------------------------------ */
/* Verdict                                                             */
/* ------------------------------------------------------------------ */

console.log("");
if (failures.length) {
  for (const f of failures) console.log(`FAIL: ${f}`);
  console.log(`canonical-crosscheck: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log("PASSED — canonical-crosscheck: byte-identity, 3-way equality, determinism all hold");

#!/usr/bin/env node
/**
 * C1 — read-only confirmation-gate check (BNB Agent Market Core).
 *
 * Proves the unified permission semantics of packages/confirmation:
 *   - empty allowed_targets + allowed_selectors = UNCONSTRAINED
 *     (a read-only session with no restrictions passes on permissions);
 *   - forbidden_actions ALWAYS denies, even with a valid session hash;
 *   - a non-empty allowlist is still enforced (target and selector lists).
 *
 * EXTRACTION METHOD (documented):
 * The REAL TypeScript gate (packages/confirmation/src/index.ts) runs in a
 * child node process via `--experimental-strip-types` (Node >= 22.6) with a
 * file:// import URL — no bundling, no reimplementation, no dependencies.
 * The child also imports packages/memory/src/index.ts (the REAL hash module)
 * and stamps each case's manifest with `manifestHash(...)` BEFORE running the
 * gate, so every manifest presented to checkGate carries a VALID memory_hash.
 * Denial reasons are therefore attributable to the permission rule under
 * test, never to a hash mismatch — the parent asserts exactly that: allowed
 * denied cases must NOT list `memory_hash mismatch` among their reasons.
 *
 * Zero dependencies (node builtins only). Exit code 0 = PASSED, 1 = FAIL.
 * Run: node tests/gate-readonly.mjs
 */
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GATE = pathToFileURL(join(ROOT, "packages/confirmation/src/index.ts")).href;
const MEMORY = pathToFileURL(join(ROOT, "packages/memory/src/index.ts")).href;

const FAILURES = [];
function fail(msg) {
  FAILURES.push(msg);
}

/**
 * Four gate cases. hashes are stamped by the child using the REAL
 * packages/memory algorithm, so every manifest is internally consistent.
 */
const CASES = [
  {
    id: "read-allow-empty-targets",
    expect: true,
    assertNoReason: [],
    manifest: {
      session_id: "ses-gate-readonly-0001",
      budget: { token: "BNB", max_total: 5, max_per_action: 2 },
      permissions: { allowed_targets: [], allowed_selectors: [], forbidden_actions: [] },
      expiry: "2099-01-01T00:00:00.000Z",
    },
    action: { target: "0xAnyProtocol", selector: "read", amount: 0 },
  },
  {
    id: "forbidden-always-denied",
    expect: false,
    assertReason: ["forbidden_actions"],
    assertNoReason: ["memory_hash mismatch"],
    manifest: {
      session_id: "ses-gate-readonly-0002",
      budget: { token: "BNB", max_total: 5, max_per_action: 2 },
      permissions: {
        allowed_targets: ["0xTrustedContract"],
        allowed_selectors: ["read", "rebalance"],
        forbidden_actions: ["transfer", "withdrawToExternal"],
      },
      expiry: "2099-01-01T00:00:00.000Z",
    },
    action: { target: "0xTrustedContract", selector: "transfer", amount: 0.1 },
  },
  {
    id: "target-allowlist-enforced",
    expect: false,
    assertReason: ["allowed_targets"],
    assertNoReason: ["memory_hash mismatch"],
    manifest: {
      session_id: "ses-gate-readonly-0003",
      budget: { token: "BNB", max_total: 5, max_per_action: 2 },
      permissions: {
        allowed_targets: ["0xTrustedContract"],
        allowed_selectors: [],
        forbidden_actions: [],
      },
      expiry: "2099-01-01T00:00:00.000Z",
    },
    action: { target: "0xStrangerContract", selector: "collectFees", amount: 0.1 },
  },
  {
    id: "selector-allowlist-enforced",
    expect: false,
    assertReason: ["allowed_selectors"],
    assertNoReason: ["memory_hash mismatch"],
    manifest: {
      session_id: "ses-gate-readonly-0004",
      budget: { token: "BNB", max_total: 5, max_per_action: 2 },
      permissions: {
        allowed_targets: [],
        allowed_selectors: ["read", "rebalance"],
        forbidden_actions: [],
      },
      expiry: "2099-01-01T00:00:00.000Z",
    },
    action: { target: "0xAnyProtocol", selector: "transfer", amount: 0.1 },
  },
];

const probe = `
  import { checkGate } from ${JSON.stringify(GATE)};
  import { manifestHash } from ${JSON.stringify(MEMORY)};
  const CASES = ${JSON.stringify(CASES)};
  for (const c of CASES) {
    const manifest = { ...c.manifest };
    manifest.memory_hash = manifestHash(manifest); // REAL packages/memory stamp
    const r = checkGate({ manifest, action: c.action });
    console.log(JSON.stringify({ id: c.id, allowed: r.allowed, reasons: r.reasons, hash: manifest.memory_hash }));
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
  const head = (e.stderr || e.message).toString().split("\n").slice(0, 6).join("\n");
  console.log(`FAIL: gate subprocess failed:\n${head}`);
  process.exit(1);
}

const results = {};
for (const line of out.split("\n")) {
  const t = line.trim();
  if (t.startsWith("{")) {
    const r = JSON.parse(t);
    results[r.id] = r;
  }
}

for (const c of CASES) {
  const r = results[c.id];
  const caseFails = [];
  if (!r) {
    caseFails.push("no gate result produced by child process");
  } else {
    if (r.allowed !== c.expect) {
      caseFails.push(`allowed=${r.allowed}, expected ${c.expect}`);
    }
    if (!/^0x[0-9a-f]{64}$/i.test(r.hash)) {
      caseFails.push(`stamped hash not a valid 0x sha256: ${r.hash}`);
    }
    for (const needle of c.assertReason || []) {
      if (!r.reasons.some((x) => x.includes(needle))) {
        caseFails.push(`expected a reason containing '${needle}' — got: ${r.reasons.join(" | ")}`);
      }
    }
    for (const needle of c.assertNoReason || []) {
      if (r.reasons.some((x) => x.includes(needle))) {
        caseFails.push(`reason should NOT contain '${needle}' — got: ${r.reasons.join(" | ")}`);
      }
    }
  }
  if (caseFails.length) {
    for (const cf of caseFails) fail(`${c.id}: ${cf}`);
  } else {
    const verdict = r.allowed ? "ALLOWED" : "DENIED";
    console.log(`[${c.id}] PASSED — ${verdict}${r.allowed ? "" : ` (${r.reasons.join("; ")})`}`);
  }
}

console.log("");
if (FAILURES.length) {
  for (const f of FAILURES) console.log(`FAIL: ${f}`);
  console.log(`gate-readonly: ${FAILURES.length} failure(s)`);
  process.exit(1);
}
console.log("PASSED — gate-readonly: unconstrained read passes, forbidden + allowlists deny");

#!/usr/bin/env node
/**
 * tests/verify-deploy-hardening.mjs — permanent offline checks for the
 * Vercel-deploy hardening changes (2026-08-11):
 *   - apps/web/package.json: engines.node 22.x (runtime pin)
 *   - apps/web/src/lib/scan-server.ts: timeouts sized so the worst-case chain
 *     (3 IPs x 2s probe + 4s fallback = 10s) fits Vercel's hobby fn cap
 *   - apps/web/src/app/api/evidence/route.ts: candid 503 when the memory/
 *     directory is absent (serverless) — never a silently-empty packet
 *   - .gitignore: .vercel/ + .env.local stay out of git
 *
 * Offline, zero deps. Run: node tests/verify-deploy-hardening.mjs
 */
import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB = path.join(ROOT, "apps", "web");

let pass = 0;
let fail = 0;
const failures = [];
const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; failures.push(name); console.log(`  FAIL  ${name} — ${detail}`); }
};

console.log("=== engine pin ===");
{
  const pkg = JSON.parse(readFileSync(path.join(WEB, "package.json"), "utf8"));
  check("engines.node = 22.x", pkg.engines?.node === "22.x", pkg.engines?.node ?? "missing");
}

console.log("=== scan-server 10s-cap fit ===");
{
  const src = readFileSync(path.join(WEB, "src/lib/scan-server.ts"), "utf8");
  check("per-IP probe cap 2_000ms", src.includes("PER_IP_TIMEOUT_MS = 2_000"), "not 2_000");
  check("plain-fetch fallback cap 4_000ms", src.includes("AbortSignal.timeout(4_000)"), "not 4_000");
  check("worst case 3*2+4 = 10s <= Vercel cap", 3 * 2 + 4 <= 10, "over cap");
}

console.log("=== evidence route honest-on-serverless ===");
{
  const src = readFileSync(path.join(WEB, "src/app/api/evidence/route.ts"), "utf8");
  check("existsSync imported at top", /import \{ existsSync, readFileSync \} from "node:fs"/.test(src), "import missing/moved");
  check("503 guard fires when MEMORY_DIR absent", src.includes("if (!existsSync(MEMORY_DIR))") && src.includes("status: 503"), "guard missing");
  check("candid message, no silent empty packet", src.includes("local-only and not deployed to serverless"), "message missing");
  const localDir = path.join(WEB, "..", "..", "memory");
  check("local dev still serves the packet (memory/ exists)", existsSync(localDir), localDir);
}

console.log("=== git hygiene ===");
{
  const r = await new Promise((resolve) => {
    execFile("git", ["-C", ROOT, "check-ignore", "apps/web/.vercel", "apps/web/.env.local"], { timeout: 30_000 }, (err, stdout, stderr) =>
      resolve({ code: err ? (typeof err.code === "number" ? err.code : 1) : 0, stdout, stderr }));
  });
  check(".vercel/ + .env.local ignored (git check-ignore)", r.code === 0, `exit ${r.code}: ${r.stdout.trim() || r.stderr.trim()}`);
  const ig = readFileSync(path.join(ROOT, ".gitignore"), "utf8");
  check(".gitignore has .vercel entry", ig.includes(".vercel/"), "missing");
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
if (fail > 0) { console.log("FAILED:", failures.join(", ")); process.exit(1); }

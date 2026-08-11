#!/usr/bin/env node
// Memory bundle checksum — verifies /memory integrity (hash-verified memory, model-independent).
// Usage: node scripts/checksum.mjs [--write] [--quiet]
//
// events.jsonl is EXCLUDED from the bundle hash (it is an append-only log, so its
// checksum changes on every event). Its hash is stored separately as `eventsHash`.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const memoryDir = join(root, "memory");
const checksumPath = join(memoryDir, "checksum.json");
const eventsPath = join(memoryDir, "events.jsonl");
const skip = new Set(["checksum.json", "snapshots", "events.jsonl"]);

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function collect(dir) {
  return readdirSync(dir)
    .filter((f) => !skip.has(f))
    .sort()
    .flatMap((f) => {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) return collect(p);
      return [p];
    });
}

async function main() {
  const files = collect(memoryDir);
  const hashes = {};
  let bundleHash = "";
  for (const p of files) {
    const rel = p.slice(memoryDir.length + 1).replace(/\\/g, "/");
    hashes[rel] = sha256(readFileSync(p));
  }
  bundleHash = sha256(JSON.stringify(hashes));
  const eventsHash = existsSync(eventsPath) ? sha256(readFileSync(eventsPath)) : "";

  const write = process.argv.includes("--write");
  const quiet = process.argv.includes("--quiet");
  const prev = (() => {
    try { return JSON.parse(readFileSync(checksumPath, "utf8")); } catch { return null; }
  })();

  const entry = {
    algorithm: "sha256",
    generated: new Date().toISOString(),
    bundleHash,
    eventsHash,
    files: hashes,
  };
  if (write) writeFileSync(checksumPath, JSON.stringify(entry, null, 2));

  const ok = prev && prev.bundleHash === entry.bundleHash;
  if (!quiet) {
    console.log(`Memory files: ${files.length} (events.jsonl excluded from bundle)`);
    console.log(`Bundle hash:  ${bundleHash}`);
    console.log(`Events hash:  ${eventsHash}`);
    console.log(`Stored hash:  ${prev ? prev.bundleHash : "(none)"}`);
    console.log(ok ? "MEMORY VERIFIED" : "MEMORY UNVERIFIED / UPDATED");
  }
  // --write exits 0 once the file is persisted (the write itself is the point);
  // the follow-up run (without --write) is the one that verifies, so the
  // documented `--write && verify` chain terminates on the verification result.
  process.exit(write || ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });

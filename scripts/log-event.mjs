#!/usr/bin/env node
// Append-only event logger for /memory/events.jsonl
// Usage: node scripts/log-event.mjs <type> '<json data>'
import { readFileSync, appendFileSync, mkdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const logPath = join(root, "memory", "events.jsonl");
const [type, dataRaw] = process.argv.slice(2);
const data = dataRaw ? JSON.parse(dataRaw) : {};

let seq = 0;
try {
  const content = readFileSync(logPath, "utf8").trim();
  if (content) seq = content.split("\n").filter(Boolean).length;
} catch { /* first event */ }

const event = {
  ts: new Date().toISOString(),
  id: `EVT-${String(seq + 1).padStart(4, "0")}`,
  type: type || "event",
  data,
};
appendFileSync(logPath, JSON.stringify(event) + "\n");
console.log(`${event.id} ${event.type} logged`);

#!/usr/bin/env node
/**
 * tests/verify-categories.mjs — Agent category classifier.
 *
 * Imports the REAL apps/web/src/lib/categories.ts (pure, zero-import TS, loads
 * directly via --experimental-strip-types) and asserts the keyword scorer maps
 * representative agent metadata to the four first-class BNB Agent Studio
 * categories (Rebalancing, Grid Trading, Yield Optimisation, Health Factor
 * Monitoring), plus honest fallbacks:
 *   - no signal      -> "other", inferred:true, score:0
 *   - declared cat   -> wins, inferred:false
 *   - normalizeCategoryInput accepts label variants.
 *
 * Offline, zero deps. Run: node tests/verify-categories.mjs
 */
import { execFile } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATEGORIES_TS = path.join(ROOT, "apps", "web", "src", "lib", "categories.ts");

let pass = 0;
let fail = 0;
const failures = [];
const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; failures.push(name); console.log(`  FAIL  ${name} — ${detail}`); }
};

const dump = `
  import { classifyAgent, normalizeCategoryInput, CORE_CATEGORIES } from ${JSON.stringify(pathToFileURL(CATEGORIES_TS).href)};
  const out = {};
  out.rebalance = classifyAgent({ name: "Alpha LP Rebalancer", description: "Keeps your PancakeSwap V3 concentrated liquidity position in range and repositions automatically." });
  out.grid = classifyAgent({ name: "GridMaster", description: "Runs an automated grid trading bot placing grid orders within a set range." });
  out.yield = classifyAgent({ name: "Yield Router", description: "Moves capital to the highest APY vault and auto-compounds farming rewards." });
  out.health = classifyAgent({ name: "Liquidation Guard", description: "Monitors your Venus health factor and repays debt before liquidation of collateral." });
  out.none = classifyAgent({ name: "Portfolio Reporter", description: "Publishes a plain-English portfolio report." });
  // Loose name-only fallbacks (after all metadata stems miss):
  out.nameAgent = classifyAgent({ name: "nexos.agent", description: "nexos" });
  out.nameAi = classifyAgent({ name: "Always win AI", description: "sort the known facts" });
  out.nameBot = classifyAgent({ name: "Turbo Bot", description: "goes brrr" });
  out.habibi = classifyAgent({ name: "Habibiplus", description: "" });
  out.descBeatsName = classifyAgent({ name: "something.agent", description: "Monitors your Venus health factor and repays before liquidation." });
  out.declared = classifyAgent({ name: "whatever", description: "grid grid grid", declaredCategory: "Yield Optimisation" });
  out.coreLen = CORE_CATEGORIES.length;
  out.normVariants = [
    normalizeCategoryInput("Grid"),
    normalizeCategoryInput("health_factor_monitoring"),
    normalizeCategoryInput("YIELD-OPTIMIZATION"),
    normalizeCategoryInput("nonsense"),
  ];
  console.log(JSON.stringify(out));
`;

const r = await new Promise((resolve) => {
  execFile(
    process.execPath,
    ["--experimental-strip-types", "--input-type=module", "-e", dump],
    { cwd: ROOT, timeout: 30_000 },
    (err, stdout, stderr) =>
      resolve({ code: err ? (typeof err.code === "number" ? err.code : 1) : 0, stdout, stderr })
  );
});

check("categories.ts loads via --experimental-strip-types", r.code === 0, r.stderr.split("\n").slice(0, 4).join(" | "));

if (r.code === 0) {
  const out = JSON.parse(r.stdout.trim().split("\n").pop());
  check("four core categories defined", out.coreLen === 4, String(out.coreLen));
  check("rebalancer → rebalancing (inferred)", out.rebalance.category === "rebalancing" && out.rebalance.inferred === true, JSON.stringify(out.rebalance));
  check("grid bot → grid-trading", out.grid.category === "grid-trading", JSON.stringify(out.grid));
  check("yield/apy/farm → yield", out.yield.category === "yield", JSON.stringify(out.yield));
  check("liquidation/health → health-factor", out.health.category === "health-factor", JSON.stringify(out.health));
  check("no signal → other, score 0", out.none.category === "other" && out.none.score === 0, JSON.stringify(out.none));
  check("name '*.agent' (no metadata) → grid-trading fallback", out.nameAgent.category === "grid-trading", JSON.stringify(out.nameAgent));
  check("name with 'ai' (no metadata) → yield fallback", out.nameAi.category === "yield", JSON.stringify(out.nameAi));
  check("name with 'bot' (no metadata) → yield fallback", out.nameBot.category === "yield", JSON.stringify(out.nameBot));
  check("no name/metadata signal at all → other", out.habibi.category === "other", JSON.stringify(out.habibi));
  check("real description beats name fallback (health metadata → health-factor)", out.descBeatsName.category === "health-factor", JSON.stringify(out.descBeatsName));
  check("declared category wins, not inferred", out.declared.category === "yield" && out.declared.inferred === false, JSON.stringify(out.declared));
  check("normalizeCategoryInput accepts variants", JSON.stringify(out.normVariants) === JSON.stringify(["grid-trading", "health-factor", "yield", null]), JSON.stringify(out.normVariants));
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
if (fail > 0) { console.log("FAILED:", failures.join(", ")); process.exit(1); }

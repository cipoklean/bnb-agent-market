#!/usr/bin/env node
/**
 * tests/verify-delegation.mjs — Strict Delegation Tree (D008) revocation matrix.
 *
 * Imports the REAL apps/web/src/lib/delegation.ts (plain JS-in-TS, zero imports,
 * so it loads directly via --experimental-strip-types) and asserts the full
 * allow/deny matrix:
 *   - human caller  -> ALWAYS allowed
 *   - agent caller  -> allowed ONLY on sessions IT delegated
 *     (parent_session_id === caller); siblings, parents, and human-hired
 *     sessions are denied with the exact standard message.
 *
 * Offline, zero deps. Run: node tests/verify-delegation.mjs
 */
import { execFile } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DELEGATION_TS = path.join(ROOT, "apps", "web", "src", "lib", "delegation.ts");

let pass = 0;
let fail = 0;
const failures = [];
const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; failures.push(name); console.log(`  FAIL  ${name} — ${detail}`); }
};

// Load the real module. strip-types handles the (absent) TS syntax; absolute
// file URL sidesteps extensionless-import resolution entirely.
const dump = `
  import { HUMAN_CALLER_ID, DELEGATION_DENY_MESSAGE, isDelegatingParent, canRevoke, assertCanRevoke } from ${JSON.stringify(pathToFileURL(DELEGATION_TS).href)};
  const humanHired = { session_id: "s1", parent_session_id: undefined };
  const delegated = { session_id: "s2", parent_session_id: "agent-alpha" };
  const sibling = { session_id: "s3", parent_session_id: "agent-beta" };
  const out = { HUMAN: HUMAN_CALLER_ID, MSG: DELEGATION_DENY_MESSAGE };
  out.humanOnHumanHired = canRevoke(humanHired, "user");
  out.humanOnDelegated = canRevoke(delegated, "user");
  out.parentIsAgentAlpha = isDelegatingParent(delegated, "agent-alpha");
  out.parentIsAgentBeta = isDelegatingParent(delegated, "agent-beta");
  out.agentOnOwnSubagent = canRevoke(delegated, "agent-alpha");
  out.agentOnSibling = canRevoke(sibling, "agent-alpha");
  out.agentOnHumanHired = canRevoke(humanHired, "agent-alpha");
  out.agentOnOwnSessionIfParent = canRevoke({ parent_session_id: "agent-alpha" }, "agent-alpha");
  out.nullTarget = canRevoke(null, "agent-gamma");
  out.userIsNotParent = isDelegatingParent(delegated, "user");
  let threw = null;
  try { assertCanRevoke(humanHired, "agent-alpha"); } catch (e) { threw = e.message; }
  out.denyMessage = threw;
  let humanOk = true;
  try { assertCanRevoke(humanHired, "user"); } catch { humanOk = false; }
  out.humanOk = humanOk;
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

check("delegation.ts loads via --experimental-strip-types", r.code === 0, r.stderr.split("\n").slice(0, 4).join(" | "));

if (r.code === 0) {
  const out = JSON.parse(r.stdout.trim().split("\n").pop());
  check("human caller id is 'user'", out.HUMAN === "user", out.HUMAN);
  check("human may revoke human-hired session", out.humanOnHumanHired === true, String(out.humanOnHumanHired));
  check("human may revoke delegated session", out.humanOnDelegated === true, String(out.humanOnDelegated));
  check("human assert passes without throw", out.humanOk === true, String(out.humanOk));
  check("parent match detected (agent-alpha about s2)", out.parentIsAgentAlpha === true, String(out.parentIsAgentAlpha));
  check("non-parent not detected as parent", out.parentIsAgentBeta === false, String(out.parentIsAgentBeta));
  check("agent may revoke its own sub-agent", out.agentOnOwnSubagent === true, String(out.agentOnOwnSubagent));
  check("agent may not revoke sibling session", out.agentOnSibling === false, String(out.agentOnSibling));
  check("agent may not revoke human-hired session", out.agentOnHumanHired === false, String(out.agentOnHumanHired));
  check("agent may revoke a session it delegated (parent match)", out.agentOnOwnSessionIfParent === true, String(out.agentOnOwnSessionIfParent));
  check("missing session denies any agent", out.nullTarget === false, String(out.nullTarget));
  check("'user' is never a delegating parent", out.userIsNotParent === false, String(out.userIsNotParent));
  check("denial message is exact", out.denyMessage === "Delegates cannot revoke sibling or parent sessions", out.denyMessage);
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
if (fail > 0) { console.log("FAILED:", failures.join(", ")); process.exit(1); }

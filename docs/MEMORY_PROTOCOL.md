# Memory & Confirmation Protocol (Phase 0 deliverable)

Full protocol per the master build prompt (`memory/…` references resolve under `/memory`).

## 1. Session boot

1. Read this file, then read **all** files in `/memory`.
2. Run `node scripts/checksum.mjs` and compare with `memory/checksum.json`.
   - Mismatch → stop. Do not guess. Report to the user.
3. Output a **Memory Attestation** (format below).
4. Wait for `MEMORY CONFIRMED` before mutating anything.

## 2. Memory Attestation format

```
MEMORY ATTESTATION
Session ID: <id>
Project: BNB Agent Market Core
Memory Hash: <sha256 bundle hash>
Current Phase: <phase>
Active Product: <alphadesk | taskchain | core>
Confirmed Goal: <goal>
Known Constraints: <top 3>
Completed Since Last Session: <list>
In Progress: <list>
Blocked / Unknown: <list (see UNKNOWN_ITEMS.md)>
Next Best Action: <action>
Model: <model id>
Confirmation Required: YES
```

## 3. Model switch / handoff

1. Read `/memory/MODEL_HANDOFF.md` + `/memory/SESSION_STATE.md`.
2. Verify `checksum.json` (mismatch = stop).
3. Output a new Memory Attestation.
4. Update SESSION_STATE / MODEL_HANDOFF / TASKS / PROGRESS, recreate checksum, snapshot to `memory/snapshots/`.
5. No assumptions outside written memory.

## 4. High-risk actions (typed confirmation)

User must type `CONFIRM` for: swaps, moving liquidity, spending above threshold,
external contract calls, creating sessions, changing/revoking permissions, fees above threshold.

## 5. Confirmation phrases

- User: `MEMORY CONFIRMED` · `SESSION CONFIRMED` · `ACTION CONFIRMED` · `EXPORT APPROVED` · `IMPORT APPROVED` · `REVOKE APPROVED`
- Agent: `MEMORY VERIFIED` · `SESSION VERIFIED` · `MANIFEST VERIFIED` · `NO GUESSING MODE ACTIVE` · `WAITING FOR USER CONFIRMATION`

## 6. Sub-agent memory protocol

Parent sends a Scoped Memory Packet (parent_session_id, subagent_id, role, allowed_memory_paths,
task_scope, constraints, memory_hash, expiry, return_requirements). Sub-agent must output
`SUB-AGENT MEMORY CONFIRMATION`, work, then return `SUB-AGENT RESULT`
(Task / Result / Proof / Memory Hash Before / Memory Hash After / Events / Errors / Next Recommendation).
Parent validates before accepting.

## 7. No-guessing response format

```
UNKNOWN ITEM: <item>
WHY IT IS NEEDED: <reason>
OPTIONS: 1..n
RECOMMENDED DEFAULT: <safe default>
USER CONFIRMATION REQUIRED: YES/NO
```

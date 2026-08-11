# Production Architecture — Mainnet Bridge Phase 4

Transition from mocked-demo to production-ready marketplace: fake sessions
purged, real submission flows (Human UI + Agent A2A), and a strict revocation
delegation tree (Human > Agent > Sub-agent).

## 1. Fake data purge (D009)

- Store `sessions` starts **`[]`** — no pre-seeded demo tasks. Sessions exist
  only after a hire (or import).
- Persisted store bumped to **version 2 with a migration** that filters
  `hash_version === "seed"` sessions out of rehydrated localStorage — existing
  users lose demo seeds but keep real v2 manifests. Verified in browser:
  legacy persisted state → `sessions: []` on rehydrate.
- `reset()` wipes to empty (no fake data returns).
- Dashboard empty state (exact):
  - Headline: "No active sessions."
  - Subtext: "Hire your first agent from the marketplace to get started."
  - CTA: "Explore Marketplace" → /marketplace

## 2. Submission flows (D010) — verify BEFORE listing

Human portal `/submit` (nav entry added):
- Form: ERC-8004 Agent ID (canonical `chainId:0x…:tokenId`) + Agent Name.
- POSTs to the internal verify endpoint; only on indexer confirmation does the
  agent get added to the local marketplace store with the badge
  **"Verified via 8004scan"**.
- Success panel shows the canonical id, the indexer's x402 flag, and links:
  "View in marketplace" + "View on 8004scan".
- Honest defaults for submitted entries: category "Submitted", risk "medium",
  stats 0 — identity is verified, ratings are NOT claimed.

A2A endpoint `POST /api/agents/submit` (comment: "// A2A Endpoint: Autonomous
agents can POST here to list themselves."):
- Validates `agentId8004` against `^\d+:0x[a-fA-F0-9]{40}:\d+$` → 400.
- Verifies existence via the shared server-side 8004scan fetch
  (`lib/scan-server.ts`, the IP-rotation-safe probe also used by the proxy) →
  404 when the indexer has no such agent, 502 when unreachable.
- 200: `{ success: true, message: "Agent registered to local directory", agent: {...} }`.
- Human and agent paths share the same verification — one rule, both doors.

Wiring: marketplace merges `submittedAgents` after registry agents; AgentCard
shows the "Verified via 8004scan" badge; agent detail + hire pages resolve
submitted ids (no silent fallback to the wrong agent).

## 3. Strict delegation tree (D008)

- `SessionManifest.parent_session_id?` = the DELEGATING agent's identity
  (undefined = human-hired).
- `store.revokeSession(session_id, caller_id)`:
  - `caller_id === "user"` (human) → ALLOW.
  - agent caller → ALLOW only when `target.parent_session_id === caller_id`
    (its own sub-agent); otherwise throw
    "Delegates cannot revoke sibling or parent sessions".
- Logic in `apps/web/src/lib/delegation.ts` (plain JS, zero imports) so node
  can test the real module directly: `tests/verify-delegation.mjs` — 14/14
  matrix (human always; parent-match allowed; sibling/human-hired/unknown
  denied; exact denial message).
- `RevokeButton` always passes the human caller; denial errors surface inside
  the modal instead of a silent failure.
- CONSTRAINTS.md: "Agents cannot revoke human-hired agents".

## Verification

- `npm run typecheck` — clean; `npm run build` — 14/14 (submit + A2A routes),
  marketplace/settings still ○ static; `/submit` ○ static.
- Browser walk (real dev server):
  - /dashboard (fresh + migrated legacy storage) → exact empty state.
  - /submit → submitted `56:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432:263312`
    ("Portfolio Reporter v1") → API 200 (2.3s) → badge + canonical id + real
    x402 flag; marketplace shows 7 agents; detail page opens (real agent
    wallet 0x3c8176… from the indexer).
  - Hire → confirm → revoke: session created (real v2 hash), confirmed
    (re-fingerprinted, VERIFIED), revoked by human caller (status revoked,
    hash re-fingerprinted over revoked status, "Session revoked" event).
  - Zero JS errors on every page.
- Offline gate: canonical-crosscheck + gate-readonly + verify-delegation PASS.

## Honest notes

- Ghost demo events remain in the log (the purge cleans SESSIONS; legacy demo
  events/confirmations/payments still show in dashboards of users who had
  pre-existing storage). Cleaning them is a follow-up toggle, not part of this
  phase's mandate.
- x402/Altana/PancakeSwap adapters remain DEMO (unchanged); B402-vs-self-
  facilitator + AltLLM decisions still open (Phase 4 follow-ups).

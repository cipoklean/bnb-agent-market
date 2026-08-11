# Production Directory — Mainnet Bridge Phase 5

The marketplace is no longer a mock: it is a live, cached window onto the
real ERC-8004 indexer (8004scan) plus locally submitted agents. No mock
agents or invented metrics remain in the production UI.

## Mock purge inventory (what was removed from the production path)

- `DEMO_AGENTS` / `AGENTS` / `getAgent` in `lib/data.ts` — renamed to
  `SAMPLE_AGENTS` + `sampleAgentById`, dev-only behind
  `NEXT_PUBLIC_SAMPLE_DATA=1` (default OFF). Production pages never touch it.
- Marketplace: old mock AgentCard grid (fake success rates, job counts,
  attestations) replaced by the live directory. Old marketplace preserved
  verbatim as `SampleMarketplace` for dev sample mode.
- Home: "6 verified agents · 8,914 jobs completed" removed — replaced with
  real indexer counts. Featured section now = top of the live directory.
- Vertical pages: 3 hardcoded mock cards each removed; guardrail/product
  copy kept (it is product copy, not data).
- Agent profile for live agents: no invented success-rate/jobs/performance
  chart — real indexer tiles (health / feedbacks / score) instead.
- `erc8004.ts` adapter now operates on SAMPLE_AGENTS only (dev path).

## Live directory status

- `lib/scan-server.ts` — `listAgents({chainId=56, limit=24})` against
  `https://8004scan.io/api/v1/public/agents` reusing the IP-rotation-safe
  probe (`scanHttpGet`). 60s in-memory TTL cache (per server instance; on
  Vercel isolates that means effectively per-request — the degraded path
  covers failures). NEVER throws: `{ agents: [], total: 0, degraded: true }`.
  `meta.pagination.total` = real indexed count for the chain (252,9xx and
  climbing — observed live during the walk).
- Marketplace / AlphaDesk / TaskChain / Home are server components
  (`force-dynamic`); client `<MarketClient>` merges `store.submittedAgents`
  and renders `<ScanAgentCard>`: name (or "Agent #tokenId"), tokenId,
  truncated owner, total_score, total_feedbacks, health_score,
  x402_supported, is_verified badge, "View on 8004scan". Null/zero metrics →
  "Fresh agent — no feedback yet." Filters All / x402-supported / Verified;
  sort score / feedbacks / newest.
- Degraded path observed LIVE during the walk: /alphadesk hit an 8004scan
  rotation failure and rendered the banner "Indexer unreachable — showing
  locally listed agents" with the local submission + honest 0 total, then
  /taskchain loaded the full live directory seconds later. Both paths work.

## Browser walk (real dev server, zero JS errors)

- /marketplace: 24 live agents with real names/scores (12, 12.01), real
  token ids, x402 chips; "24 listed · 252,936 indexed on BSC".
- /submit → verified 56:0x8004…:263312 → merged: "25 listed", card
  "Verified via 8004scan · submitted locally".
- /agents/scan-56-263312: real indexer description, "Indexer-listed" +
  "Verified via 8004scan" + "Unrated" badges, real health/feedback/score
  tiles, Live Mainnet Metrics panel, generic capability, no mock chart.
- /hire?agent=scan-56-263312 end-to-end: agent loads via proxy, generic
  capability "Custom session task — you set the terms", user scope textarea,
  fee cap from step 2 → manifest `task_type: custom_session`, execution note
  ("Execution depends on the agent's own endpoints; your session terms are
  enforced by your wallet session keys."), session created + confirmed
  (ses-5667d47e, v2 hash, active).
- /alphadesk degraded banner live; /taskchain full directory; dashboard
  renders the scan session; console clean.

## Label matrix (STEP 7 — current truth, everywhere in the UI)

| Integration | Status string |
|---|---|
| ERC-8004 | KNOWN — mainnet IdentityRegistry verified (0x8004A169…); agent 263312 registered |
| 8004scan | LIVE — directory + metrics API (Pro/AltLLM UNKNOWN) |
| PancakeSwap | addresses KNOWN (official deployments); execution adapter DEMO |
| x402 | schema KNOWN (B402); settlement DEMO (facilitator onboarding-gated) |
| Altana | SDK + KeyStore addresses KNOWN; integration DEMO |

Applied in: `adapters/*.ts` STATUS constants, `/api/evidence` integrationStatus,
settings "List your agent" panel, site footer.

## Checks

- typecheck clean; build 14/14 — /marketplace, /alphadesk, /taskchain now
  ƒ dynamic (expected); /submit, /settings, /dashboard stay ○ static.
- tests: canonical-crosscheck, gate-readonly, verify-delegation (14/14),
  verify-deploy-hardening (10/10) — offline PASS; verify-live-directory
  (19/19, online) new; verify-mainnet-bridge-evidence 29/29; checksum
  MEMORY VERIFIED.

## Honest notes

- The 60s cache is per server-instance memory; on Vercel's isolated
  lambdas each request may re-fetch (typical ~300ms, worst-case bounded by
  the 10s cap). Real cross-request caching would need ISR/revalidate —
  not added (no new deps, per constraint).
- Agent categories/verticals are unverified for directory agents (the
  indexer does not expose them) — shown as such on the vertical pages.
- Risk is not claimed for directory agents ("Unrated — your session terms
  enforce limits").

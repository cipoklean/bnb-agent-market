# TASKS — status: TODO | DOING | BLOCKED | DONE

## PHASE 0: Memory Foundation
- [x] Memory folder, all files, checksum script, events logger, protocol docs (docs/MEMORY_PROTOCOL.md) — DONE

## PHASE 1: Design System — DONE (Next.js app, Lumen Deck tokens, primitives, layout, TrustPanel, MemoryAttestationCard, ConfirmBar, ProofDrawer)

## PHASE 2: Marketplace Core — DONE (Home, Marketplace, Agent Profile, mock data, ERC-8004 adapter + indexer placeholder, Hire Wizard, session manifest + confirmation flow)

## PHASE 3: AlphaDesk — DONE (vertical page, 3 demo agents, risk panel, PaymentSheet, TrustPanel)

## PHASE 4: TaskChain Bazaar — DONE (vertical page, 3 demo agents, task templates)

## PHASE 5: Memory + Confirm Centers — DONE (hashes, attestations, export/import, manifest diff, history)

## PHASE 6: Partner Evidence — DONE (TermiX report, evidence grid, /api/evidence JSON+MD export)

## PHASE 7: Testing & Security — DONE (15/15 forge tests; build 13/13 routes; hire+revoke verified in browser; checksum; agent-runner gate blocks forbidden actions)

## Contracts — DONE (HireAgreement, SessionRegistry, AttestationRegistry + Deploy script + 15 passing tests)

## Agent Runtime — DONE (agent-runner/demo-esm.mjs: ESM manifest, 5-step gate, proof, event log)

## Packages — DONE (erc8004, x402, altana, pancake DEMO adapters; memory + confirmation real logic)

## Patch Batch A+B+C (2026-08-10) — DONE
- [x] A1-A7 honesty & memory integrity — DONE (real bundle hash, real import + UNVERIFIED flags, export snapshots, canonical key-sorted hashing across web/packages/agent-runner, hire preview==stored hash, unified empty-list permissions, eventsHash checksum split)
- [x] B1-B19 flow correctness & UX — DONE (PaymentSheet reviewOnly, fee_model payment_type, ?cat= via location.search, countdown label, risk chip styling, RevokeButton shared component, deterministic price impact, proof mapping, ProofDrawer cleanup, ConfirmBar removed, typed-confirm toggle + reduced-confirmation warning, List your agent card, single primary CTA, viem moved to indexer devDep, gitignore, handoff sync, registry NatSpec, evidence DEMO_SCRIPT + live packets)
- [x] C1 gate tests — DONE (tests/canonical-crosscheck.mjs + tests/gate-readonly.mjs, zero-dep, exit non-zero on failure)
- [x] Patch F6 (2026-08-11) — pre-upgrade sessions no longer show scary red MISMATCH — DONE: hash_version stamping (v2 on new/Hire manifests, "seed" on DEMO seeds), store.reverifySession (recompute w/ current algorithm + honest "Memory re-fingerprinted" event with old→new hashes), four-state badge (VERIFIED / DEMO seed / Pre-upgrade fingerprint / MISMATCH) across session page, MemoryAttestationCard, Confirm diff, Memory table, plus root-cause fix: confirmSession/revokeSession re-hash the manifest when flipping status (status is part of the hash) so confirmed/revoked v2 sessions verify green instead of looking tampered. NOTE: tests/ + both C1 scripts RESTORED 2026-08-11 and PASS (canonical-crosscheck + gate-readonly).
- [ ] Final review + submission pack — NEXT (walkthrough replay, evidence packet + memory bundle export, restore C1 test scripts)

## MAINNET BRIDGE (hackathon requirement: agents deployed + functional on BNB Chain mainnet, real usage metrics tracked post-launch)
- [x] Phase 1: Research & Discovery (2026-08-11) — DONE. All 5 UNKNOWN integrations documented (ERC-8004, Binance x402/B402, Altana, PancakeSwap V3, AltLayer 8004scan). Statuses + exact addresses/SDK commands in memory/INTEGRATIONS.md; remaining unknowns in memory/UNKNOWN_ITEMS.md; dossiers in docs/research/. Zero code changes.
- [x] Phase 2: Register test agents on BNB Chain — **DONE both legs (2026-08-11)**: testnet dry-run then mainnet LIVE. Deviation from the BNBAgent-SDK plan: implemented viem scripts instead (`indexer/scripts/register-agent.mjs` + `verify-agent.mjs`) — zero NEW deps (viem was already the declared indexer devDep; apps/web stays viem-free), same on-chain `register(string, MetadataEntry[])` flow.
  - [x] Testnet registration (chainId 97): agentId **1798**, tx `0xa1ae43b60b3405f155d80fec5d37b495f2c87cf8f1e8376925e01f657db8e1d0`, IdentityRegistry `0x8004A818BFB912233c491871b3d84c89A494BD9e`, wallet `0x3C8176953eadBeE7b9bF8C6a5d1CF1153D924E11` (0.3 tBNB). Safety gate exercised live: .env RPC is mainnet (56) → script detected mismatch, fell back to canonical testnet RPC, verified chainId 97 before signing.
  - [x] Testnet 8004scan verification: `GET /agents/97/1798` → indexed in real time (`is_testnet: true`, `x402_supported: true`, canonical `97:0x8004a818…:1798`).
  - [x] **Mainnet registration (chainId 56)**: agentId **263312**, tx `0xd4715ce1105898e9c5a28529271f9d505bc295db98e190f4c58d636118650c71` (status success, block 115236467, gasUsed 622,584), IdentityRegistry `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`, self-paid from wallet balance (~0.0083 BNB; spent ≈0.0006–0.002). Run explicitly approved by user (2026-08-11).
  - [x] **Mainnet 8004scan verification**: `GET /agents/56/263312` → indexed within seconds (`is_testnet: false`, `is_active: true`, `x402_supported: true`, `created_tx_hash` matches receipt, canonical `56:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432:263312`). UI: https://8004scan.io/agents/bsc/263312.
  - [x] Evidence stored (BOTH networks): `docs/submission/evidence/agent-registration.md` (mainnet + testnet, verbatim 8004scan JSON), `8004scan-verification.json` (mainnet) + `8004scan-verification-testnet.json`, `last-registration.json` (mainnet) + `last-registration-testnet.json`.
  - [x] Scores still 0/health null on both agents — that IS the honest fresh state; post-launch usage metrics accumulate on the public 8004scan API (Phase 3 ObservabilityPanel).
- [~] Phase 3: Swap DEMO adapters → real clients — ERC-8004/8004scan slice DONE (2026-08-11); x402/Altana/PancakeSwap swaps still TODO (no new deps without user OK).
  - [x] **ERC-8004 + 8004scan live metrics in the UI**: adapter promoted DEMO→KNOWN (registry verified Phase 1/2); `getLiveScanMetrics()` real fetch + merge for mainnet agent (portfolio-reporter ↔ 56:263312); same-origin proxy route `/api/8004scan/[chainId]/[tokenId]` (8004scan.io first A-record IP is blackholed from some networks — server probes all resolved IPs via node:https+SNI, 3×2.5s + plain-fetch fallback < 10s; numeric guard; no-store); "Live Mainnet Metrics" panel on `/agents/portfolio-reporter` (real health/score/feedbacks, green x402-supported check, "View on 8004scan", badge "Live Data via 8004scan API", honest fresh-agent note); graceful fallback (console.warn + mock data, page never breaks); evidence packet integrationStatus erc8004/altlayer KNOWN. Verified: typecheck clean, build 14/14, browser walk (panel live, other agents mock, marketplace deterministic, /api 200 + 400 guard). Evidence: `docs/submission/evidence/8004scan-ui-integration.md`.
  - [ ] x402: challenge/verify via B402 or self-facilitator.
  - [ ] Altana: grantSession/revokeSession real client.
  - [ ] PancakeSwap V3: quoter/router with AlphaDesk allowlist + slippage caps (addresses KNOWN).
- [x] Phase 4: Production architecture (2026-08-11) — fake-data purge, submission portal, strict delegation tree. DONE (details in docs/submission/evidence/production-architecture.md; decisions D008/D009/D010).
  - [x] **Fake-data purge (D009)**: store `sessions` starts `[]`; persist bumped to version 2 with a migrate that strips hash_version "seed" sessions from rehydrated localStorage (verified in browser: legacy storage → 0 sessions); `reset()` wipes to empty; dashboard shows exact empty state ("No active sessions." / "Hire your first agent from the marketplace to get started." / "Explore Marketplace" → /marketplace).
  - [x] **Submission portal (D010, verify-before-listing)**: `/submit` human form (ERC-8004 Agent ID + name) → POST `/api/agents/submit` → server-side 8004scan verification (shared lib/scan-server.ts IP-probe) → only verified ids get the local listing with "Verified via 8004scan" badge; A2A endpoint for agents ("// A2A Endpoint: Autonomous agents can POST here to list themselves."), 400 invalid / 404 not-found / 502 unreachable / 200 registered; marketplace merges submitted agents; AgentCard + detail + hire pages resolve them.
  - [x] **Strict delegation tree (D008)**: `parent_session_id?` on the manifest (delegating agent identity); `revokeSession(session_id, caller_id)` — "user" (human) always allowed; agent callers allowed ONLY on sessions they delegated (parent match), else throw "Delegates cannot revoke sibling or parent sessions"; logic in `lib/delegation.ts` (plain-JS → node-testable); `tests/verify-delegation.mjs` 14/14; RevokeButton passes the human caller and surfaces denials; F6 rehash-on-revoke preserved (browser-verified).
  - [ ] Remaining Phase-4 decisions (unchanged from earlier): B402 onboarding vs self-facilitator for x402 + AltLLM telemetry access; then finish remaining adapter swaps (Phase 3 slices: x402 challenge/verify, Altana grantSession/revokeSession, PancakeSwap V3 quoter/router — no new deps without user OK).

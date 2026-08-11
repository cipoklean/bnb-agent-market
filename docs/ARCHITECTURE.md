# Architecture — BNB Agent Market Core

## Shape
Monorepo: single Next.js frontend (all 12 UI pages as routes), Foundry contracts, TypeScript adapter packages (source-only), zero-dependency Node agent-runner, indexer skeleton, hash-verified memory layer.

```
apps/web        Next.js 14 (App Router) — Lumen Deck UI. Pages: /, /marketplace,
                /agents/[id], /hire, /dashboard, /sessions/[id], /memory,
                /confirm, /alphadesk, /taskchain, /settings, /evidence, /api/evidence
contracts       Foundry 0.8.20, no OZ dep: HireAgreement, SessionRegistry,
                AttestationRegistry (+ Deploy script, 15 passing tests)
packages/       erc8004, x402, altana, pancake (DEMO adapters, UNKNOWN-marked),
                memory + confirmation (REAL sha256 + gate logic, zero deps)
agent-runner    demo-esm.mjs — ESM session memory + 5-step confirmation gate
                (hash → permissions → budget → expiry → verdict), proof + event log
indexer         viem event-watcher skeleton (PLACEHOLDER until addresses verified)
memory/         build memory layer: 12 files, SHA-256 bundle checksum, event log
scripts/        checksum.mjs, log-event.mjs
```

## Trust model
1. **Manifest** — user builds a session (scope, budget, permissions, expiry, payment) alongside the agent's ERC-8004 identity.
2. **Hash** — canonical JSON → SHA-256 `memory_hash`; recomputed before every action.
3. **Gate** — agent runtime verifies hash match, allowlisted targets/selectors, spend caps, expiry; high-risk actions additionally need typed `CONFIRM`.
4. **Proof** — every executed action yields a proof (tx hash / memory hash / receipt / attestation); every session records events and confirmations.
5. **Recall** — user can revoke instantly, on every screen where the agent appears ("Stop this agent now.").

## Hashing
`memory_hash` = sha256(canonical manifest JSON, fixed field order). Bundle checksum = sha256 over sorted per-file hashes of `/memory`. All done with Web Crypto (browser) / node:crypto (CLI); no shared-secret security theater — integrity, not secrecy.

## Adapter honesty
Official ERC-8004 registry, x402 schema, Altana SDK, PancakeSwap addresses, AltLayer 8004scan Pro are UNKNOWN → interfaces exist with labeled DEMO implementations; `memory/UNKNOWN_ITEMS.md` tracks each. Nothing faked.

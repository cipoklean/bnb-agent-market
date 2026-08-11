# BNB Agent Market Core

Marketplace layer for discovering, hiring, paying, monitoring, and revoking AI agents on BNB Smart Chain.

- **AlphaDesk** — DeFi & Trading agent marketplace (PancakeSwap automation).
- **TaskChain Bazaar** — Productivity & Automation agent marketplace.

Identity via ERC-8004, payments via Binance x402, safe sessions via spend caps/expiry/revocation, and a memory confirmation layer (Easy Session Memory) so agents never act unconfirmed.

## Quick start

```bash
cd apps/web
npm install
npm run dev        # http://localhost:3000
```

Verify memory integrity: `node scripts/checksum.mjs`
Run demo agent (ESM session memory): `node agent-runner/demo-esm.mjs`

## Repo layout

- `apps/web` — Next.js frontend (Lumen Deck UI, all 12 pages)
- `contracts` — Foundry contracts (HireAgreement, SessionRegistry, AttestationRegistry)
- `packages/*` — adapter interfaces (erc8004, x402, altana, pancake, memory, confirmation)
- `agent-runner` — zero-dependency Node ESM demo of Easy Session Memory + confirmation gate
- `indexer` — event watcher skeleton
- `memory/` — build memory layer (hash-verified)
- `scripts/` — checksum + event logger
- `docs/` — design docs, evidence, submission packet

## Status

Phase 0 (memory foundation) complete. See `memory/PROGRESS.md` + `memory/TASKS.md`.

## Honesty rule

Official ERC-8004 / x402 / Altana / PancakeSwap / AltLayer SDK details are marked UNKNOWN until verified; adapters with clear DEMO implementations are used instead. Nothing is faked — see `memory/UNKNOWN_ITEMS.md`.

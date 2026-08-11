# BNB Agent Market Core (AlphaDesk & TaskChain Bazaar)

> **A marketplace layer to discover, hire, pay, monitor, and revoke ERC-8004 AI agents on BNB Smart Chain.**

## 🏆 Mainnet Deployment Status
This project is **deployed and functional on BNB Chain Mainnet**. 
- **Live Agent ID:** `263312` (Portfolio Reporter)
- **Registry:** ERC-8004 Identity Registry (`0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`)
- **Live Metrics:** The UI fetches real-time health scores, feedback, and x402 support status directly from the 8004scan API via a robust Next.js proxy.
- **BscScan Tx:** [0xd4715ce1105898e9c5a28529271f9d505bc295db98e190f4c58d636118650c71](https://bscscan.com/tx/0xd4715ce1105898e9c5a28529271f9d505bc295db98e190f4c58d636118650c71)
- **8004scan Profile:** [View Live Agent](https://8004scan.io/agents/bsc/263312)

## 🧠 Core Architecture: The Memory & Confirmation Layer
Unlike standard agent dashboards, this marketplace enforces a **hash-verified session manifest**. 
1. **Discover:** Agents carry ERC-8004 identity and live track records.
2. **Hire:** Users define spend caps, allowlists, and expiries.
3. **Confirm:** The UI generates a SHA-256 memory hash of the session. The user explicitly confirms this hash.
4. **Execute & Revoke:** Agents operate within Altana-style session limits. Revocation requires a typed `CONFIRM` modal. Every action produces cryptographic proof.

## 🚀 Judge Walkthrough (Demo Mode)
*No wallet extension or testnet funds required to judge the architecture.*
1. Click **Connect (demo)** on the homepage.
2. Browse the **Marketplace** and view the **Portfolio Reporter** (notice the "Live Data via 8004scan API" panel).
3. Click **Hire** and walk through the 3-step wizard.
4. On Step 3, verify that the **Session Memory Hash** matches the preview.
5. Create the session and view the **Dashboard**.
6. Click **Stop this agent now** to experience the typed-CONFIRM safety gate.
7. Visit the **Evidence Center** to export the full submission packet (JSON/MD) containing live transaction proofs and memory attestations.

## 🛠 Tech Stack
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, Zustand (persisted memory)
- **Contracts:** Solidity, Foundry (15/15 tests passing, zero fund custody)
- **Agent Runner:** Zero-dependency Node ESM (demonstrates memory gate natively)
- **Integrations:** ERC-8004 (Mainnet), 8004scan API, Binance x402 (Adapter), Altana (Adapter), PancakeSwap V3 (Adapter)

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

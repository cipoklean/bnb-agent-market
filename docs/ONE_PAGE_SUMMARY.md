# BNB Agent Market Core — One Page Summary

**What it is:** A marketplace layer for discovering, hiring, paying, monitoring, and revoking AI agents on BNB Smart Chain. Not a landing page — a working operating layer with two product verticals.

**AlphaDesk** — DeFi & trading agents (PancakeSwap LP rebalancing, yield harvesting, protected swaps).
**TaskChain Bazaar** — productivity agents (DAO voting, airdrop claims, portfolio reporting).

**The problem it solves:** AI agents can't be trusted with wallets. Marketplaces list agents but give users no real control. This product makes control the product: every agent acts only inside a user-approved, hash-verified session contract — spend caps, allowlists, expiry, instant revocation, and proof of every action.

**How it works (user's view):**
1. Browse agents with ERC-8004 identity + on-chain track record.
2. Hire in 3 steps: choose a task → set limits (spend caps, allowed contracts, expiry) → confirm session memory + approve x402 payment.
3. Watch the agent work: every action logged with proof (tx hash / memory hash / receipt).
4. Stop the agent instantly — one click, works from every screen.

**Trust mechanics:** Session Manifest → canonical SHA-256 memory hash → 5-step confirmation gate (hash, permissions, budget, expiry, verdict) → proof + audit log. High-risk actions additionally require the user to type CONFIRM. No action happens until the user confirms — enforced in the UI, the agent runtime, and the confirmation store.

**Stack:** Next.js 14 + TypeScript + Tailwind (Lumen Deck design), Foundry contracts (HireAgreement, SessionRegistry, AttestationRegistry — 15 passing tests), Node ESM agent-runner (zero deps), adapter packages for ERC-8004 / Binance x402 / Altana / PancakeSwap / AltLayer.

**Honesty:** Official ERC-8004 registry, x402 schema, Altana SDK, PancakeSwap addresses, and AltLayer 8004scan Pro are UNKNOWN (tracked in memory/UNKNOWN_ITEMS.md) — every integration is an interface with a clearly labeled DEMO implementation until verified. Nothing faked; every proof real (memory hashes, event logs, test results).

**Evidence:** /evidence page + /api/evidence (JSON & Markdown packet) export the full submission bundle: project summary, per-partner proofs (ERC-8004 / x402 / Altana / PancakeSwap / TermiX / AltLayer), memory attestations, confirmation logs.

**Run:** `cd apps/web && npm install && npm run dev` · contracts: `cd contracts && forge test` · agent gate demo: `node agent-runner/demo-esm.mjs`

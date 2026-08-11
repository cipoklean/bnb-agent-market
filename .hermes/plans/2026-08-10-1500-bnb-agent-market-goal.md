# BNB Agent Market Core — Build Goal (from master build prompt)

**Goal:** Working marketplace monorepo: discover → verify → hire → pay (x402) → monitor → revoke AI agents on BNB Smart Chain, with a hash-verified memory & confirmation layer. AlphaDesk (DeFi) + TaskChain Bazaar (productivity) verticals. Hackathon-ready evidence.

**Stack:** Next 14.2 + React 18 + TS + Tailwind 3.4 (Lumen Deck) · Foundry contracts (0.8.20, no OZ dep) · viem · zustand · Node ESM agent-runner (zero deps).

## Phases → Files

- **P0 Memory foundation** (DONE): memory/*.md (12 files, checksum.json, events.jsonl), scripts/checksum.mjs, scripts/log-event.mjs, docs/MEMORY_PROTOCOL.md
- **P1 Design system** (DONE): apps/web configs, globals.css tokens, ui.tsx primitives, SiteHeader, layout
- **P2 Marketplace core**: marketplace, agent profile, hire wizard (3-step, real manifest hash), home
- **P3 AlphaDesk**: vertical page, 3 agents, risk panel, PaymentSheet, TrustPanel
- **P4 TaskChain**: vertical page, 3 agents, task templates
- **P5 Memory/Confirm centers**: memory page (attestation, hashes, export/import), confirm page (pending, typed CONFIRM for high-risk, manifest diff)
- **P6 Evidence**: evidence page + /api/evidence (json/md packet from real memory bundle)
- **Contracts**: HireAgreement, SessionRegistry (spend caps/expiry/revoke), AttestationRegistry + Foundry tests
- **Packages**: erc8004/x402/altana/pancake adapters (DEMO, UNKNOWN-marked), memory + confirmation (real crypto logic)
- **agent-runner**: demo-esm.mjs — ESM confirm gate demo, blocks a forbidden action
- **Verify**: npm run build (0 errors), dev server page smoke, forge test, node agent-runner/demo-esm.mjs

## Rules
Memory before code (done). No guessing → adapters + UNKNOWN items. No faked integrations. User commits git himself. Lumen Deck microcopy (plain English).

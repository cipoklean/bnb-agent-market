# MODEL HANDOFF

For any new model/session taking over this build:

1. Read this file, then all /memory files.
2. Run `node scripts/checksum.mjs` and compare to memory/checksum.json. Mismatch = stop.
3. Read memory/SESSION_STATE.md for the confirmed next best action.
4. Output a Memory Attestation. Do not assume anything not written in memory.
5. Wait for MEMORY CONFIRMED before mutating the build.

## Current State (2026-08-10)
- Project: BNB Agent Market Core (AlphaDesk + TaskChain Bazaar) at C:\Users\HomePC\Desktop\bnb-agent-market
- Spec: C:\Users\HomePC\Downloads\bnb-agent-market-complete-build-prompt.txt
- Phase: ALL BUILD PHASES COMPLETE (0-7) + contracts + agent runtime + packages. Patch batch A+B+C applied 2026-08-10 (honesty & memory integrity, flow correctness, gate tests).
- Stack: Next 14.2 / React 18 / TS / Tailwind 3.4 / zustand / recharts / lucide-react (viem is indexer-ONLY devDependency, not installed by default); Foundry contracts; Node ESM agent-runner (zero deps).
- Key decisions: D001-D007 in DECISIONS.md (single app for all pages; mock-first via adapters; minimal contracts; ESM agent-runner).
- Style: Lumen Deck tokens in UI_SYSTEM.md + src/app/globals.css. Plain-English microcopy.
- Do not: fake integrations, commit to git (user commits), delete confirmed memory without approval.

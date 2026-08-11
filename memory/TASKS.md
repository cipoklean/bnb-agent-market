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
- [ ] Patch F6 (2026-08-11) — pre-upgrade sessions no longer show scary red MISMATCH — DONE: hash_version stamping (v2 on new/Hire manifests, "seed" on DEMO seeds), store.reverifySession (recompute w/ current algorithm + honest "Memory re-fingerprinted" event with old→new hashes), four-state badge (VERIFIED / DEMO seed / Pre-upgrade fingerprint / MISMATCH) across session page, MemoryAttestationCard, Confirm diff, Memory table, plus root-cause fix: confirmSession/revokeSession re-hash the manifest when flipping status (status is part of the hash) so confirmed/revoked v2 sessions verify green instead of looking tampered. NOTE: tests/ dir + both C1 scripts are MISSING from this checkout — restore before final verification.
- [ ] Final review + submission pack — NEXT (walkthrough replay, evidence packet + memory bundle export, restore C1 test scripts)

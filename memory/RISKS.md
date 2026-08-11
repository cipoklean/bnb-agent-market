# RISKS

| Risk | Impact | Mitigation |
|------|--------|------------|
| Official integration addresses/ABIs unknown (ERC-8004 registry, x402 schema, Altana SDK, PancakeSwap addrs, AltLayer) | Can't demo live chain actions | Adapters + honest DEMO labels; evidence uses real memory hashes + mock tx proofs |
| Scope is huge (full monorepo) | Slow build, half-finished features | Phased: working demo across all 12 pages first, depth later; mock-first |
| Next.js build breakage from dependency drift | Blocked demo | Pin known-good versions (Next 14.2 / React 18 / Tailwind 3.4); verify `npm run build` before finishing |
| Sub-agent iteration limits | Missing files | Parent owns verification; patch directly after sub-agents |
| Wagmi/TanStack/Postgres deferred to adapter layer | Judge may expect live wallet | Documented D005 decision; viem + zustand carry demo; real wallet integration possible later |
| User commits himself in parallel | Conflicts | Re-check git status before acting on diffs; no commits by agent |

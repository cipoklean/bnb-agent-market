# DECISIONS

| ID | Date | Decision | Reason | Status | Approval |
|----|------|----------|--------|--------|----------|
| D001 | 2026-08-10 | Monorepo at `C:\Users\HomePC\Desktop\bnb-agent-market` | Spec repo structure; lives with other projects on Desktop | Confirmed | User |
| D002 | 2026-08-10 | Memory layer first (Phase 0), UI/contracts only after memory exists | Build prompt RULE 2 | Confirmed | User |
| D003 | 2026-08-10 | Adapters-first for ERC-8004 / x402 / Altana / PancakeSwap / AltLayer; official ABIs, addresses, and SDKs marked UNKNOWN until verified | Build prompt RULE 1 / adapter pattern | Confirmed | User |
| D004 | 2026-08-10 | Single Next.js app (apps/web) hosts all 12 UI pages; AlphaDesk + TaskChain are routes, not separate apps | Spec IA lists 12 pages in one shell; simpler demo, faster build | Confirmed | User |
| D005 | 2026-08-10 | Frontend deps: Next 14.2 + React 18 + TS + Tailwind 3.4 + viem + zustand + recharts + lucide-react. Deviation: wagmi/TanStack Query/Postgres/Redis deferred — mock-first demo, adapters keep chain access real when credentials exist | Clean build reliability; hackathon demo pattern | Confirmed | User |
| D006 | 2026-08-10 | Contracts minimal per spec rules: HireAgreement, SessionRegistry, AttestationRegistry + Foundry tests; no fund custody | Smart contract rule: minimal for hackathon, prefer safety | Confirmed | User |
| D007 | 2026-08-10 | agent-runner is plain Node ESM (.mjs), zero deps: demonstrates ESM session memory + confirmation gate runnable with `node` | Model-independent memory must actually run | Confirmed | User |

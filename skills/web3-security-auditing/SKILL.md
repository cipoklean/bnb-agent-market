---
name: web3-security-auditing
description: "Full-spectrum Web3 security auditing skill for agent marketplaces — smart contract auditing, frontend/API hardening, ERC-8004 integration, partner compliance, and production readiness"
category: web3-security
tags: [web3, security-audit, erc8004, bnb-chain, hackathon, production-readiness]
version: 1.0.0
platforms: [linux, macos, windows]
---

# Web3 Security Auditing Skill

**Category**: web3-security  
**Trigger**: Use when conducting a full-spectrum security audit of a Web3 agent marketplace or smart contract system, or when executing a "Kill the Demo" protocol to strip mock data and connect to mainnet ERC-8004 registries.

## WHAT THIS SKILL COVERS

This skill governs the systematic auditing and hardened production-readiness of Web3 agent marketplaces. It encompasses:

- Smart contract security auditing (Solidity/Foundry contracts: HireAgreement, SessionRegistry, AttestationRegistry)
- Frontend & API security (Next.js 14 A2A submission endpoints, Zod schema validation, rate limiting)
- ERC-8004 & 8004scan integration verification
- Partner track compliance (Altana, PancakeSwap, TermiX)
- Production readiness (demo data purging, mainnet connectivity, mock data elimination)

## THE KILL THE DEMON PROTOCOL

A 5-phase protocol for transforming a Web3 agent marketplace from demo/mock mode to production-ready mainnet deployment:

### PHASE 1: PURGE DEMO FLAGS & MOCK DATA (The Kill Switch)
- Hardcode `sampleAgentsEnabled` to always return `false`
- Delete `SAMPLE_AGENTS` array and all demo session/payment data
- Remove `DEMO_WALLET` constants; enforce real injected wallet connection via wagmi/RainbowKit
- Delete snapshot fallbacks in directory cache — on indexer failure, return `{ agents: [], total: 0, degraded: true }`

### PHASE 2: SECURE A2A API & REAL ERC-8004 VERIFICATION
- Install and use `zod` and `viem`
- Replace raw `JSON.parse()` with strict Zod schema validation
- Add on-chain ERC-8004 registry verification via BSC mainnet (address: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`)
- Use minimal ABI `ownerOf(tokenId)` to verify token existence; revert 404 if zero address
- Preserve existing rate-limiting logic; add `verifiedVia8004: true` on success

### PHASE 3-5: (Remaining protocol phases for full production readiness)
- Partner track compliance verification
- Production readiness guards and environment variable protection
- Final build verification and deploy gates

## SIGNALS THAT WARRANT SKILL UPDATE

| Signal Type | Example | Action |
|---|---|---|
| User corrected style/format/verbosity | "stop doing X", "too verbose", "don't format like this" | Embed preference in SKILL.md body |
| User corrected workflow/approach | "this is the wrong sequence" | Add pitfall/explicit step in skill |
| Non-trivial technique emerged | "Kill the Demo" protocol, new verification pattern | Capture as numbered steps in skill |
| Skill was wrong/missing | Skills list was empty, protocol didn't exist | Create new class-level skill |

## SUPPORT FILES

Create support files under the skill's directory:

- `references/web3-audit-checklist.md` — Condensed checklist of audit pillars and severity grades
- `templates/demo-purge-prompt.txt` — The exact prompt used to execute Phase 1
- `scripts/verify-build.ts` — TypeScript script to verify `npm run build` succeeds after demo-purging

## SEVERITY GRADING MATRIX (from audit pillar)

| Severity | Count | Description |
|---|---|---|
| CRITICAL | 4 | SessionRegistry revokeSession lacks parent_session_id validation; ERC-8004 adapter entirely DEMO; POST /api/agents/submit lacks Zod schema validation; Altana sessions in-memory only |
| HIGH | 3 | Rate limiter per-instance, not distributed; Altana zero session spend cap; PancakeSwap demo could enable fund drainage |
| MEDIUM | 6 | Memory hash client-side manipulation potential; Zustand persisted state client manipulation; no agent ID validation before 8004scan fetch; directory cache staleness; TermiX report placeholder; sample agents with verified: true but no on-chain backing |
| LOW | 3 | No reentrancy guards in contracts; no CSP customization; env var test overrides that could break production |

## SESSION-SPECIFIC NOTES

This skill was activated during a comprehensive audit of the `bnb-agent-market` repository for the BNB Chain "Build the Era" hackathon. The audit evaluated 5 pillars (Smart Contract Security, Frontend & API Security, ERC-8004 Integration, Partner Track Compliance, Production Readiness) and produced a severity-graded report with 4 Critical, 3 High, 6 Medium, 3 Low findings.

The "Kill the Demo" protocol successfully transformed the codebase from a functioning demo application to a mainnet-ready state by:

- Purging all 6 mock agents with fake `agentId8004` fields
- Removing the hardcoded demo wallet (`0xf5fBbf435eCC12542992Db5C9E14E117a90059c4`)
- Replacing sample session/confirmation/payment data with production-empty states
- Implementing on-chain ERC-8004 verification via the BSC mainnet registry
- Adding Zod schema validation to the A2A submission endpoint
- Removing all snapshot/degraded fallbacks that served stale mock data

**Build status**: `npm run build` compiles successfully after all changes.

## REFERENCES

- Audit report conducted for BNB Chain Build the Era hackathon
- ERC-8004 mainnet registry: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- Zod schema validation pattern for ERC-8004 ID format: `/^\d+:0x[a-fA-F0-9]{40}:\d+$/`
- Next.js 14 force-dynamic API route pattern for on-chain verification
- Unknown items memory: `memory/UNKNOWN_ITEMS.md` — lists items whose on-chain addresses/ABIs are unverified
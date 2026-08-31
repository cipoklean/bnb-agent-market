# Web3 Audit Checklist

## Audit Pillars

### 1. Smart Contract Security (Solidity/Foundry)
- [ ] Audit contracts/HireAgreement.sol, SessionRegistry.sol, AttestationRegistry.sol
- [ ] Check revocation hierarchy: Human > Agent A > Agent B
- [ ] Verify revokeSession strictly validates caller_id against parent_session_id
- [ ] Ensure zero fund custody — no reentrancy vectors in session registration/execution
- [ ] Check for recursive attack vectors or bypasses where agent can revoke sibling or itself

### 2. Frontend & API Security (Next.js 14)
- [ ] Audit POST /api/agents/submit — payload injection, Zod schema validation, rate-limiting, spoofed ERC-8004 ID submissions
- [ ] Verify SHA-256 session manifest generation — UI blocks execution if user's confirmed hash does not match on-chain session parameters
- [ ] Check Zustand persisted state for client-side manipulation vulnerabilities

### 3. ERC-8004 & 8004scan Integration
- [ ] Audit Next.js proxy fetching logic — securely retrieves real-time health scores/feedback from 8004scan API
- [ ] Verify submission portal strictly validates agent ID against live 8004scan indexer before listing
- [ ] Check for API key exposure or cache poisoning vectors

### 4. Partner Track Compliance
- [ ] Altana: Verify session spend caps and expiries enforced on-chain and visible to user
- [ ] PancakeSwap: Audit V3 adapter for safe automated swaps — user funds cannot be drained by malicious agent logic
- [ ] TermiX: Ensure platform metrics can accurately support 'Agent Advantage Report' generation

### 5. Production Readiness
- [ ] Scan for hardcoded mock agents, testnet fallbacks, or demo scripts that compromise mainnet submission integrity
- [ ] Verify no `NEXT_PUBLIC_SAMPLE_DATA=1` can be set in production
- [ ] Ensure `DEMO_MODE` flag cannot enable demo data in production deployment
- [ ] Check for hardcoded mock agent wallets (e.g., 0xf5fBbf435eCC12542992Db5C9E14E117a90059c4)
- [ ] Verify all contracts marked "Hackathon-minimal" have production upgrade path

## Severity Grading Matrix

| Severity | Count | Description |
|----------|-------|-------------|
| CRITICAL | 4 | SessionRegistry revokeSession lacks parent_session_id validation; ERC-8004 adapter entirely DEMO; POST /api/agents/submit lacks Zod schema validation; Altana sessions in-memory only |
| HIGH | 3 | Rate limiter per-instance, not distributed; Altana zero session spend cap; PancakeSwap demo could enable fund drainage |
| MEDIUM | 6 | Memory hash client-side manipulation potential; Zustand persisted state client manipulation; no agent ID validation before 8004scan fetch; directory cache staleness; TermiX report placeholder; sample agents with verified: true but no on-chain backing |
| LOW | 3 | No reentrancy guards in contracts; no CSP customization; env var test overrides that could break production |

## Kill the Demo Protocol

### Phase 1: Purge Demo Flags & Mock Data
- Hardcode `sampleAgentsEnabled` to always return `false`
- Delete `SAMPLE_AGENTS` array and all demo session/payment data
- Remove `DEMO_WALLET` constants; enforce real injected wallet connection
- Delete snapshot fallbacks in directory cache

### Phase 2: Secure A2A API & Real ERC-8004 Verification
- Install `zod` and `viem`
- Replace raw `JSON.parse()` with Zod schema validation
- Add on-chain ERC-8004 registry verification via BSC mainnet
- Use `ownerOf(tokenId)` minimal ABI to verify token existence
- Return 404 if token is zero address or verification fails

### Phase 3-5: Remaining Phases
- Partner track compliance verification
- Production readiness guards
- Build verification and deploy gates

## Build Verification

Run `npm run build` in `apps/web/` — must compile successfully after all demo data purging.
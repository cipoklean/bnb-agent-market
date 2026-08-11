# UNKNOWN ITEMS (no guessing — adapters until verified)

RESOLVED in Mainnet Bridge Phase 1 (2026-08-11): ERC-8004 Identity+Reputation registry addresses & ABI (KNOWN), ERC-8004 SDK/registration flow (KNOWN), ERC-8004 metadata schema (KNOWN — registration-v1), 8004scan public REST API (KNOWN), Binance x402/B402 payload schema + header format + settlement flow (KNOWN), Altana session-key SDK + spend limits + revocation + KeyStore addresses (KNOWN), PancakeSwap V3 router/position manager/quoter addresses on BSC mainnet (KNOWN). See memory/INTEGRATIONS.md for exact values.

Still unknown / partially unknown — adapters keep DEMO markers until closed:

1. ERC-8004 Validation Registry address on BNB Chain. (Why: validation reads. EIP-8004 section under active revision with the TEE community; 8004scan /stats reports total_validators=0. Do not build real validation reads yet.)
2. Binance B402 facilitator EOA (`extra.signerAddress`) and Permit2 proxy (`extra.spenderAddress`). (Why: needed at runtime for settlement. NOT PUBLISHED — returned only by the authenticated `/supported` endpoint; per docs must not be hardcoded.)
3. Binance B402 BSC Mainnet API credentials / base URL. (Why: production settlements. Mainnet access "on request" via onboarding form; testnet eip155:97 is live for onboarding.)
4. B402 402-header encoding ambiguity. (Why: X-PAYMENT-REQUIREMENTS header byte value — raw JSON vs base64 — is not explicitly documented by Binance; open spec uses base64 PAYMENT-REQUIRED; Altana reads X-PAYMENT → PAYMENT-SIGNATURE fallback. Decide at implementation: accept all three, emit the open-spec shape.)
5. AltLayer AltLLM API access. (Why: LLM usage telemetry in the observability panel. No AltLLM API docs found in Phase 1; only 8004scan REST (KNOWN) and the UI.)
6. Altana mainnet account-stack addresses (Orchestrator / Delegation proxy / Account implementation / Simulator / Funder / Escrow). (Why: published for testnet only; mainnet uses EIP-7702 delegation. Only KeyStore + KeyStoreController are published for mainnet.)
7. 8004scan auth requirements per endpoint. (Why: which endpoints need X-API-Key and how to register for Pro tier. Rate tiers documented; key issuance not walked end-to-end in Phase 1.)
8. Hackathon submission form fields. (Why: evidence export format. Not yet researched — Phase 3/4.)
9. x402 exact signature verification edge cases on BNB (EIP-712 recovery for smart-account/Agentic-Wallet payers; ERC-1271 vs EOA). (Why: verifyReceipt must handle both; B402 docs cover EOA signatures — wallet-contract payers are implied via Agentic Wallet, not documented in depth.)

All of the above use adapter interfaces with explicit DEMO/placeholder implementations until verified. See memory/INTEGRATIONS.md.

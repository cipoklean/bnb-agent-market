# INTEGRATIONS

## ERC-8004 (agent identity)
- Needs: registry address, ABI, metadata schema. Status: UNKNOWN — adapter interface in packages/erc8004 + src/lib/adapters/erc8004.ts (mock registry data). UI shows identity + track record from adapter output; badge says "On-chain proof of this agent's history."

## Binance x402 (payments)
- Needs: payment schema, receipt verification. Status: UNKNOWN — X402Adapter interface (createPaymentRequest, verifyReceipt). Demo: PaymentSheet mock flow with receipt + tx hash placeholders. Uses user-main contract money flow (x402 payTo) when live.

## Altana (session security)
- Needs: session contract interface, testnet/mainnet config. Status: UNKNOWN — IAltanaAdapter (createSession, revokeSession, getSession) with mock implementing spend caps/expiry/revocation client-side.

## PancakeSwap (AlphaDesk)
- Needs: router + position manager addresses/ABIs (mainnet vs testnet). Status: UNKNOWN — IPancakeAdapter with mock quotes/sim/rebalance. AlphaDesk agents restrict targets to allowlisted PancakeSwap contracts, slippage caps, simulation-before-execute.

## AltLayer (observability)
- Needs: 8004scan Pro integration method, AltLLM API access. Status: UNKNOWN — placeholder ObservabilityPanel (agent logs, health, LLM usage) marked preview/placeholder.

## Rules
- Never fake an integration. Adapter + explicit UNKNOWN marker in code and UNKNOWN_ITEMS.md.
- Mock implementations are deterministic and labeled DEMO so proofs are honest.

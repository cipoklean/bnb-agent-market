# Binance x402 (B402) — Technical Dossier for BNB Agent Market Core

Research date: 2026-08-11. Every claim is backed by a page fetched during this research; `[FACT]` = exact value + source URL, `[PARTIAL]` = documented but thin/incomplete, `NOT PUBLISHED` = not found in any fetched source.

---

## 0. TL;DR verdict

- Binance's product is **B402** ("OnchainPay x402" / "Agentic Payments") — Binance's implementation of the open x402 protocol on **BNB Smart Chain**. [FACT] Source: https://developers.binance.com/en/docs/products/onchainpay-x402/introduction
- HTTP 402 response: status line `402 Payment Required`; Binance's docs name the header **`X-PAYMENT-REQUIREMENTS`** and show a raw-JSON body shaped `{x402Version: 2, accepts: [PaymentRequirements…]}`. The open standard (x402-foundation) instead uses a **`PAYMENT-REQUIRED`** header carrying **base64-encoded** JSON.
- Payment payload = x402 v2 `PaymentPayload` (`accepted` + `payload` + `resource`), verified/settled via Binance-hosted facilitator REST API (`POST /papi/v2/b402/verify`, `/settle`), not via an escrow contract.
- Signature scheme: **EIP-712 typed data**, signed off-chain by the **payer's wallet** (e.g. Binance Agentic Wallet). Two schemes: `eip3009` (token-native EIP-3009; U, USD1) and **Permit2** (`permitWitnessTransferFrom`; any ERC-20: USDT, USDC).
- Settlement: **no escrow, no custody** — B402 sponsors gas and executes a direct token transfer buyer→seller on BNB Smart Chain (EIP-3009 `transferWithAuthorization` on the token, or Permit2 `permitWitnessTransferFrom` through a B402 "Permit2 proxy" + canonical Uniswap Permit2).
- B402-specific on-chain addresses (facilitator EOA "signerAddress", Permit2 proxy "spenderAddress"): **NOT PUBLISHED** — returned only by the authenticated `/supported` endpoint. Docs show placeholder addresses.
- Status: **live on BSC Testnet; BSC Mainnet access on request**. [FACT] Source: introduction page above.

---

## 1. Product identity & status

- [FACT] Name: "B402 is Binance's implementation of the x402 payment protocol on BNB Smart Chain." — https://developers.binance.com/en/docs/products/onchainpay-x402/introduction
- [FACT] "Agentic Payments supports x402 payment flows on BNB Chain for AI agents, automated clients, API providers, paid HTTP resources, and application-to-application payment use cases. It enables sellers to request payment through an HTTP 402-style flow, buyers or agents to submit payment authorization, and the payment flow to be verified and settled using B402 / x402 infrastructure." — same URL
- [FACT] Recommended API: "The recommended `/papi/v2/b402/*` API conforms to the x402 v2 specification; a V1 API (`/papi/v1/b402/*`) is also available for legacy clients." — same URL
- [FACT] Status: "B402 is **live on BNB Smart Chain (BSC) Testnet** for external partner onboarding. Production (BSC Mainnet) access is granted on request — apply here to get your API credentials." — same URL
- [FACT] Networks: BSC Mainnet `eip155:56` (chainId 56, "Live (access on request)"), BSC Testnet `eip155:97` (chainId 97, "Live"). — https://developers.binance.com/legacy-docs/onchainpay-x402/basics/9.supported-payment-methods

### Supported tokens (BSC Mainnet) — [FACT], introduction + supported-payment-methods pages

| Token | Contract (BSC Mainnet) | Decimals | `eip3009` | `permit2-exact` | `permit2-upto` |
|---|---|---|---|---|---|
| U | `0xcE24439F2D9C6a2289F741120FE202248B666666` | 18 | ✅ | ✅ | ✅ |
| USD1 | `0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d` | 18 | ✅ | ✅ | ✅ |
| USDT | `0x55d398326f99059fF775485246999027B3197955` | 18 | — | ✅ | ✅ |
| USDC | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` | 18 | — | ✅ | ✅ |

Sources: https://developers.binance.com/en/docs/products/onchainpay-x402/introduction and https://developers.binance.com/legacy-docs/onchainpay-x402/basics/9.supported-payment-methods

- [FACT] Testnet tokens: Mock U `0x330949Aed7d00FCe0558C64ED6FeC9792616cC39` (6 dec, mint yourself); USDC `0xEC1C60D64a06896Df296438c12edD14E974FDE47` (6 dec); USDT `0x337610d27c682E347C9cD60BD4b3b107C9d34dDd` (18 dec). — supported-payment-methods page
- [FACT] Amount encoding: "`paymentRequirements.amount` values are atomic units… for an 18-decimal token, $0.01 = `10000000000000000` (1e16), not `10000`." — supported-payment-methods page

---

## 2. HTTP 402 Payment Required response (seller → buyer)

### 2.1 What Binance's docs say

- [FACT] Status line: `402 Payment Required`. Quick Start step 4 heading: "**Return HTTP 402 to Buyers**… respond with HTTP **402 Payment Required** and include payment requirements in the response. Use the data from `/supported` to populate the `X-PAYMENT-REQUIREMENTS` header with the accepted token, network, amount, and recipient address." — https://developers.binance.com/en/docs/products/onchainpay-x402/quick-start
  → **Header name VERBATIM: `X-PAYMENT-REQUIREMENTS`** (HTTP header names are case-insensitive; docs also write `paymentRequirements.extra` when describing the JSON content).
- [FACT] The 402 response must echo the facilitator addresses: "The 402 response's `paymentRequirements.extra` must carry `signerAddress` / `spenderAddress` (V2)… copied from the matching `kinds[]` entry in the cached `/supported` response. Buyers do not — and cannot — call `/supported` themselves; the 402 response is the only channel through which they learn the Permit2 spender contract they need to sign against." — https://developers.binance.com/en/docs/products/onchainpay-x402/basics/8.typical-integration-flow
- [FACT] The only verbatim 402 wire example in Binance's docs is a **response body**, from the /supported page ("Example — merchant 402 response body (permit2-upto)") — https://developers.binance.com/legacy-docs/onchainpay-x402/open-apis-v2/1.get-supported-configurations:

```
HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "x402Version": 2,
  "accepts": [
    {
      "scheme": "upto",
      "network": "eip155:56",
      "amount": "100000000",
      "asset": "0x55d398326f99059ff775485246999027b3197955",
      "payTo": "0x8B3a350e2f3E6B9cC6FB10Fd106bA08f08bec5D2",
      "maxTimeoutSeconds": 300,
      "extra": {
        "name": "Tether USD",
        "version": "1",
        "assetTransferMethod": "permit2-upto",
        "signerAddress": "0x1111111111111111111111111111111111111111",
        "spenderAddress": "0x3333333333333333333333333333333333333333"
      }
    }
  ]
}
```

(Note: `0x1111…/0x3333…` are doc placeholders, not real deployed addresses.)

- [PARTIAL] **Header encoding ambiguity**: Binance's docs name the `X-PAYMENT-REQUIREMENTS` header but never show its byte value (raw JSON vs base64). The open x402 standard (below) uses base64. Binance claims its V2 `PaymentPayload` is "CDP wire-shape compatible… match Coinbase's x402 spec field-for-field, so client libraries built for CDP work against B402 with one URL change" (introduction page) — implying the CDP client's header handling (base64 `PAYMENT-REQUIRED`) is the operational truth. Not explicitly documented for B402 itself.
- [PARTIAL] **Retry-header name (buyer→seller)**: Binance docs say only "attaching the signed payment payload in the request header" (typical-integration-flow step 5) without naming the header. NOT named in Binance docs. The open standard's header for this is `PAYMENT-SIGNATURE` (base64 PaymentPayload). If B402 accepts CDP-built clients unchanged, that is the header to implement.

### 2.2 Open x402 standard (x402-foundation, Linux Foundation) — [FACT], http transport spec

Source: https://raw.githubusercontent.com/x402-foundation/x402/main/specs/transports-v2/http.md

- "The server indicates payment is required using the HTTP 402 'Payment Required' status code. **Mechanism**: HTTP 402 status code with `PAYMENT-REQUIRED` header. **Data Format**: Base64-encoded `PaymentRequired` schema in header."
- Example verbatim:
```
HTTP/1.1 402 Payment Required
Content-Type: application/json
PAYMENT-REQUIRED: eyJ4NDAyVmVyc2lvbiI6MiwiZXJyb3IiOiJQQVlNRU5ULVNJR05BVFVSRSBoZWFkZXIgaXMgcmVxdWlyZWQi...
```
  (header decodes to the `PaymentRequired` JSON: `{x402Version, error, resource, accepts[], extensions}`)
- Client retry: "Clients send payment data using the `PAYMENT-SIGNATURE` HTTP header. **Mechanism**: `PAYMENT-SIGNATURE` header containing base64-encoded JSON. **Data Format**: Base64-encoded `PaymentPayload` schema."
- Settlement result: "Servers communicate payment settlement results using the `PAYMENT-RESPONSE` header… Base64-encoded `SettlementResponse` schema."

| Header | Direction | Description |
|---|---|---|
| `PAYMENT-REQUIRED` | Server → Client | Base64-encoded `PaymentRequired` object |
| `PAYMENT-SIGNATURE` | Client → Server | Base64-encoded `PaymentPayload` object |
| `PAYMENT-RESPONSE` | Server → Client | Base64-encoded `SettlementResponse` object |

- "Response bodies are a server implementation concern. All x402 protocol information is communicated through headers."

---

## 3. Payment payload / request schema (x402 v2, B402 endpoints)

The facilitator endpoints are `POST /papi/v2/b402/verify` and `POST /papi/v2/b402/settle`. Both take the same body: `{x402Version: 2, paymentPayload: {...}, paymentRequirements: {...}}` (+ `settleAmount` on settle, permit2-upto only). Source: https://developers.binance.com/en/docs/products/onchainpay-x402/open-apis-v2/2.verify-payment and .../3.settle-payment

### 3.1 Field reference (verify request) — [FACT], verify-payment page

| Field | Type | Mandatory | Remarks |
|---|---|---|---|
| x402Version | integer | Yes | Must be `2` else `invalid_x402_version` |
| paymentPayload | object | Yes | The signed payment payload |
| paymentPayload.x402Version | integer | Yes | Protocol version (matches top-level) |
| paymentPayload.resource | object | No | `ResourceInfo` `{url (req when present), description?, mimeType?}` (x402 v2 §5.1) |
| paymentPayload.accepted | object | Yes | The `PaymentRequirements` kind the client chose (echoed from `/supported`) |
| accepted.scheme | string | Yes | `"exact"` or `"upto"` else `invalid_scheme` |
| accepted.network | string | Yes | CAIP-2, e.g. `eip155:56` |
| accepted.amount | string | Yes | Amount in atomic units |
| accepted.asset | string | Yes | Token contract address |
| accepted.payTo | string | Yes | Merchant wallet address |
| accepted.maxTimeoutSeconds | integer | Yes | Max settlement timeout in seconds |
| accepted.extra | object | Yes (B402) | Optional per spec; **required in b402** — `extra.assetTransferMethod` drives handler dispatch |
| accepted.extra.name | string | Yes | Token EIP-712 domain **name** |
| accepted.extra.version | string | Yes | Token EIP-712 domain **version** |
| accepted.extra.assetTransferMethod | string | Yes | `"eip3009"`, `"permit2-exact"`, `"permit2-upto"` |
| accepted.extra.signerAddress | string | Yes | Facilitator EOA (from `/supported`) |
| accepted.extra.spenderAddress | string | Conditional | Permit2 proxy (from `/supported`); required for `permit2-*`, absent for `eip3009` |
| paymentPayload.payload | object | Yes | Signature + authorization |
| payload.signature | string | Yes | EIP-712 signature, `0x`-prefixed, 65 bytes (`r‖s‖v`) |
| payload.authorization | object | Conditional | **eip3009 only**: `{from, to, value, validAfter, validBefore, nonce}` |
| payload.permit2Authorization | object | Conditional | **permit2-* only**: `{permitted:{token,amount}, from, spender, nonce, deadline, witness:{to, validAfter, facilitator?}}` |
| paymentPayload.extensions | object | No | x402 v2 extensions (e.g. `extensions.bazaar`) |
| paymentRequirements | object | Yes | The merchant's expected requirements, same shape as `accepted` |

Conditionality: `eip3009` → `payload.authorization.*` required, `permit2Authorization` absent; `permit2-exact`/`permit2-upto` → `permit2Authorization.*` required, `authorization` absent; `permit2-upto` additionally requires `witness.facilitator` and it must equal `extra.signerAddress`.

### 3.2 Verbatim examples (B402 verify page)

Example — EIP-3009:
```json
{
  "x402Version": 2,
  "paymentPayload": {
    "x402Version": 2,
    "resource": {
      "url": "https://api.example.com/premium/data",
      "description": "Premium API access",
      "mimeType": "application/json"
    },
    "accepted": {
      "scheme": "exact",
      "network": "eip155:56",
      "amount": "1000000",
      "asset": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      "payTo": "0x8B3a350e2f3E6B9cC6FB10Fd106bA08f08bec5D2",
      "maxTimeoutSeconds": 300,
      "extra": {
        "name": "USD Coin",
        "version": "2",
        "assetTransferMethod": "eip3009",
        "signerAddress": "0x1111111111111111111111111111111111111111"
      }
    },
    "payload": {
      "signature": "0xf3746613c2d920b5fdabc0856f2aeb2d4f88ee6037b8cc5d04a71a4462f134801234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1b",
      "authorization": {
        "from": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        "to": "0x8B3a350e2f3E6B9cC6FB10Fd106bA08f08bec5D2",
        "value": "1000000",
        "validAfter": "0",
        "validBefore": "1710000600",
        "nonce": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
      }
    }
  },
  "paymentRequirements": {
    "scheme": "exact",
    "network": "eip155:56",
    "amount": "1000000",
    "asset": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    "payTo": "0x8B3a350e2f3E6B9cC6FB10Fd106bA08f08bec5D2",
    "maxTimeoutSeconds": 300,
    "extra": {
      "name": "USD Coin",
      "version": "2",
      "assetTransferMethod": "eip3009",
      "signerAddress": "0x1111111111111111111111111111111111111111"
    }
  }
}
```

Example — Permit2 Exact (any ERC-20):
```json
{
  "x402Version": 2,
  "paymentPayload": {
    "x402Version": 2,
    "resource": { "url": "https://api.example.com/premium/data", "description": "Premium API access", "mimeType": "application/json" },
    "accepted": {
      "scheme": "exact",
      "network": "eip155:56",
      "amount": "5000000",
      "asset": "0x55d398326f99059ff775485246999027b3197955",
      "payTo": "0x8B3a350e2f3E6B9cC6FB10Fd106bA08f08bec5D2",
      "maxTimeoutSeconds": 300,
      "extra": {
        "name": "Tether USD",
        "version": "1",
        "assetTransferMethod": "permit2-exact",
        "signerAddress": "0x1111111111111111111111111111111111111111",
        "spenderAddress": "0x2222222222222222222222222222222222222222"
      }
    },
    "payload": {
      "signature": "0xaabbccdd...65bytes...eeff",
      "permit2Authorization": {
        "permitted": { "token": "0x55d398326f99059ff775485246999027b3197955", "amount": "5000000" },
        "from": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        "spender": "0x2222222222222222222222222222222222222222",
        "nonce": "1",
        "deadline": "1710000600",
        "witness": { "to": "0x8B3a350e2f3E6B9cC6FB10Fd106bA08f08bec5D2", "validAfter": "0" }
      }
    }
  },
  "paymentRequirements": { "same shape as accepted, verbatim" }
}
```

Example — Permit2 Upto (pay-as-you-go): identical shape, `"scheme": "upto"`, `assetTransferMethod: "permit2-upto"`, and the witness additionally binds `"facilitator": "0x1111111111111111111111111111111111111111"` (must equal `extra.signerAddress`). The buyer authorises a cap (`amount: "100000000"` = 100 USDT); the actual charge is set at settle time via `settleAmount` (e.g. `"3000000"` = 3 USDT).

### 3.3 Responses

- `/verify` → `{isValid: bool, payer: address, invalidReason?: string}` inside Binance envelope `{code: "000000", message: "success", data: {...}}`. Invalid payments still return HTTP 200; check `data.isValid`. — verify page
- `/settle` → `{success: bool, transaction: string ("" if not broadcast), payer, network, amount? (success only), errorReason?}`. Always HTTP 200. Settlement is **asynchronous**: `success:false` + non-empty `transaction` = Pending → poll `/settle` (idempotent, keyed on `(nonce, network, payer)`) until `success:true` or deadline; only `transaction:""` is terminal failure. Wait ≥ `maxTimeoutSeconds`, backend reconciles up to ~30 min. — settle page

- [FACT] Rate limits: `/verify` 100 req/s/merchant, `/settle` 20 req/s/merchant; excess → HTTP 429. — https://developers.binance.com/legacy-docs/onchainpay-x402/integration-guideline

### 3.4 B402 extensions / deviations from the open x402 v2 spec — [FACT], verify page "Deviations from x402 v2 spec"

| B402 deviation | Open spec baseline |
|---|---|
| `POST /supported` (empty JSON `{}`, RSA-signed by Binance API gateway) | spec uses `GET /supported` |
| `"upto"` scheme | spec defines only `"exact"` |
| `assetTransferMethod: permit2-exact / permit2-upto` | spec describes only EIP-3009 for exact |
| `settleAmount` field on `/settle` | not in spec (spec re-submits mutated `amount` at settle) |
| `extra.signerAddress` / `extra.spenderAddress` (replaces V1 `extra.facilitatorAddress`) | spec treats `extra` as "scheme-specific additional information" |

"Apart from these, all wire shapes, field names, error codes, and semantics follow the x402 v2 spec."

---

## 4. Signature scheme

### 4.1 General — [FACT]

- Buyers sign **EIP-712 typed data off-chain**; "Buyers do not run wallets or hold gas — they sign off-chain and B402 executes the on-chain transfer." — introduction page
- The **payer (buyer) wallet** signs; the facilitator never signs on the buyer's behalf. `extra.signerAddress` is the facilitator EOA that submits/sponsors the on-chain tx, NOT the signer of the payment. [PARTIAL] — signer identity is implied by `signerAddress = "Facilitator EOA that signs on-chain transactions"` (supported page) vs `payload.authorization.from` / `permit2Authorization.from` = "Payer wallet address… signer of the Permit2 signature" (verify page). Two distinct wallets: payer signs the EIP-712 authorization; facilitator EOA executes it on-chain.

### 4.2 `eip3009` — [FACT], x402 spec v2 §6.1.1 + B402 verify page

- Primary type: **`TransferWithAuthorization`** (EIP-3009), types:
```javascript
{
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" }
  ]
}
```
- EIP-712 domain: the **token contract's** domain — `extra.name` / `extra.version` come from `/supported` per token (`"U"`/`"1"`, `"USD1"`/`"1"`, `"USD Coin"`/`"2"`, `"Tether USD"`/`"1"`), verifyingContract = token contract, chainId 56/97. Source: supported page (kinds[].extra.name/version).
- Signer: payer wallet (`authorization.from`); recovered by `/verify` as `payer`.
- No prior approval needed — tokens implement `transferWithAuthorization` natively.

### 4.3 `permit2-exact` / `permit2-upto` — [FACT], B402 Permit2 signing guide

Source: https://developers.binance.com/en/docs/products/onchainpay-x402/open-apis-v2/4.permit2-signing

- Domain (three fields, **no `version` field** — adding one breaks the signature):
```json
{
  "name": "Permit2",
  "chainId": 56,
  "verifyingContract": "0x000000000022D473030F116dDEE9F6B43aC78BA3"
}
```
  "Use `chainId` `56` for BSC mainnet or `97` for BSC testnet. The `verifyingContract` is constant across all chains."
- Types (field order load-bearing; witness struct name must be exactly `Witness`):
```json
{
  "PermitWitnessTransferFrom": [
    { "name": "permitted", "type": "TokenPermissions" },
    { "name": "spender", "type": "address" },
    { "name": "nonce", "type": "uint256" },
    { "name": "deadline", "type": "uint256" },
    { "name": "witness", "type": "Witness" }
  ],
  "TokenPermissions": [
    { "name": "token", "type": "address" },
    { "name": "amount", "type": "uint256" }
  ],
  "Witness": [
    { "name": "to", "type": "address" },
    { "name": "validAfter", "type": "uint256" }
  ]
}
```
- `primaryType`: `PermitWitnessTransferFrom`
- Message field sources: `permitted.token` ← `paymentRequirements.asset`; `permitted.amount` ← `paymentRequirements.amount` (exact 1:1) or authorised cap (upto); `spender` ← **`extra.spenderAddress` (Permit2 proxy contract — NOT the facilitator EOA)**; `nonce` ← fresh 256-bit random (Permit2 bitmap); `deadline` ← `now + 3600` unix s; `witness.to` ← `paymentRequirements.payTo` (merchant, enforced on-chain by the proxy); `witness.validAfter` ← `now − 60` (back-dated; `"0"` also valid); `permit2-upto` adds `witness.facilitator` ← `extra.signerAddress`.
- Signer: payer wallet (`permit2Authorization.from`).
- Prerequisite: one-time `token.approve(0x000000000022D473030F116dDEE9F6B43aC78BA3, 2^256-1)` per (wallet, token). If missing, `/settle` reverts on-chain with `TRANSFER_FROM_FAILED` (verify does NOT catch this).
- On-chain call executed by B402: "B402's facilitator calls `Permit2.permitWitnessTransferFrom(...)` on-chain with gas sponsored."
- Wire: numeric fields (`nonce`, `deadline`, `validAfter`, `amount`) are signed as `uint256` but travel as **decimal strings** in JSON.

### 4.4 Where signing happens — Binance Agentic Wallet

- [FACT] "Binance Agentic Wallet now closes that gap: supporting the x402 payment protocol… Now live in Phase 1 across BNB Chain, Base, and Solana, the x402 payment skill lets your agent pay on your behalf while your keys stay yours." — https://www.binance.com/ar-BH/blog/ecosystem/969044993833612571
- [FACT] "With the x402 payment skill installed… The skill manages the entire flow, from 402 parsing and user confirmation to signing, replay, and result handling." — same blog
- [FACT] Networks: "BNB Chain – via the B402 facilitator; Base – via third-party facilitators; Solana – via third-party facilitators." — same blog
→ So the payer signature is produced by the buyer's wallet; on Binance's side that wallet is the **Agentic Wallet** (non-custodial), but B402 supports any EOA wallet holding the token — nothing in B402's docs requires Agentic Wallet. [PARTIAL] — B402 docs never mention Agentic Wallet; that integration lives in the Agentic Wallet product surface (Wallet Skills).

---

## 5. Settlement flow on BNB Chain

### 5.1 Mechanism — [FACT], settle page + introduction

- **No escrow contract, no custody**: "All token transfers occur strictly peer-to-peer on the public blockchain from the buyer's wallet directly to the merchant's wallet. The Facilitator contract validates signatures and forwards the transfer on-chain but never holds tokens in custody." — https://developers.binance.com/en/docs/products/onchainpay-x402/open-apis-v2/3.settle-payment
- Roles table (introduction): "**Facilitator (B402)** — Verifies signatures off-chain (`/verify`), then sponsors gas and executes the on-chain token transfer (`/settle`). All token transfers occur strictly peer-to-peer on the public blockchain from the buyer's wallet directly to the merchant's wallet."
- [FACT] B402 docs disclaimer: "B402 does not take possession, custody, or control of user funds or payment tokens as part of the standard flow… digital assets move directly on-chain between addresses designated by the user and the merchant or service provider." — introduction page
- eip3009 settlement: "EIP-3009 transfers are submitted directly against the token contract without a proxy" — i.e. `transferWithAuthorization(from, to, value, validAfter, validBefore, nonce, signature)` executed by the gas-sponsoring facilitator EOA. — supported page
- permit2 settlement: `Permit2.permitWitnessTransferFrom(...)` called on the **canonical Uniswap Permit2** `0x000000000022D473030F116dDEE9F6B43aC78BA3` through B402's **Permit2 proxy contract** (`extra.spenderAddress`); "The FacBilitator contract validates signatures and forwards the transfer on-chain." — permit2-signing + settle pages. The proxy enforces `witness.to == payTo` and (upto) `witness.facilitator == signerAddress`.

### 5.2 "Paymaster?" Yes — B402 acts as the gas sponsor/paymaster

- [FACT] "Gas-sponsored — sellers don't need BNB to operate. B402 pays the gas for every settle." — introduction page ("Key features")
- [FACT] "settled on-chain in seconds, with gas sponsored by B402" — introduction page
- [FACT] "Gas is sponsored; the merchant does not need to hold BNB for gas fees." — settle page

### 5.3 End-to-end flow — [FACT], typical-integration-flow (sequence: Client ↔ Merchant ↔ B402 ↔ BNB Smart Chain)

1. Client requests paid resource.
2. Merchant queries `POST /supported` (cached).
3. Merchant returns HTTP 402 + payment requirements (must include `extra.signerAddress`/`spenderAddress`).
4. Client signs EIP-712 authorization off-chain (no gas).
5. Client retries with signed payment payload in request header.
6. Merchant calls `POST /papi/v2/b402/verify` (off-chain signature/balance/param check).
7. If valid, merchant calls `POST /papi/v2/b402/settle` — possibly **Pending** (`success:false` + tx hash) → merchant polls (idempotent).
8. B402 submits the tx (gas sponsored) to BNB Smart Chain → token moves buyer→seller.
9. On `success:true`, merchant delivers the resource.

### 5.4 Deployed contracts — published vs NOT PUBLISHED

| Contract | BSC Mainnet address | Status |
|---|---|---|
| U (Circle) | `0xcE24439F2D9C6a2289F741120FE202248B666666` | PUBLISHED |
| USD1 | `0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d` | PUBLISHED |
| USDT | `0x55d398326f99059fF775485246999027B3197955` | PUBLISHED |
| USDC | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` | PUBLISHED |
| Uniswap Permit2 (canonical, all EVM chains) | `0x000000000022D473030F116dDEE9F6B43aC78BA3` | PUBLISHED (github.com/Uniswap/permit2) |
| **B402 facilitator EOA** (`extra.signerAddress`) | doc placeholder `0x1111…1111` | **NOT PUBLISHED** — returned by authenticated `/supported` |
| **B402 Permit2 proxy** (`extra.spenderAddress`) | doc placeholder `0x2222…`/`0x3333…` | **NOT PUBLISHED** — returned by authenticated `/supported`; "spenderAddress changes if b402 redeploys the proxy contract. Always read it fresh from `/supported` rather than hard-coding." |

- [FACT] "Do **not** hardcode these addresses — they may change when B402 upgrades Permit2 proxies, and `/supported` is the single source of truth." — supported page

### 5.5 B402 `/supported` response — [FACT], supported page

```
POST /papi/v2/b402/supported   (body: {} or omitted; RSA-signed headers)
```
Response `data`: `kinds[]` (each `{x402Version: 2, scheme: "exact"|"upto", network: "eip155:56", extra: {name, version, assetTransferMethod, signerAddress, spenderAddress?}}`), `extensions: []`, `signers: {"eip155:*": ["0x1111…1111"]}` (CAIP-2 wildcard namespace). `spenderAddress` is null/absent for `eip3009`. Docs show 10 kinds for the 4 tokens × methods. B402 auth headers (all B402 calls): `X-Tesla-ClientId`, `X-Tesla-SignAccessToken`, `X-Tesla-Timestamp`, `X-Tesla-Signature` (RSA-SHA256 over `body + timestamp`, PKCS#1 v1.5, base64). — basics/1.common-request-headers + quick-start

### 5.6 B402 Bazaar (optional discovery extension) — [FACT]

- Opt-in discovery catalog: attach `paymentPayload.extensions.bazaar = {info, schema, routeTemplate?, description?}` (CDP-compatible blob, [CDP bazaar spec](https://github.com/coinbase/x402/blob/main/specs/extensions/bazaar.md)) to a V2 `/settle`; indexed ~30–60 s after first confirmed settle. — https://developers.binance.com/legacy-docs/onchainpay-x402/b402-bazaar
- Public read-only discovery base URL: `https://www.binance.com/bapi/ramp/v1/public/ramp/b402` with `/bazaar/resources`, `/bazaar/search`, `/bazaar/merchant?payTo=...`. Responses wrapped in BAPI envelope `{code, message, messageDetail, data, success}`.

---

## 6. Open x402 standard vs Binance-specific wrapper

### 6.1 The open standard (x402 foundation / Linux Foundation)

- [FACT] "x402 is an open, neutral standard for internet-native payments…" — https://x402.org (LF Projects; members incl. Coinbase, Cloudflare, Stripe, Visa, Mastercard, Circle, Solana Foundation, Stellar, Google, AWS…). Repo: https://github.com/x402-foundation/x402
- Spec v2: https://raw.githubusercontent.com/x402-foundation/x402/main/specs/x402-specification-v2.md (v2.0, 2025-12-9). Core types: `PaymentRequired` `{x402Version, error?, resource, accepts[], extensions?}`; `PaymentRequirements` `{scheme, network (CAIP-2), amount (atomic), asset, payTo, maxTimeoutSeconds, extra?}`; `PaymentPayload` `{x402Version, resource?, accepted, payload, extensions?}`; `SettlementResponse` `{success, errorReason?, payer?, transaction, network, amount?, extensions?}`; `VerifyResponse` `{isValid, invalidReason?, payer?}`.
- Schemes: `exact` (EVM = EIP-3009 `TransferWithAuthorization`; SVM = SPL `TransferChecked`); spec also mentions `upto`/deferred semantics (§7.2).
- Facilitator API: `POST /verify`, `POST /settle` (same body shape), `GET /supported`; error codes like `invalid_exact_evm_payload_signature`, `insufficient_funds`, `invalid_transaction_state`.
- HTTP transport v2: `PAYMENT-REQUIRED` / `PAYMENT-SIGNATURE` / `PAYMENT-RESPONSE` headers, base64-encoded (transports-v2/http.md, quoted in §2.2).
- Note: no canonical settlement contract in the open spec — settlement is scheme-defined (EIP-3009 call on token / Permit2 / SPL transfer), executed by whoever runs the facilitator.

### 6.2 Binance B402 = wrapper around the standard, not a fork

- [FACT] Wire compatibility: "**CDP wire-shape compatible** — the V2 `PaymentPayload` and Bazaar metadata blob match Coinbase's x402 spec field-for-field, so client libraries built for CDP work against B402 with one URL change." — introduction page
- B402-specific deltas (from §3.4): RSA-signed `POST /supported`, `upto` scheme, Permit2 payment methods, `settleAmount`, `extra.signerAddress/spenderAddress`, Binance envelope `{code, message, data}` on all B402 API responses, endpoint base URLs handed out at onboarding (NOT published — "Please contact us for access").
- B402 API auth is Binance Open API gateway (`X-Tesla-*` RSA signing) — this is purely transport; the payment payload wire shape is open-standard.

### 6.3 Coinbase CDP facilitator (reference implementation)

- [FACT] "The CDP Facilitator has processed more than 100 million transactions and $28 million in payment volume across Base and Solana." — https://docs.cdp.coinbase.com/x402/seller/facilitator
- [FACT] "The CDP Facilitator supports all ERC-20 tokens on its EVM networks through EIP-3009 or Permit2, and SPL tokens on Solana. Schemes: `exact`, `upto`, `batch-settlement`." Networks: Base `eip155:8453`, Base Sepolia `84532`, Polygon `137`, Arbitrum `42161`, World `480`, World Sepolia `4801`, Solana mainnet/devnet. — same page
- [FACT] CDP Facilitator pricing: free tier 1,000 onchain transactions/month, then $0.001 each; verification always free. — same page
- Flow identical to B402: request → 402 + price → sign → retry with proof → facilitator verify → work → settle → resource. — https://docs.cdp.coinbase.com/x402/how-it-works
- x402 protocol-level docs live at https://docs.x402.org (HTTP 402 concept, schemes, extensions e.g. EIP-2612 gas sponsorship).

### 6.4 Practical implication for BNB Agent Market Core

- The open x402 v2 `PaymentRequired`/`PaymentPayload` JSON shapes are the interchange format; implement against the open spec (identical for both CDP and B402).
- Only B402 specifics needed: base URL is hand-issued (apply via Google Form), RSA `X-Tesla-*` signature for `/supported` `/verify` `/settle`, `extra` fields (name/version/assetTransferMethod/signerAddress/spenderAddress) must be forwarded verbatim in your 402 response, settle is async (poll), Permit2 = canonical `0x0000…78BA3` contract with `spender` = B402 proxy read from `/supported`.
- For hackathon demo on testnet: BSC Testnet (eip155:97) is live for onboarding; use Mock U (eip3009 — easiest, no approval) or USDT/USDC (Permit2).

---

## 7. Sources

1. https://developers.binance.com/en/docs/products/onchainpay-x402/introduction — product, assets, roles, status
2. https://developers.binance.com/en/docs/products/onchainpay-x402/quick-start — X-PAYMENT-REQUIREMENTS header, auth snippet
3. https://developers.binance.com/en/docs/products/onchainpay-x402/basics/1.common-request-headers — X-Tesla-* headers
4. https://developers.binance.com/en/docs/products/onchainpay-x402/basics/4.base-urls — env/base URLs (onboarding-gated)
5. https://developers.binance.com/en/docs/products/onchainpay-x402/basics/8.typical-integration-flow — sequence diagram + steps
6. https://developers.binance.com/en/docs/products/onchainpay-x402/open-apis-v2/1.get-supported-configurations — /supported schema/kinds, 402 body example, forwarding-addresses rule
7. https://developers.binance.com/en/docs/products/onchainpay-x402/open-apis-v2/2.verify-payment — full schema, examples, error codes, deviations
8. https://developers.binance.com/en/docs/products/onchainpay-x402/open-apis-v2/3.settle-payment — settle schema, async/polling, idempotency
9. https://developers.binance.com/en/docs/products/onchainpay-x402/open-apis-v2/4.permit2-signing — Permit2 EIP-712 domain/types, viem + ethers reference
10. https://developers.binance.com/legacy-docs/onchainpay-x402/basics/9.supported-payment-methods — tokens, decimals, Permit2 address
11. https://developers.binance.com/legacy-docs/onchainpay-x402/basics/7.payment-status — status fields
12. https://developers.binance.com/legacy-docs/onchainpay-x402/b402-bazaar — Bazaar extension + discovery URLs
13. https://developers.binance.com/legacy-docs/onchainpay-x402/integration-guideline — rate limits, security
14. https://developers.binance.com/legacy-docs/onchainpay-x402/change-log — history of wire changes
15. https://raw.githubusercontent.com/x402-foundation/x402/main/specs/x402-specification-v2.md — open spec v2
16. https://raw.githubusercontent.com/x402-foundation/x402/main/specs/transports-v2/http.md — header wire format
17. https://x402.org — foundation/standard status
18. https://docs.cdp.coinbase.com/x402/how-it-works and https://docs.cdp.coinbase.com/x402/seller/facilitator — CDP reference
19. https://www.binance.com/ar-BH/blog/ecosystem/969044993833612571 — Agentic Wallet x402 (Phase 1)

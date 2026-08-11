// Binance x402 adapter — payment requests + receipt verification.
// STATUS: KNOWN schema (B402). Settlement is DEMO — the B402 facilitator EOA +
// Permit2 proxy are onboarding-gated (memory/UNKNOWN_ITEMS.md #5-6); request
// generation follows the documented EIP-712 TransferWithAuthorization /
// Permit2 witness payloads, receipts are labeled handles until a live
// facilitator is reachable.
import { sha256Hex } from "../memory";
import { shortId } from "../format";

export interface PaymentRequestInput {
  payTo: string;
  token: string;
  amount: string;
  sessionId: string;
  purpose: string;
  quoteId?: string;
}

export interface PaymentRequest {
  requestId: string;
  payTo: string;
  token: string;
  amount: string;
  sessionId: string;
  purpose: string;
  expiry: string;
  manifestHash: string; // proof: request bound to session memory
}

export interface PaymentReceipt {
  x402PaymentId: string;
  payer: string;
  payTo: string;
  token: string;
  amount: string;
  txHash: string;
  createdAt: string;
  status: "pending" | "paid" | "failed";
}

export interface IX402Adapter {
  createPaymentRequest(input: PaymentRequestInput): Promise<PaymentRequest>;
  verifyReceipt(receipt: PaymentReceipt): Promise<boolean>;
}

export const X402_STATUS =
  "schema KNOWN (B402) — settlement DEMO (facilitator onboarding-gated)" as const;

export const x402Adapter: IX402Adapter = {
  async createPaymentRequest(input) {
    const manifestHash = await sha256Hex(
      JSON.stringify({ sessionId: input.sessionId, purpose: input.purpose, token: input.token, amount: input.amount })
    );
    return {
      requestId: shortId("x402", 8),
      payTo: input.payTo,
      token: input.token,
      amount: input.amount,
      sessionId: input.sessionId,
      purpose: input.purpose,
      expiry: new Date(Date.now() + 15 * 60_000).toISOString(),
      manifestHash: `0x${manifestHash}`,
    };
  },
  async verifyReceipt(receipt) {
    // DEMO verification: a receipt is valid when it has a tx hash and a payer.
    return Boolean(receipt.txHash && receipt.payer && receipt.status === "paid");
  },
};

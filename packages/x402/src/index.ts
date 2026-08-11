/**
 * Binance x402 payment adapter.
 *
 * STATUS: DEMO — the Binance x402 payment schema and receipt verification are UNKNOWN
 * (see memory/UNKNOWN_ITEMS.md). createPaymentRequest returns a deterministic request
 * whose manifestHash is computed with node:crypto sha256 over the canonical payload
 * (same canonicalization as packages/memory). verifyReceipt is a structural check
 * (txHash + payer present) — it is NOT cryptographic verification against the BNB chain.
 *
 * Replace with a real x402 client + on-chain receipt replay once the official
 * schema/verification are available. Never treat DEMO receipts as paid.
 */

import { createHash } from 'node:crypto';

/** Honest status flag — surfaced in logs/UI. */
export const X402_STATUS = 'DEMO — Binance x402 payment schema / receipt verification UNKNOWN';

/** Input to create a payment request. */
export interface PaymentRequestInput {
  payTo: string; // recipient address
  token: string; // e.g. 'BNB' or token address
  amount: string; // decimal string
  sessionId: string;
  purpose: string;
}

/** A payment request presented to the payer. */
export interface PaymentRequest {
  requestId: string;
  payTo: string;
  token: string;
  amount: string;
  sessionId: string;
  purpose: string;
  expiry: string; // ISO timestamp
  manifestHash: string; // 0x + sha256 of the canonical payload
}

/** A claimed payment receipt. */
export interface PaymentReceipt {
  requestId: string;
  txHash: string;
  payer: string;
  payTo: string;
  token: string;
  amount: string;
}

/** The interface all marketplace code depends on. */
export interface IX402Adapter {
  createPaymentRequest(input: PaymentRequestInput): Promise<PaymentRequest>;
  verifyReceipt(receipt: PaymentReceipt): Promise<boolean>;
}

/** Canonical JSON: object keys sorted, no whitespace. Matches packages/memory. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

/** Deterministic in-memory implementation. NOT a real x402 client. */
export class DemoX402Adapter implements IX402Adapter {
  async createPaymentRequest(input: PaymentRequestInput): Promise<PaymentRequest> {
    const payload = { ...input, created_at: new Date().toISOString() };
    const manifestHash = `0x${createHash('sha256').update(canonicalJson(payload)).digest('hex')}`;
    const requestId = `x402-demo-${createHash('sha256')
      .update(`${input.sessionId}:${input.amount}:${input.purpose}`)
      .digest('hex')
      .slice(0, 16)}`;

    return {
      requestId,
      ...input,
      expiry: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
      manifestHash,
    };
  }

  async verifyReceipt(receipt: PaymentReceipt): Promise<boolean> {
    // DEMO structural check only. Real verification must replay the tx on BSC and
    // confirm the exact payTo/token/amount — UNKNOWN until the official schema lands.
    return Boolean(
      receipt &&
        typeof receipt.txHash === 'string' &&
        receipt.txHash.startsWith('0x') &&
        receipt.txHash.length >= 66 &&
        typeof receipt.payer === 'string' &&
        receipt.payer.startsWith('0x')
    );
  }
}

const demoX402Adapter: IX402Adapter = new DemoX402Adapter();
export default demoX402Adapter;

// PancakeSwap adapter — AlphaDesk agent actions (quotes, sim, rebalance).
// STATUS: DEMO. Contract ADDRESSES are KNOWN (verified verbatim from the
// official pancake-v3-contracts deployments list, Phase 1 dossier); the
// execution adapter (quote/simulate/swap) is DEMO pending a real client
// (memory/UNKNOWN_ITEMS.md #9).
import { shortId } from "../format";

/** Deterministic FNV-1a string hash — same input always maps to the same value. */
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Demo price impact — derived ONLY from amountIn so the same input yields the same output. */
function priceImpactFor(amountIn: string): number {
  const frac = (hashStr(String(amountIn)) % 1000) / 1000; // 0.000 – 0.999
  return Number((0.18 + frac * 0.25).toFixed(2)); // 0.18 – 0.43
}

export interface SwapQuote {
  route: string;
  amountIn: string;
  amountOut: string;
  priceImpactPct: number;
  slippageBps: number;
  feeTier: number;
}

export interface SimulationResult {
  ok: boolean;
  reason: string;
  estimatedGas: string;
  withinSlippageCap: boolean;
}

export interface IPancakeAdapter {
  getQuote(input: { tokenIn: string; tokenOut: string; amountIn: string; slippageBps: number }): Promise<SwapQuote>;
  simulateRebalance(positionId: string, targetRange: [number, number]): Promise<SimulationResult>;
  collectFees(positionId: string): Promise<{ ok: boolean; proof: string }>;
}

export const PANCAKE_STATUS =
  "addresses KNOWN — execution adapter DEMO" as const;

export const pancakeAdapter: IPancakeAdapter = {
  async getQuote({ tokenIn, tokenOut, amountIn, slippageBps }) {
    return {
      route: `${tokenIn} → ${tokenOut} (V3 ${slippageBps <= 50 ? "stable" : "volatile"} pool)`,
      amountIn,
      amountOut: (parseFloat(amountIn) * 34.2).toFixed(4), // demo rate
      priceImpactPct: priceImpactFor(amountIn),
      slippageBps,
      feeTier: slippageBps <= 50 ? 500 : 2500,
    };
  },
  async simulateRebalance(positionId, targetRange) {
    return {
      ok: true,
      reason: `Simulation passed: re-center to ${targetRange[0]}–${targetRange[1]} within slippage cap`,
      estimatedGas: "0.00042 BNB",
      withinSlippageCap: true,
    };
  },
  async collectFees(positionId) {
    return { ok: true, proof: `0x${shortId("collect", 56).replaceAll("-", "")}` };
  },
};

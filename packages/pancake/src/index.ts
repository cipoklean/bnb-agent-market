/**
 * PancakeSwap adapter.
 *
 * STATUS: DEMO — official PancakeSwap V3 router / position-manager addresses on BSC are
 * UNKNOWN and change across deployments (see memory/UNKNOWN_ITEMS.md). All quotes,
 * simulations, and fees below are deterministic DEMO values — never real market data.
 * Replace with a real router/position-manager client after verifying the official
 * addresses and ABIs against the PancakeSwap docs for the target network.
 */

/** Honest status flag — surfaced in logs/UI. */
export const PANCAKE_STATUS = 'DEMO — PancakeSwap contract addresses UNKNOWN';

/** Input to get a swap quote. */
export interface GetQuoteInput {
  tokenIn: string; // address or symbol
  tokenOut: string;
  amountIn: string; // decimal string (tokenIn decimals)
  slippageBps: number; // basis points, e.g. 50 = 0.5%
}

/** A swap quote. DEMO values unless backed by a real router. */
export interface QuoteResult {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string; // DEMO: deterministic, not a real quote
  priceImpactBps: number;
  slippageBps: number;
  route: string[]; // pool path
  quoteTimeMs: number;
}

/** Input to simulate a rebalance. */
export interface RebalanceInput {
  positionId: string;
  targetRange: { lowerTick: number; upperTick: number };
}

/** Rebalance simulation result. DEMO values. */
export interface RebalanceSimulation {
  positionId: string;
  targetRange: { lowerTick: number; upperTick: number };
  estimatedGasWei: string;
  estimatedFeeBps: number;
  currentRange: { lowerTick: number; upperTick: number };
  rebalanceRequired: boolean;
}

/** Uncollected fees for a position. DEMO values. */
export interface PositionFees {
  positionId: string;
  token0Fees: string;
  token1Fees: string;
  collected: boolean;
}

/** The interface all marketplace code depends on. */
export interface IPancakeAdapter {
  getQuote(input: GetQuoteInput): Promise<QuoteResult>;
  simulateRebalance(
    positionId: string,
    targetRange: { lowerTick: number; upperTick: number }
  ): Promise<RebalanceSimulation>;
  collectFees(positionId: string): Promise<PositionFees>;
}

/** Deterministic in-memory implementation. NOT a PancakeSwap client. */
export class DemoPancakeAdapter implements IPancakeAdapter {
  async getQuote(input: GetQuoteInput): Promise<QuoteResult> {
    // Clearly fake: amountOut = amountIn * 998 / 1000 (illustrative fee math only).
    const inAmount = BigInt(input.amountIn);
    const amountOut = (inAmount * 998n) / 1000n;

    return {
      tokenIn: input.tokenIn,
      tokenOut: input.tokenOut,
      amountIn: input.amountIn,
      amountOut: amountOut.toString(),
      priceImpactBps: 12,
      slippageBps: input.slippageBps,
      route: [input.tokenIn, '0xPancakeV3PoolDEMO', input.tokenOut], // PLACEHOLDER — UNKNOWN
      quoteTimeMs: Date.now(),
    };
  }

  async simulateRebalance(
    positionId: string,
    targetRange: { lowerTick: number; upperTick: number }
  ): Promise<RebalanceSimulation> {
    const currentRange = { lowerTick: -887_220, upperTick: 887_220 }; // full range — demo
    const rebalanceRequired =
      currentRange.lowerTick !== targetRange.lowerTick ||
      currentRange.upperTick !== targetRange.upperTick;

    return {
      positionId,
      targetRange,
      estimatedGasWei: '210000000000000', // demo
      estimatedFeeBps: 5,
      currentRange,
      rebalanceRequired,
    };
  }

  async collectFees(positionId: string): Promise<PositionFees> {
    return { positionId, token0Fees: '0.0042', token1Fees: '0.0000', collected: false };
  }
}

const demoPancakeAdapter: IPancakeAdapter = new DemoPancakeAdapter();
export default demoPancakeAdapter;

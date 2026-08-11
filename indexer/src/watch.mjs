/**
 * BNB Agent Market Core — indexer skeleton (viem event watcher).
 *
 * STATUS: PLACEHOLDER — official registry addresses (ERC-8004, x402 payments,
 * PancakeSwap) are UNKNOWN (see memory/UNKNOWN_ITEMS.md). This skeleton will NOT
 * start until the addresses are verified and provided via env vars. Do not point it
 * at guessed addresses.
 *
 * Requires viem as a devDependency — intentionally NOT installed yet:
 *     npm i -D viem
 */

import { createPublicClient, http, watchContractEvent } from 'viem';
import { bsc } from 'viem/chains';

/**
 * Watcher configuration. contracts.* stay `null` (= UNKNOWN placeholder) until the
 * official addresses are verified — startWatcher() throws while any is missing.
 */
export const config = {
  chain: 'bsc',
  rpc: process.env.RPC_URL ?? 'https://bsc-dataseed.binance.org',
  contracts: {
    // UNKNOWN — placeholder. Official ERC-8004 registry address/ABI not verified.
    erc8004Registry: process.env.ERC8004_REGISTRY ?? null,
    // UNKNOWN — placeholder. Binance x402 payment contract address not verified.
    x402Payments: process.env.X402_PAYMENTS ?? null,
    // UNKNOWN — placeholder. PancakeSwap router address on BSC not verified.
    pancakeRouter: process.env.PANCAKE_ROUTER ?? null,
  },
};

/** True only when an RPC and ALL three addresses are configured. */
export function isConfigured() {
  return Boolean(
    config.rpc &&
      config.contracts.erc8004Registry &&
      config.contracts.x402Payments &&
      config.contracts.pancakeRouter
  );
}

/**
 * Start the event watchers. Refuses to run until official addresses are verified —
 * a guessed address would silently index the wrong contracts.
 *
 * @returns An unwatch function once implemented.
 */
export async function startWatcher() {
  if (!isConfigured()) {
    throw new Error(
      'UNKNOWN: registry addresses not verified — set env RPC_URL, ERC8004_REGISTRY, ' +
        'X402_PAYMENTS, PANCAKE_ROUTER (official addresses are UNKNOWN; see indexer/README.md)'
    );
  }

  const client = createPublicClient({ chain: bsc, transport: http(config.rpc) });
  const unwatchers = [];

  // EXAMPLE — enable per-address once verified. ABIs must come from the official
  // sources (currently UNKNOWN) — passing an empty ABI here is intentional.
  //
  // unwatchers.push(
  //   watchContractEvent(client, {
  //     address: config.contracts.erc8004Registry,
  //     abi: [], // <-- official ERC-8004 ABI UNKNOWN — fill after verification
  //     eventName: 'AgentRegistered',
  //     onLogs: (logs) => console.log('[erc8004]', logs.length, 'new log(s)'),
  //     onError: (err) => console.error('[erc8004] watch error', err),
  //   })
  // );
  //
  // unwatchers.push(
  //   watchContractEvent(client, {
  //     address: config.contracts.x402Payments,
  //     abi: [], // <-- official x402 ABI UNKNOWN — fill after verification
  //     eventName: 'PaymentReceived',
  //     onLogs: (logs) => console.log('[x402]', logs.length, 'new log(s)'),
  //     onError: (err) => console.error('[x402] watch error', err),
  //   })
  // );

  return () => {
    for (const unwatch of unwatchers) unwatch();
  };
}

// Allow: node indexer/src/watch.mjs  ->  prints status, then exits (nothing to watch yet).
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  if (isConfigured()) {
    console.log('indexer configured; startWatcher() ready.');
  } else {
    console.log('indexer NOT configured — official addresses UNKNOWN (placeholders).');
    console.log('Set RPC_URL, ERC8004_REGISTRY, X402_PAYMENTS, PANCAKE_ROUTER after verification.');
  }
}

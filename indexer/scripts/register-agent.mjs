#!/usr/bin/env node
/**
 * register-agent.mjs — Mainnet Bridge Phase 2: register an ERC-8004 agent
 * (IdentityRegistry) on BNB Chain (testnet 97 by default, mainnet 56 with
 * `--network mainnet`).
 *
 * Zero new deps: node:fs + node:path (built-ins), viem (declared devDep of
 * this package). Reads PRIVATE_KEY and RPC_URL from the repo-root .env.
 *
 * Usage:
 *   node indexer/scripts/register-agent.mjs                 # testnet 97 (safe default)
 *   node indexer/scripts/register-agent.mjs --network mainnet
 *   node indexer/scripts/register-agent.mjs --rpc https://... --name "My Agent v1"
 *
 * Safety:
 *   - Testnet is the default. Mainnet requires an explicit flag.
 *   - RPC chainId is verified against the selected network before anything
 *     is signed; a mismatched .env RPC falls back to the network's canonical
 *     RPC (with a loud warning) unless an explicit --rpc was given (hard fail).
 *   - Aborts when the wallet has zero balance (faucet/funding required).
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  formatEther,
  parseEventLogs,
  getAddress,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bsc, bscTestnet } from 'viem/chains';

// ---------------------------------------------------------------------------
// Minimal .env loader (no dotenv dep)
// ---------------------------------------------------------------------------
function loadEnv(envPath) {
  if (!existsSync(envPath)) return {};
  const out = {};
  for (const raw of readFileSync(envPath, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return out;
}

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const networkArg = arg('--network', 'testnet').toLowerCase();
const rpcOverride = arg('--rpc', null);
const agentName = arg('--name', 'Portfolio Reporter v1');

// ---------------------------------------------------------------------------
// Verified network table (docs/research/ERC8004_RESEARCH_DOSSIER.md 2026-08-11)
// ---------------------------------------------------------------------------
const NETWORKS = {
  testnet: {
    chain: bscTestnet, // chainId 97
    registryAddress: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    defaultRpc: 'https://data-seed-prebsc-2-s2.binance.org:8545',
    explorerTx: 'https://testnet.bscscan.com/tx/',
    scanSlug: 'bsc-testnet',
    faucet: 'https://www.bnbchain.org/en/testnet-faucet',
  },
  mainnet: {
    chain: bsc, // chainId 56
    registryAddress: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
    defaultRpc: 'https://bsc-dataseed.binance.org',
    explorerTx: 'https://bscscan.com/tx/',
    scanSlug: 'bsc',
    faucet: null,
  },
};

if (!NETWORKS[networkArg]) {
  console.error(`Unknown --network "${networkArg}" (expected: testnet | mainnet)`);
  process.exit(2);
}
const NET = NETWORKS[networkArg];

// ---------------------------------------------------------------------------
// ERC-8004 IdentityRegistry ABI (research dossier: register + Registered/Transfer)
// ---------------------------------------------------------------------------
const REGISTRY_ABI = parseAbi([
  'function register(string agentURI, (string metadataKey, bytes metadataValue)[] metadata) returns (uint256 agentId)',
  'function register(string agentURI) returns (uint256 agentId)',
  'event Registered(uint256 indexed agentId, string agentURI, address indexed owner)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
]);

// ---------------------------------------------------------------------------
// Registration file (EIP-8004 registration-v1) as a fully on-chain data: URI
// ---------------------------------------------------------------------------
function buildAgentUri(name) {
  const registration = {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name,
    description:
      'Portfolio Reporter: monitors a BNB Chain portfolio (positions, LP, treasury) and publishes plain-English reports through the Agent Market.',
    image: '',
    services: [
      {
        type: 'a2a',
        url: 'https://bnb-agent-market.example/.well-known/agent-card.json',
      },
    ],
    x402Support: true,
    active: true,
    registrations: [],
    supportedTrust: ['reputation'],
  };
  const b64 = Buffer.from(JSON.stringify(registration), 'utf8').toString('base64');
  return `data:application/json;base64,${b64}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(scriptDir, '..', '..');
  const env = loadEnv(path.join(repoRoot, '.env'));

  if (!env.PRIVATE_KEY) {
    console.error('Missing PRIVATE_KEY in .env (repo root). Nothing signed.');
    process.exit(2);
  }
  if (env.RPC_URL) console.log(`env RPC_URL set: ${env.RPC_URL}`);

  const account = privateKeyToAccount(env.PRIVATE_KEY);
  const walletAddress = getAddress(account.address);
  console.log(`Network      : ${NET.chain.name} (chainId ${NET.chain.id})`);
  console.log(`Registry     : ${NET.registryAddress}`);
  console.log(`Wallet       : ${walletAddress}`);
  console.log(`Agent name   : ${agentName}`);

  // --- RPC selection + chainId safety check --------------------------------
  let rpc = rpcOverride || env.RPC_URL || NET.defaultRpc;
  if (rpcOverride) console.log(`RPC (explicit): ${rpc}`);
  else if (env.RPC_URL) console.log(`RPC (from .env)  : ${rpc}`);
  else console.log(`RPC (canonical) : ${rpc}`);

  const probe = createPublicClient({ transport: http(rpc, { timeout: 15_000 }) });
  let rpcChainId = null;
  try {
    rpcChainId = Number(await probe.getChainId());
  } catch (e) {
    console.error(`RPC unreachable at ${rpc}: ${e.shortMessage || e.message}`);
    process.exit(1);
  }
  if (rpcChainId !== NET.chain.id) {
    if (rpcOverride) {
      console.error(
        `SAFETY ABORT: --rpc ${rpc} reports chainId ${rpcChainId}, but --network ${networkArg} requires ${NET.chain.id}.`
      );
      process.exit(1);
    }
    console.warn(
      `WARNING: .env RPC reports chainId ${rpcChainId} (≠ ${NET.chain.id}); falling back to canonical ${networkArg} RPC ${NET.defaultRpc}`
    );
    rpc = NET.defaultRpc;
  }
  // Re-probe the final RPC (post-fallback) before anything gets signed.
  const publicClient = createPublicClient({
    chain: NET.chain,
    transport: http(rpc, { timeout: 30_000 }),
  });
  try {
    rpcChainId = Number(await publicClient.getChainId());
  } catch (e) {
    console.error(`RPC unreachable after fallback at ${rpc}: ${e.shortMessage || e.message}`);
    process.exit(1);
  }
  if (rpcChainId !== NET.chain.id) {
    console.error(`SAFETY ABORT: RPC ${rpc} reports chainId ${rpcChainId}, expected ${NET.chain.id}.`);
    process.exit(1);
  }
  console.log(`Chain check  : OK (RPC serves chainId ${rpcChainId})`);

  // --- Balance gate ---------------------------------------------------------
  const balance = await publicClient.getBalance({ address: walletAddress });
  console.log(`Balance      : ${formatEther(balance)} BNB`);
  if (balance === 0n) {
    const faucetHint = NET.faucet ? ` Fund testnet BNB at ${NET.faucet}.` : ' Send BNB to the wallet first.';
    console.error(`ABORT: wallet has 0 BNB on chain ${NET.chain.id}.${faucetHint}`);
    process.exit(1);
  }
  if (NET.chain.id === 56 && balance < 1000000000000000n /* 0.001 BNB */) {
    console.error('ABORT: mainnet balance below 0.001 BNB — registration will not clear gas. Fund the wallet first.');
    process.exit(1);
  }

  // --- Build the transaction ------------------------------------------------
  const agentURI = buildAgentUri(agentName);
  const metadata = [['project', '0x' + Buffer.from('bnb-agent-market-core').toString('hex')]];
  const args = [agentURI, metadata];

  const gas = await publicClient.estimateContractGas({
    address: NET.registryAddress,
    abi: REGISTRY_ABI,
    functionName: 'register',
    args,
    account: walletAddress,
  });
  console.log(`Estimated gas: ${gas}`);
  console.log(`agentURI len : ${agentURI.length} chars (data: URI, fully on-chain)`);
  console.log('Sending register()…');

  const walletClient = createWalletClient({
    account,
    chain: NET.chain,
    transport: http(rpc, { timeout: 30_000 }),
  });
  const hash = await walletClient.writeContract({
    address: NET.registryAddress,
    abi: REGISTRY_ABI,
    functionName: 'register',
    args,
    gas,
  });
  console.log(`Tx hash      : ${hash}`);
  console.log(`Explorer     : ${NET.explorerTx}${hash}`);

  console.log(`Waiting for receipt on chain ${NET.chain.id}…`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
  console.log(`Receipt      : status=${receipt.status} block=${receipt.blockNumber} gasUsed=${receipt.gasUsed}`);

  if (receipt.status !== 'success') {
    console.error('ABORT: transaction reverted. See explorer link above.');
    process.exit(1);
  }

  // --- Extract agentId (ERC-721 tokenId) -----------------------------------
  const events = parseEventLogs({ abi: REGISTRY_ABI, logs: receipt.logs, eventName: ['Registered', 'Transfer'] });
  const registered = events.filter((e) => e.eventName === 'Registered');
  const mintTransfer = events.find(
    (e) => e.eventName === 'Transfer' && e.args.from === '0x0000000000000000000000000000000000000000'
  );
  const agentId = registered[0]?.args.agentId ?? mintTransfer?.args.tokenId;
  if (agentId === undefined) {
    console.error('Could not locate agentId in receipt logs. Logs:', JSON.stringify(receipt.logs, null, 2));
    process.exit(1);
  }

  const agentIdStr = agentId.toString();
  const owner = (registered[0]?.args.owner ?? mintTransfer?.args.to) || walletAddress;
  console.log('--- REGISTERED ---');
  console.log(`agentId      : ${agentIdStr}`);
  console.log(`owner        : ${owner}`);
  console.log(`transactionHash : ${hash}`);
  console.log(`explorerLink : ${NET.explorerTx}${hash}`);
  console.log(`8004scan UI  : https://8004scan.io/agents/${NET.scanSlug}/${agentIdStr}`);
  console.log(`8004scan API : https://8004scan.io/api/v1/public/agents/${NET.chain.id}/${agentIdStr}`);

  // Persist raw evidence (real on-chain data, not fabricated).
  const evidence = {
    network: networkArg,
    chainId: NET.chain.id,
    registryAddress: NET.registryAddress,
    agentId: agentIdStr,
    owner,
    transactionHash: hash,
    explorerLink: `${NET.explorerTx}${hash}`,
    scanApiUrl: `https://8004scan.io/api/v1/public/agents/${NET.chain.id}/${agentIdStr}`,
    scanUiUrl: `https://8004scan.io/agents/${NET.scanSlug}/${agentIdStr}`,
    agentUri: agentURI,
    agentName,
    x402Support: true,
    receipt: {
      status: receipt.status,
      blockNumber: receipt.blockNumber?.toString(),
      gasUsed: receipt.gasUsed?.toString(),
      transactionHash: receipt.transactionHash,
    },
    registeredAt: new Date().toISOString(),
  };
  const outDir = path.join(repoRoot, 'docs', 'submission', 'evidence');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, 'last-registration.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log(`Evidence     : ${path.join(outDir, 'last-registration.json')}`);
  console.log('Next: node indexer/scripts/verify-agent.mjs', NET.chain.id, agentIdStr);
}

main().catch((e) => {
  console.error('register-agent failed:', e.shortMessage || e.message);
  process.exit(1);
});

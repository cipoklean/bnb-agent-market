# Indexer (skeleton)

**Status: PLACEHOLDER — do not run against guessed addresses.**

The indexer watches BNB Smart Chain events and feeds the marketplace backend
(session spend, hire lifecycle, attestations, payment receipts). It is a
viem-based event watcher service.

## Status of official integrations

Per `memory/UNKNOWN_ITEMS.md`, the following are **UNKNOWN** until verified
on-chain / against official docs — the watcher refuses to start until they are
provided:

| Contract | Env var | Status |
| --- | --- | --- |
| ERC-8004 registry (BNB Agent Studio) | `ERC8004_REGISTRY` | `null` — UNKNOWN |
| x402 payments contract | `X402_PAYMENTS` | `null` — UNKNOWN |
| PancakeSwap router | `PANCAKE_ROUTER` | `null` — UNKNOWN |
| RPC endpoint | `RPC_URL` | defaults to BSC public RPC (demo only) |

## Architecture

```
indexer/src/watch.mjs
  └─ config { chain, rpc, contracts }        // contracts.* are null until verified
     └─ startWatcher()                       // throws UNKNOWN unless configured
        └─ createPublicClient(viem, bsc)     // + watchContractEvent per contract (commented out)
           └─ onLogs → upsert into store     // (backend DB — TBD)
```

Planned watchers (enable per-address once addresses are verified):

- **erc8004** — `AgentRegistered` / attestation events → agent directory.
- **x402** — payment-request / receipt events → payment reconciliation.
- **pancake** — swap / position events for LP-rebalance agent track records.
- **core** — the marketplace's own contracts (`HireAgreement`,
  `SessionRegistry`, `AttestationRegistry`) — ABIs are local, addresses come
  from the deploy script output.

## Run (once configured)

Dependencies are **NOT installed by default** — the indexer is a placeholder and
should never run against guessed addresses. When the official addresses are
verified and you are ready to configure it, install viem inside `indexer/`:

```bash
cd indexer && npm install     # installs viem as a devDependency (indexer/package.json)
node indexer/src/watch.mjs    # requires the env vars above to be set
```

The web app (`apps/web`) intentionally does not depend on viem — it stays
zero-blockchain-dependency; the watcher is the only viem consumer.

Set env vars, then start. Logs are written to stdout; structured events should
be persisted by the backend service (architecture TBD).

## Rules

- Never point the watcher at guessed/assumed addresses.
- Emit/store every event; the backend derives state from the log (not the
  other way around).
- All contracts emit events for everything (see `contracts/src/core/*`) so the
  indexer can reconstruct full history.

# Agent Registration — BNB Agent Market Core (Mainnet Bridge Phase 2)

Live ERC-8004 agents registered on BNB Chain. **Mainnet LIVE** (2026-08-11) +
testnet dry-run (2026-08-11). Both indexed by 8004scan in real time.

## Mainnet (live deployment)

| Field | Value |
| --- | --- |
| Agent Name | Portfolio Reporter v1 |
| Network | **BNB Smart Chain Mainnet** (chainId 56) |
| Registry (IdentityRegistry) | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| Transaction Hash | `0xd4715ce1105898e9c5a28529271f9d505bc295db98e190f4c58d636118650c71` |
| Agent ID (ERC-721 tokenId) | **263312** |
| Owner / agentWallet | `0x3C8176953eadBeE7b9bF8C6a5d1CF1153D924E11` |
| Block / gasUsed | 115236467 / 622,584 |
| Tx status | success (self-paid; env RPC bsc-dataseed, chainId check passed) |
| Registration URI | `data:application/json;base64,...` (EIP-8004 registration-v1, `x402Support: true`, fully on-chain) |
| 8004scan UI | https://8004scan.io/agents/bsc/263312 |
| BscScan | https://bscscan.com/tx/0xd4715ce1105898e9c5a28529271f9d505bc295db98e190f4c58d636118650c71 |

## Testnet dry-run (safe soak, same flow)

| Field | Value |
| --- | --- |
| Network | BNB Smart Chain Testnet (chainId 97) |
| Registry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| Agent ID | **1798** |
| Transaction Hash | `0xa1ae43b60b3405f155d80fec5d37b495f2c87cf8f1e8376925e01f657db8e1d0` |
| Block / gasUsed | 124378143 / 622,584 |
| 8004scan UI | https://8004scan.io/agents/bsc-testnet/1798 |
| Note | ChainId safety gate exercised: .env RPC (mainnet) fell back to canonical testnet RPC after verification |

## Mainnet 8004scan proof (verbatim)

API: `https://8004scan.io/api/v1/public/agents/56/263312`
Canonical agent_id: `56:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432:263312` —
`is_testnet: false`, `is_active: true`, `x402_supported: true`,
`created_tx_hash` matches the receipt, indexed within seconds of the mint.

```json
{
  "success": true,
  "data": {
    "id": "26cc3199-eda4-455e-81c3-a83892ec6bb8",
    "owner_id": "0f36162c-7fe4-4e2e-9972-f55b8423079e",
    "owner_address": "0x3c8176953eadbee7b9bf8c6a5d1cf1153d924e11",
    "owner_ens": null,
    "owner_username": null,
    "owner_avatar_url": null,
    "owner_publisher_tier": null,
    "owner_certified_name": null,
    "creator_address": "0x3c8176953eadbee7b9bf8c6a5d1cf1153d924e11",
    "agent_id": "56:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432:263312",
    "token_id": "263312",
    "chain_id": 56,
    "chain_type": "evm",
    "is_testnet": false,
    "contract_address": "0x8004a169fb4a3325136eb29fa0ceb6d2e539a432",
    "name": "Agent #263312",
    "description": null,
    "agent_type": null,
    "is_verified": false,
    "star_count": 0,
    "watch_count": 0,
    "supported_protocols": [],
    "agent_wallet": "0x3c8176953eadbee7b9bf8c6a5d1cf1153d924e11",
    "x402_supported": true,
    "image_url": null,
    "tags": [],
    "categories": [],
    "services": null,
    "scores": null,
    "total_score": 0,
    "cross_chain_links": [],
    "cross_chain_versions": null,
    "created_block_number": 115236467,
    "created_tx_hash": "0xd4715ce1105898e9c5a28529271f9d505bc295db98e190f4c58d636118650c71",
    "is_endpoint_verified": false,
    "endpoint_verified_at": null,
    "endpoint_verified_domain": null,
    "endpoint_verification_error": null,
    "endpoint_last_checked_at": null,
    "is_active": true,
    "supported_trust_models": [],
    "health_status": null,
    "health_score": null,
    "health_checked_at": null,
    "total_feedbacks": 0,
    "total_validations": 0,
    "successful_validations": 0,
    "average_score": 0,
    "rank": null,
    "network_rank": null,
    "parse_status": {
      "info": [
        {
          "code": "IA_DIRECT_CANONICAL_MINIMAL",
          "message": "Direct-chain sync stored on-chain fields before metadata parsing."
        }
      ],
      "errors": [],
      "status": "warning",
      "warnings": [],
      "last_parsed_at": "2026-08-11T02:56:08.297043+00:00"
    },
    "raw_metadata": {
      "onchain": [
        {
          "key": "agentWallet",
          "value": "0x3c8176953eadbee7b9bf8c6a5d1cf1153d924e11",
          "decoded": null
        },
        {
          "key": "project",
          "value": "0x626e622d6167656e742d6d61726b65742d636f7265",
          "decoded": null
        }
      ],
      "offchain_uri": "data:application/json;base64,eyJ0eX...Il19",
      "offchain_content": null
    },
    "field_sources": null,
    "ens": null,
    "did": null,
    "mcp_server": null,
    "mcp_version": null,
    "a2a_endpoint": null,
    "a2a_version": null,
    "agent_url": null,
    "quality_score": 0,
    "popularity_score": 0,
    "activity_score": 0,
    "wallet_score": 0,
    "freshness_score": 0,
    "metadata_completeness_score": 0,
    "created_at": "2026-08-11T02:56:01Z",
    "updated_at": "2026-08-11T02:56:08.499936Z"
  },
  "meta": {
    "version": "1.0.0",
    "timestamp": "2026-08-11T02:56:10.491Z",
    "requestId": "EYWAO08QwF_EuSaStexRe"
  }
}
```

## Honest notes

- Both agents are new ⇒ `total_score: 0`, `health_score: null`,
  `total_feedbacks: 0`. Score/health fields populate WITH real agent usage
  after launch — that is the "real usage metrics tracked post-launch"
  requirement of the mainnet bridge, and they are trackable on the public
  8004scan API per agent.
- Indexer `parse_status` is `warning` (`IA_DIRECT_CANONICAL_MINIMAL`:
  "Direct-chain sync stored on-chain fields before metadata parsing") and
  `offchain_content: null` — the indexer truncates its stored `offchain_uri`
  (`eyJ0eX...Il19`) and had not parsed the registration-file content at check
  time. On-chain fields (owner, agentWallet, `project` metadata key, tx hash,
  block) are all stored. Local evidence keeps the FULL 621-char URI for both
  agents (decodes to the Portfolio Reporter registration file,
  `x402Support: true`).
- Deterministic deployment style confirmed: upstream mainnet tokenIds sit in
  the same sequence (dossier sample 263297; ours 263312 — 15 mints later).

## Evidence files (docs/submission/evidence/)

- `agent-registration.md` — this document
- `8004scan-verification.json` — mainnet 56 / 263312 (verbatim API response)
- `last-registration.json` — mainnet mint evidence (receipt + URI, full)
- `8004scan-verification-testnet.json` — preserved testnet 97 / 1798 response
- `last-registration-testnet.json` — preserved testnet mint evidence

## Tooling (zero new deps)

- `indexer/scripts/register-agent.mjs` — registers via viem (indexer devDep,
  declared since Phase 0), `--network testnet|mainnet`, `--rpc` override,
  chainId safety gate, event-parses `Registered`/`Transfer` for the agentId,
  writes `docs/submission/evidence/last-registration.json`.
- `indexer/scripts/verify-agent.mjs` — fetches 8004scan
  `/api/v1/public/agents/{chainId}/{agentId}`, prints + saves the verbatim JSON.

## Follow-up tracking

Real usage metrics will accumulate on `total_score`, `health_score`,
`total_feedbacks` for both agents (tracked via the 8004scan API in Phase 3's
ObservabilityPanel). Reputation/validation registry reads stay OUT of app code
until ValidationRegistry is published (see memory/UNKNOWN_ITEMS.md).

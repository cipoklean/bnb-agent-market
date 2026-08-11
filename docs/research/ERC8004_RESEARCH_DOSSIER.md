# ERC-8004 on BNB Chain — Research Dossier (for BNB Agent Market Core hackathon)

Research date: 2026-08-11. Every claim below is [FACT] with the exact verbatim value and the source URL actually fetched, or [NOT FOUND]. Addresses are marked VERBATIM (copied from a fetched page) or NOT PUBLISHED. Live-verification calls (BSC RPC / 8004scan API) are labeled as such.

---

## 1. BNBAgent SDK — how to MINT / register an ERC-8004 agent identity

[FACT] The official SDK repo is `github.com/bnb-chain/bnbagent-sdk` — "Python toolkit for on-chain AI agents on BNB Chain". It ships a Python package `bnbagent` (PyPI) and a TypeScript package `@bnbagent/sdk` (npm), both first-class.
Source: https://github.com/bnb-chain/bnbagent-sdk (README)

[FACT] SDK capability description (verbatim): "**ERC-8004 (Agent Identity)** - Register your AI agent on-chain with a unique identity token, manage wallets, and make your agent discoverable. Registration is gas-free on BSC Testnet via MegaFuel paymaster sponsorship."
Source: https://raw.githubusercontent.com/bnb-chain/bnbagent-sdk/main/README.md

[NOT FOUND] There is NO `bnbagent agent register` CLI. Checked: `python/pyproject.toml` contains no `console_scripts`/`[project.scripts]` entry, and `typescript/package.json` has `"bin": null`. Registration is done through the SDK libraries only.
Looked at: https://api.github.com/repos/bnb-chain/bnbagent-sdk/contents/python and https://raw.githubusercontent.com/bnb-chain/bnbagent-sdk/main/typescript/package.json (name: "@bnbagent/sdk", version: "0.5.0", bin: None)

[FACT] The high-level SDK function that mints an identity (exact signature and docstring from source):
```python
def register_agent(
    self,
    agent_uri: str,
    metadata: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
```
Returns dict with keys: `success`, `transactionHash`, `agentId`, `receipt`, `agentURI`.
Source: https://raw.githubusercontent.com/bnb-chain/bnbagent-sdk/main/python/bnbagent/erc8004/agent.py (lines 278–301)

[FACT] The low-level contract wrapper calls the on-chain `register(...)` function defined by ERC-8004 (verbatim):
```python
function = self.contract.functions.register(agent_uri, metadata_bytes)
```
where `metadata_bytes` is built with ABI field names `metadataKey` / `metadataValue` — i.e. the on-chain call is `register(string agentURI, MetadataEntry[] calldata metadata)`.
Source: https://raw.githubusercontent.com/bnb-chain/bnbagent-sdk/main/python/bnbagent/erc8004/contract.py (lines 170–180)

[FACT] Minimal working registration flow — verbatim quick start from SDK docs:
```python
from bnbagent import ERC8004Agent, AgentEndpoint, EVMWalletProvider

wallet = EVMWalletProvider(password=os.getenv("WALLET_PASSWORD"), private_key=os.getenv("PRIVATE_KEY"))
sdk = ERC8004Agent(network="bsc-testnet", wallet_provider=wallet)

agent_uri = sdk.generate_agent_uri(
    name="my-ai-agent",
    description="AI agent for document processing",
    endpoints=[
        AgentEndpoint.a2a("https://my-agent.example.com"),
        AgentEndpoint.mcp("https://my-agent.example.com/mcp", version="2025-06-18"),
    ],
)

result = sdk.register_agent(agent_uri=agent_uri)
print(f"Agent registered! ID: {result['agentId']}, TX: {result['transactionHash']}")
```
Sources: https://raw.githubusercontent.com/bnb-chain/bnbagent-sdk/main/python/README.md and https://raw.githubusercontent.com/bnb-chain/bnbagent-sdk/main/python/bnbagent/erc8004/README.md

[FACT] Related SDK methods (from erc8004 README API table): `generate_agent_uri(...)`, `register_agent(agent_uri, metadata=None)`, `get_agent_info(agent_id)`, `get_all_agents(limit, offset)` — "Paginated listing via 8004scan API", `get_metadata`, `set_metadata`, `set_agent_uri`, `parse_agent_uri`.
Source: https://raw.githubusercontent.com/bnb-chain/bnbagent-sdk/main/python/bnbagent/erc8004/README.md

[FACT] SDK's `get_all_agents` queries the 8004scan indexer API (not RPC): `SCAN_API_URL = "https://www.8004scan.io/api/v1"`, called as `f"{SCAN_API_URL}/agents"`.
Sources: https://raw.githubusercontent.com/bnb-chain/bnbagent-sdk/main/python/bnbagent/constants.py and .../erc8004/agent.py (lines 498–513)

[FACT] Networks: `bsc-testnet` chain_id 97 RPC `https://data-seed-prebsc-2-s2.binance.org:8545`, paymaster `https://bsc-megafuel-testnet.nodereal.io` (use_paymaster=True); `bsc-mainnet` chain_id 56 RPC `https://bsc-dataseed.binance.org`, paymaster `https://bsc-megafuel.nodereal.io/` (use_paymaster=True).
Source: https://raw.githubusercontent.com/bnb-chain/bnbagent-sdk/main/python/bnbagent/config.py

---

## 2. The ERC-8004 standard itself

[FACT] ERC-8004 is titled **"ERC-8004: Trustless Agents"** — "Discover agents and establish trust through reputation and validation". Status: **Draft**, Standards Track: ERC. Created 2025-08-13. Authors: Marco De Rossi (@MarcoMetaMask), Davide Crapis (@dcrapis), Jordan Ellis, Erik Reppel. Requires: EIP-155, EIP-712, EIP-721, EIP-1271. Discussion: https://ethereum-magicians.org/t/erc-8004-trustless-agents/25098
Source: https://eips.ethereum.org/EIPS/eip-8004

[FACT] The standard defines **three registries** (deployable "on any L2 or on Mainnet as per-chain singletons"): **Identity Registry** — "A minimal on-chain handle based on ERC-721 with URIStorage extension that resolves to an agent's registration file"; **Reputation Registry** — "A standard interface for posting and fetching feedback signals"; **Validation Registry** — "Generic hooks for requesting and recording independent validators checks".
Source: https://eips.ethereum.org/EIPS/eip-8004 (Abstract / Motivation)

[FACT] Identity Registry is an **ERC-721 token**: each agent is globally identified by `agentRegistry` = `{namespace}:{chainId}:{identityRegistry}` (e.g. `eip155:1:0x742...`) plus `agentId` = "The ERC-721 tokenId assigned incrementally by the registry". `tokenURI` in ERC-721 is referred to as `agentURI`.
Source: https://eips.ethereum.org/EIPS/eip-8004 (Specification — Identity Registry)

[FACT] Minting functions (verbatim from spec):
```
struct MetadataEntry {
string metadataKey;
bytes metadataValue;
}

function register(string agentURI, MetadataEntry[] calldata metadata) external returns (uint256 agentId)
function register(string agentURI) external returns (uint256 agentId)
function register() external returns (uint256 agentId)
```
Emits `event Registered(uint256 indexed agentId, string agentURI, address indexed owner)`.
Source: https://eips.ethereum.org/EIPS/eip-8004 (Specification — Registration)

[FACT] Other interface functions defined by the spec: `getMetadata(uint256 agentId, string memory metadataKey) external view returns (bytes memory)`, `setMetadata(...)`, `setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes calldata signature)`, `getAgentWallet(uint256 agentId) external view returns (address)`, `unsetAgentWallet(uint256 agentId)`, `setAgentURI(uint256 agentId, string calldata newURI)` (+ `event URIUpdated`). Reserved metadata key: `agentWallet`.
Source: https://eips.ethereum.org/EIPS/eip-8004 (Specification — On-chain metadata)

[FACT] Reputation Registry interface (verbatim): `function getIdentityRegistry() external view returns (address identityRegistry)`.
Source: https://eips.ethereum.org/EIPS/eip-8004 (search-result excerpt) and https://raw.githubusercontent.com/erc-8004/erc-8004-contracts/main/README.md

[FACT] Validation Registry functions (verbatim): `function validationRequest(address validatorAddress, uint256 agentId, string requestURI, bytes32 requestHash) external`; read functions `getValidationStatus`, `getSummary`, `getAgentValidations`, `getValidatorRequests`.
Source: https://eips.ethereum.org/EIPS/eip-8004 and https://raw.githubusercontent.com/erc-8004/erc-8004-contracts/main/README.md

[FACT] The agentURI MUST resolve to the agent registration file; supported schemes include `ipfs://`, `https://`, and base64 `data:application/json;base64,...` for fully on-chain metadata. Registration file `type` = `https://eips.ethereum.org/EIPS/eip-8004#registration-v1` and contains name/description/image/services (A2A, MCP, OASF, ENS, DID, email)/x402Support/active/registrations/supportedTrust.
Source: https://eips.ethereum.org/EIPS/eip-8004 (Agent URI and Agent Registration File)

[FACT] Chain deployed on: the EIP itself does not fix a chain ("deployed on any L2 or on Mainnet as per-chain singletons") — but deployments are published by the reference implementation (see section 3). BNB Chain hosts the largest share: "about 200,000 ERC-8004 agents, roughly 60% of all agents across 26 chains" (BNB Chain blog citing 8004scan, 16 July 2026).
Source: https://www.bnbchain.org/en/blog/bnb-chain-ai-agent-landscape-agents-tools-and-payments

[FACT] BSC-specific adaptation: **BEP-620 "Trustless Agents on BNB Chain: Identity, Reputation & Validation Registries"** (Standards BEP, draft posted Dec 5, 2025) mirrors ERC-8004 on BSC (and optionally opBNB). It is a draft "to collect feedback" — it contains NO contract addresses.
Source: https://forum.bnbchain.org/t/bep-620-trustless-agents-on-bnb-chain-identity-reputation-validation-registries/5232

---

## 3. BNB Chain contract addresses (all VERBATIM)

Authoritative source: official reference-implementation repo `github.com/erc-8004/erc-8004-contracts` (README "Contract Addresses").
Source: https://raw.githubusercontent.com/erc-8004/erc-8004-contracts/main/README.md

### BSC Mainnet (chainId 56)
[FACT] **IdentityRegistry** = `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` (VERBATIM; bscscan link in source)
- Cross-confirmed by: bnbagent-sdk `python/bnbagent/config.py` (`registry_contract="0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"`) — https://raw.githubusercontent.com/bnb-chain/bnbagent-sdk/main/python/bnbagent/config.py
- Cross-confirmed by: SDK erc8004 README ("BSC Mainnet | Active | 56 | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`") — https://raw.githubusercontent.com/bnb-chain/bnbagent-sdk/main/python/bnbagent/erc8004/README.md
- Cross-confirmed by: 8004scan agent UI page ("REGISTRY 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432") — https://8004scan.io/agents/bsc/263297
- LIVE RPC VERIFIED (2026-08-11): `eth_getCode` at this address on `https://bsc-dataseed.binance.org` returns non-empty contract code (EIP-1967 proxy pattern, begins `0x60806040527f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc...`); `name()` (selector 0x06fdde03) returns `"AgentIdentity"`.

[FACT] **ReputationRegistry** = `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` (VERBATIM; bscscan link in source)
Source: https://raw.githubusercontent.com/erc-8004/erc-8004-contracts/main/README.md (BSC Mainnet section)

[NOT FOUND] **ValidationRegistry address is NOT PUBLISHED anywhere I fetched.** The erc-8004-contracts README explicitly warns: "The **Validation Registry** portion of the ERC-8004 spec is **still under active update and discussion with the TEE community**. This section will be revised and expanded in a follow-up spec update **later this year**." A source file `ValidationRegistryUpgradeable.sol` exists in the repo, but no deployed address appears for ANY chain in the README (full-text grep of README for an address next to "ValidationRegistry": zero hits). 8004scan `/stats` corroborates: `total_validators: 0`, `total_validations: 0`.
Sources: https://raw.githubusercontent.com/erc-8004/erc-8004-contracts/main/README.md ; live https://8004scan.io/api/v1/public/stats

### BSC Testnet (chainId 97)
[FACT] **IdentityRegistry** = `0x8004A818BFB912233c491871b3d84c89A494BD9e` (VERBATIM; testnet.bscscan link in source; also SDK config.py `registry_contract`)
[FACT] **ReputationRegistry** = `0x8004B663056A597Dffe9eCcC1965A193B7388713` (VERBATIM)
Source: https://raw.githubusercontent.com/erc-8004/erc-8004-contracts/main/README.md (BSC Testnet section)

[FACT] Note: the same two addresses are reused across many chains (Ethereum, Base, Arbitrum, Polygon, Scroll, Avalanche, Celo, Gnosis, etc.) — deterministic deployment (see `VANITY_DEPLOYMENT_GUIDE.md` in the repo). ERC-8183 commerce contracts (AgenticCommerce/EvaluatorRouter/OptimisticPolicy) on BSC mainnet are a separate set in the SDK: `python/bnbagent/networks/addresses.py` and `python/bnbagent/config.py` (not ERC-8004).

---

## 4. How to query an agent's track record / metadata URI

### a) 8004scan explorer UI (verified live)
[FACT] Agent detail page URL format: **`https://8004scan.io/agents/{chainSlug}/{tokenId}`**, e.g. **`https://8004scan.io/agents/bsc/263297`** (chain slug is `bsc`, NOT numeric chainId). Verified live: page loads with agent "Chaingaj8haw30iv", AGENT ID 263297, CHAIN "BNB Smart Chain", REGISTRY `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`, owner/agent-wallet `0x4682d4a2FE5dfc4024B00AaD5DCe52f338611610`, tabs Overview / Services / Statistics / Quality / Feedback / Metadata.
Source: https://8004scan.io/agents/bsc/263297 (fetched live). List page: https://8004scan.io/agents

### b) 8004scan REST API (verified live)
[FACT] Base URL: **`https://8004scan.io/api/v1/public`** (OpenAPI 3.0 server). Spec: **`https://8004scan.io/api/v1/public/docs/openapi.json`**. Auth: optional `X-API-Key` header.
- [FACT] `GET /agents/{chainId}/{tokenId}` — e.g. `https://8004scan.io/api/v1/public/agents/56/263297` — verified live; returns `agent_id` in canonical form `"56:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432:263297"` plus `owner_address`, `agent_wallet`, `name`, `description`, `contract_address`, `is_testnet`, `x402_supported`, `tags`, `categories`…
- [FACT] `GET /agents` — list/filter (verified live: `?chainId=56&limit=1` returned `total: 251962` agents on BSC, pagination meta).
- [FACT] `GET /agents/search?q=...` — semantic (hybrid vector + keyword) search.
- [FACT] `GET /accounts/{address}/agents` — agents owned by an address.
- [FACT] `GET /stats` — platform stats (verified live: `total_agents: 713211`, `total_users: 385162`, `total_validators: 0`, `total_feedbacks: 3503321`, `total_validations: 0`, `average_feedback_score: 80.9952606702889`, `daily_new_agents: 2799`, `supported_chains` incl. Ethereum Mainnet, LUKSO, …).
- [FACT] `GET /feedbacks` — agent feedbacks; `GET /chains` — supported networks.
Sources: https://8004scan.io/developers and https://8004scan.io/developers/docs and live API calls above.

### c) Public RPC (verified live)
[FACT] Direct RPC path: call the Identity Registry at `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` on any BSC mainnet RPC (SDK default `https://bsc-dataseed.binance.org`). The SDK itself reads on-chain state via: `tokenURI(agent_id)`, `ownerOf(agent_id)`, `getAgentWallet(agent_id)`, `getMetadata(agent_id, key)` — verbatim from `contract.py`:
```python
agent_wallet = self.contract.functions.getAgentWallet(agent_id).call()
owner = self.contract.functions.ownerOf(agent_id).call()
agent_uri = self.contract.functions.tokenURI(agent_id).call()
value_bytes = self.contract.functions.getMetadata(agent_id, key).call()
```
Source: https://raw.githubusercontent.com/bnb-chain/bnbagent-sdk/main/python/bnbagent/erc8004/contract.py (lines 241–275)

---

## 5. AltLayer 8004scan Pro — public REST API

[FACT] A public REST API EXISTS (no separate "Pro" product page found; tiers appear as API-key rate-limit tiers on the Builder Hub). Base: `https://8004scan.io/api/v1/public`; OpenAPI spec: `https://8004scan.io/api/v1/public/docs/openapi.json`; interactive explorer: `https://8004scan.io/developers/docs`.

[FACT] It exposes agent metrics/usage/log data: agents list, per-agent detail (by chainId+tokenId), semantic search, agents-per-account, platform stats, feedbacks, chains. Example raw calls verbatim from the docs: `curl https://8004scan.io/api/v1/public/agents`, `curl "https://8004scan.io/api/v1/public/agents/search?q=code+review"`, `curl https://8004scan.io/api/v1/public/agents/1/123`.
Source: https://8004scan.io/developers

[FACT] Rate-limit tiers (verbatim): Anonymous 10 req/min / 100 daily; Free API 30 / 1,000; Basic 100 / 10,000; **Pro 500 / 100,000**; Enterprise 2,000 / unlimited. Headers returned on every response: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`. Response envelope: `{"success": true, "data": {...}, "meta": {"version", "timestamp", "requestId"}}`.
Source: https://8004scan.io/developers and https://8004scan.io/developers/docs

[FACT] AltLayer's own docs cover 8004scan as a UI-only "web application that lets you explore AI agents built on the ERC-8004 protocol" — features listed are listings, live activity feeds, network stats, builder section; no API documentation there.
Source: https://docs.altlayer.io/altlayer-documentation/8004-scan/overview

[FACT] No `api.8004scan.altlayer.io` (or any AltLayer-hosted 8004scan API base) was found — the API is hosted at `8004scan.io/api/v1/public`.
Looked at: docs.altlayer.io 8004-scan section and web search for "8004scan API docs / api.8004scan".

---

## Quick-reference summary table

| Item | Value (VERBATIM) | Chain / ID |
|---|---|---|
| Identity Registry | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | BSC Mainnet 56 |
| Reputation Registry | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` | BSC Mainnet 56 |
| Validation Registry | NOT PUBLISHED (spec section in active revision) | — |
| Identity Registry (testnet) | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | BSC Testnet 97 |
| Reputation Registry (testnet) | `0x8004B663056A597Dffe9eCcC1965A193B7388713` | BSC Testnet 97 |
| Mint function (on-chain) | `register(string agentURI, MetadataEntry[] calldata metadata) returns (uint256 agentId)` | EIP-8004 |
| Mint function (SDK) | `ERC8004Agent.register_agent(agent_uri: str, metadata: list[dict[str,str]] | None = None) -> dict` | bnbagent |
| CLI | NONE (library only) | — |
| Explorer UI | `https://8004scan.io/agents/bsc/{tokenId}` | 8004scan |
| REST base | `https://8004scan.io/api/v1/public` (OpenAPI: `/docs/openapi.json`) | 8004scan |
| RPC (BSC) | `https://bsc-dataseed.binance.org` (chainId 56) | BNB Chain |

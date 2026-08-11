# @bnb-agent-market/erc8004

ERC-8004 agent-registry adapter.

**STATUS: DEMO** — the official ERC-8004 registry (BNB Agent Studio / AltLayer 8004scan)
address, ABI, and metadata schema are **UNKNOWN** (see `memory/UNKNOWN_ITEMS.md`).

What this package provides:

- `IErc8004Adapter` — the interface the marketplace code depends on.
- `DemoErc8004Adapter` — a deterministic in-memory implementation with 3 sample agents,
  so the rest of the system can be built and tested honestly.

Rules:

- Never pretend DEMO data is production data.
- Replace `DemoErc8004Adapter` with a registry-backed client only after the official
  ABI + address are verified on-chain.
- Keep the interface stable; the demo is swappable behind it.

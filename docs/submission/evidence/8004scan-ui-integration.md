# 8004scan UI Integration — Mainnet Bridge Phase 3

Live mainnet usage metrics for our registered agent (**Portfolio Reporter,
ERC-8004 tokenId 263312 on BSC chainId 56**) now render in the marketplace UI
from the real AltLayer 8004scan public API. Marked "Live Data via 8004scan
API" — this panel is NOT demo.

## What changed

| File | Change |
| --- | --- |
| `apps/web/src/lib/types.ts` | New `Erc8004ScanMetrics` type + optional `Agent.scanMetrics` |
| `apps/web/src/lib/adapters/erc8004.ts` | Adapter promoted DEMO → KNOWN (registry verified Phase 1/2). New `MAINNET_AGENT_LINK` (agentId `portfolio-reporter` ↔ chainId 56 / tokenId 263312) and `getLiveScanMetrics()`: real fetch, maps `total_score` / `average_score` / `health_score` / `total_feedbacks` / `x402_supported`, merges onto the agent, and NEVER throws — on any failure it `console.warn`s and returns null so the page keeps the deterministic mock data. `getAgentById` also merges metrics for consumers that go through the adapter. |
| `apps/web/src/app/api/8004scan/[chainId]/[tokenId]/route.ts` | NEW same-origin proxy. WHY: 8004scan.io rotates 4 A-record IPs and the first-resolved IP is blackholed from some networks; browsers time out (~13s) instead of rotating (observed live on this machine: direct browser fetch failed, `curl --resolve` to the other 3 IPs answered 200 in <1s). The route resolves ALL addresses server-side and probes each via `node:https` + SNI + forced IP with a 2.5s per-attempt cap (3 IPs + plain-fetch fallback ⇒ worst case < 10s, inside Vercel's function cap). Numeric-only path guard (400 otherwise). `force-dynamic` + `Cache-Control: no-store` = always live data. Same-origin in the browser ⇒ zero CORS dependency. |
| `apps/web/src/app/agents/[id]/page.tsx` | "Live Mainnet Metrics" panel (right column, rendered only when the agent is our mainnet agent AND metrics fetched OK): real `health_score` (n/a if null), `total_feedbacks`, `total_score`, `average_score`, green-check `x402 payments supported` (true per indexer), external "View on 8004scan" → `https://8004scan.io/agents/bsc/263312` (target _blank), honest badge **"Live Data via 8004scan API"**, source + fetched-at captions, and (while scores are 0) the honest line: "Fresh agent — scores populate as usage accrues." |
| `apps/web/src/app/api/evidence/route.ts` | Evidence packet `integrationStatus`: `erc8004` + `altlayer` now KNOWN (were stale DEMO/PLACEHOLDER — must not ship a false packet). |

## Live payload (browser-verified 2026-08-11)

Rendered panel values (identical to `GET /agents/56/263312`):

- `health_score` → **n/a** (indexer returns null — fresh agent)
- `total_feedbacks` → **0**
- `total_score` → **0**
- `average_score` → **0**
- `x402_supported` → **true** (green checkmark row)
- canonical id shown: `56:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432:263312`
- View on 8004scan → https://8004scan.io/agents/bsc/263312

Zero-scores are the REAL indexer state for a brand-new agent — the panel shows
them honestly instead of faking metrics, and they populate as usage accrues
(post-launch tracking requirement).

## Verification

- `npm run typecheck` — clean (0 errors)
- `npm run build` — 14/14 routes; `/marketplace` + `/settings` still ○ static
- Browser walk (localhost dev server, real Chrome):
  - `/agents/portfolio-reporter` → panel renders with the payload above,
    badge present, link href/target correct, zero console errors
  - `/agents/alpha-lp-rebalancer` → NO panel (mock data intact, page fine)
  - `/marketplace` → all 6 agents deterministic mock, unaffected
  - `/api/8004scan/56/263312` → 200 full envelope; `/api/8004scan/abc/263312` → 400
- Fallback proven live: before the proxy existed, the direct browser fetch
  failed (IP blackhole) → adapter logged
  `[erc8004] 8004scan live metrics unavailable … falling back to demo data`
  and the page rendered without errors. The same path still guards the proxy.

## Honest notes

- The demo label is removed ONLY from this panel (it shows real data). All
  other agent content remains labeled demo/mock — the marketplace stays
  deterministic everywhere except this one live panel.
- Scores/feedback are 0 today because the agent is fresh (minted ~1h before
  this integration); `health_score` is null per the indexer. These are live
  values, not placeholders.
- Proxy latency varies (0.95–6.3s observed during the walk — first IP probe
  often hits the dead address before rotating); always under the browser cap
  (7s) and Vercel's 10s function cap.
- Remaining UNKNOWNs (unchanged): ValidationRegistry not published; AltLLM API;
  x402/altana/pancake official clients (Phase 4). See memory/UNKNOWN_ITEMS.md.

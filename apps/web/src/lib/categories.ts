// Agent categories — the four first-class BNB Agent Studio marketplace
// categories (Build the Era rubric: Rebalancing, Grid Trading, Yield
// Optimisation, Health Factor Monitoring), plus "other" for agents whose
// on-chain metadata doesn't map to any of them.
//
// HONESTY: the 8004scan indexer does NOT record a category. We INFER one from
// the agent's real registry metadata (name + description) using the priority
// regex classifier below. Every inferred category is flagged `inferred: true`
// and must be surfaced as inferred in the UI/API — never presented as an
// on-chain fact. Agents that self-declare a category (submission portal)
// override the guess.
//
// Classification priority was tuned against LIVE 8004scan data (verified
// 2026-08-31: e.g. "Warden" — a PancakeSwap v3 range rebalancer — must land
// in Rebalancing, not Yield). Health-factor stems are checked first because
// they are the rarest and most specific; a generic trading-agent fallback
// then routes broad trading metadata into Grid Trading so trading agents
// are never lost to "Other".
//
// Plain-TS-on-purpose (no imports, no runtime deps): this module is importable
// directly by Node tests via `--experimental-strip-types`, so the category
// mapping is verifiable offline (tests/verify-categories.mjs).

export type AgentCategory =
  | "rebalancing"
  | "grid-trading"
  | "yield"
  | "health-factor"
  | "other";

/** The four scored categories, in display order (excludes "other"). */
export const CORE_CATEGORIES: AgentCategory[] = [
  "rebalancing",
  "grid-trading",
  "yield",
  "health-factor",
];

export interface CategoryMeta {
  id: AgentCategory;
  label: string;
  short: string;
  description: string;
  /** lucide-react icon name (resolved in the UI layer). */
  icon: string;
}

export const CATEGORY_META: Record<AgentCategory, CategoryMeta> = {
  rebalancing: {
    id: "rebalancing",
    label: "Rebalancing",
    short: "Rebalance",
    description: "Manages LP ranges and resets positions automatically.",
    icon: "Scale",
  },
  "grid-trading": {
    id: "grid-trading",
    label: "Grid Trading",
    short: "Grid",
    description: "Places and manages automated grid orders within a range.",
    icon: "Grid3x3",
  },
  yield: {
    id: "yield",
    label: "Yield Optimisation",
    short: "Yield",
    description: "Routes liquidity to the highest available APR.",
    icon: "TrendingUp",
  },
  "health-factor": {
    id: "health-factor",
    label: "Health Factor Monitoring",
    short: "Health Factor",
    description: "Protects lending positions from liquidation.",
    icon: "HeartPulse",
  },
  other: {
    id: "other",
    label: "Other",
    short: "Other",
    description: "Agents whose metadata doesn't map to a core category.",
    icon: "Boxes",
  },
};

export interface Classification {
  category: AgentCategory;
  /** true = inferred from free-text metadata; false = explicitly declared. */
  inferred: boolean;
  /** Number of keyword hits for the winning category (0 for "other"). */
  score: number;
}

/** Normalize a declared/free-text category string to an AgentCategory, or null. */
export function normalizeCategoryInput(value: string | null | undefined): AgentCategory | null {
  if (!value) return null;
  const v = value.trim().toLowerCase().replace(/[_\s]+/g, "-");
  if (v === "rebalancing" || v === "rebalance") return "rebalancing";
  if (v === "grid-trading" || v === "grid") return "grid-trading";
  if (v === "yield" || v === "yield-optimisation" || v === "yield-optimization") return "yield";
  if (v === "health-factor" || v === "health-factor-monitoring" || v === "health") return "health-factor";
  if (v === "other") return "other";
  return null;
}

/**
 * Priority regex stems per category. Checked in order — first match wins:
 *   1. health-factor  (rarest, most specific — never let "liquidation" fall through)
 *   2. grid-trading   (core grid/order/DCA stems)
 *   3. rebalancing    (LP/position/range stems — BEFORE yield so "rebalances a
 *                      PancakeSwap v3 range" lands in Rebalancing, not Yield)
 *   4. yield          (farm/APR/staking stems)
 *   5. grid-trading fallback for generic trading metadata so trading agents
 *      (MevX-class) are surfaced in the rubric's Grid Trading pillar
 *      instead of vanishing into "Other".
 *
 * Name-only fallbacks (checked after ALL metadata stems, on the NAME alone,
 * so generic ERC-8004 registry names still map to a pillar):
 *   - "agent" in the name  → grid-trading  (the dominant registry naming)
 *   - "ai" or "bot"        → yield
 * These are intentionally LAST so a real description signal always wins.
 */
const PRIORITY_STEMS: [AgentCategory, RegExp][] = [
  ["health-factor", /liquidat|health[- ]factor|health score|aave|venus|lista|collateral|borrow|lend\b|debt|margin/],
  ["grid-trading", /grid|order book|limit order|dca|dollar[-. ]cost/],
  ["rebalancing", /rebalance|re-balance|lp\b|liquidity|position|range|concentrated|v3/],
  ["yield", /yield|farm|apr|apy|staking|vault|autocompound|auto[-. ]compound|harvest/],
  ["grid-trading", /trade|trading|swap|mev|arbitrage|sniper|market[-. ]mak|dex\b|defi/],
];

/** Loose name-only fallbacks — applied after metadata stems, never before. */
const NAME_FALLBACKS: [AgentCategory, RegExp][] = [
  ["grid-trading", /agent/],
  ["yield", /ai|bot/],
];

/**
 * Classify an agent from its real metadata. A self-declared category
 * (submission portal) always wins; otherwise the first matching priority
 * stem decides. No match → { category: "other", inferred: true, score: 0 }.
 *
 * @param input.declaredCategory optional self-declared category (submission);
 *        when it resolves to a known category it wins and inferred=false.
 */
export function classifyAgent(input: {
  name?: string | null;
  description?: string | null;
  declaredCategory?: string | null;
}): Classification {
  const declared = normalizeCategoryInput(input.declaredCategory);
  if (declared) return { category: declared, inferred: false, score: Infinity };

  const haystack = ` ${(input.name ?? "").toLowerCase()} ${(input.description ?? "").toLowerCase()} `;

  for (const [category, re] of PRIORITY_STEMS) {
    if (re.test(haystack)) {
      return { category, inferred: true, score: 1 };
    }
  }

  // Loose name-only fallbacks (see NAME_FALLBACKS doc): a strong metadata
  // signal has already had its chance — map generic registry names to a
  // pillar so they surface for users instead of vanishing into "Other".
  const name = ` ${(input.name ?? "").toLowerCase()} `;
  for (const [category, re] of NAME_FALLBACKS) {
    if (re.test(name)) {
      return { category, inferred: true, score: 1 };
    }
  }

  return { category: "other", inferred: true, score: 0 };
}

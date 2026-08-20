// Agent categories — the four first-class BNB Agent Studio marketplace
// categories (Build the Era rubric: Rebalancing, Grid Trading, Yield
// Optimisation, Health Factor Monitoring), plus "other" for agents whose
// on-chain metadata doesn't map to any of them.
//
// HONESTY: the 8004scan indexer does NOT record a category. We INFER one from
// the agent's real registry metadata (name + description) using the keyword
// scorer below. Every inferred category is flagged `inferred: true` and must be
// surfaced as inferred in the UI/API — never presented as an on-chain fact.
// Agents that self-declare a category (submission portal) override the guess.
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
  /** Lowercase keyword/phrase signals matched against agent metadata. */
  keywords: string[];
}

export const CATEGORY_META: Record<AgentCategory, CategoryMeta> = {
  rebalancing: {
    id: "rebalancing",
    label: "Rebalancing",
    short: "Rebalance",
    description: "Manages LP ranges and resets positions automatically.",
    icon: "Scale",
    keywords: [
      "rebalance",
      "re-balance",
      "rebalancing",
      "lp range",
      "in range",
      "out of range",
      "reposition",
      "concentrated liquidity",
      "v3 position",
      "liquidity position",
      "range order",
      "tick range",
    ],
  },
  "grid-trading": {
    id: "grid-trading",
    label: "Grid Trading",
    short: "Grid",
    description: "Places and manages automated grid orders within a range.",
    icon: "Grid3x3",
    keywords: [
      "grid trading",
      "grid bot",
      "grid strategy",
      "grid order",
      "trading grid",
      "dca grid",
      " grid ",
    ],
  },
  yield: {
    id: "yield",
    label: "Yield Optimisation",
    short: "Yield",
    description: "Routes liquidity to the highest available APR.",
    icon: "TrendingUp",
    keywords: [
      "yield",
      "apr",
      "apy",
      "farm",
      "farming",
      "vault",
      "harvest",
      "auto-compound",
      "autocompound",
      "compounding",
      "optimizer",
      "optimiser",
      "staking reward",
      "best rate",
      "highest rate",
    ],
  },
  "health-factor": {
    id: "health-factor",
    label: "Health Factor Monitoring",
    short: "Health Factor",
    description: "Protects lending positions from liquidation.",
    icon: "HeartPulse",
    keywords: [
      "health factor",
      "liquidation",
      "liquidate",
      "collateral",
      "ltv",
      "loan-to-value",
      "borrow",
      "lending position",
      "debt",
      "loan position",
      "aave",
      "venus",
      "lista",
      "repay",
      "margin call",
    ],
  },
  other: {
    id: "other",
    label: "Other",
    short: "Other",
    description: "Agents whose metadata doesn't map to a core category.",
    icon: "Boxes",
    keywords: [],
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
 * Classify an agent from its real metadata. Counts keyword hits per category
 * over "name + description" and returns the highest-scoring category. Ties are
 * broken by CORE_CATEGORIES order (rebalancing > grid > yield > health-factor).
 * No hits → { category: "other", inferred: true, score: 0 }.
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

  let best: AgentCategory = "other";
  let bestScore = 0;
  for (const cat of CORE_CATEGORIES) {
    let score = 0;
    for (const kw of CATEGORY_META[cat].keywords) {
      // Count non-overlapping occurrences of each keyword signal.
      let idx = haystack.indexOf(kw);
      while (idx !== -1) {
        score++;
        idx = haystack.indexOf(kw, idx + kw.length);
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }

  return { category: best, inferred: true, score: bestScore };
}

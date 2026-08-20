// A2A discovery endpoint — machine-readable agent directory.
//
// GET /api/agents?category=<rebalancing|grid-trading|yield|health-factor|other>&limit=<1..100>
//
// Same live source as the human marketplace (lib/directory-cache: live → lastGood
// → snapshot → degraded), normalized to a stable JSON shape another agent can
// consume to discover and hire. CORS-open (GET only) so cross-origin agents can
// read it directly. Categories are INFERRED from on-chain metadata and flagged
// as such — never presented as an on-chain field.
import { NextResponse } from "next/server";
import { getDirectory } from "@/lib/directory-cache";
import { normalizeScanEntry, scanUrlFor, type LiveAgentView } from "@/lib/scan-normalize";
import {
  CATEGORY_META,
  CORE_CATEGORIES,
  normalizeCategoryInput,
  type AgentCategory,
} from "@/lib/categories";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=30",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/** Public JSON projection of a directory view. */
function toApiAgent(v: LiveAgentView, origin: string) {
  return {
    id: v.slug,
    agentId8004: v.canonicalId,
    chainId: v.chainId,
    tokenId: v.tokenId,
    name: v.name,
    description: v.description,
    owner: v.owner || null,
    category: v.category,
    categoryLabel: CATEGORY_META[v.category].label,
    categoryInferred: v.categoryInferred,
    x402Supported: v.x402Supported,
    verified: v.verified,
    metrics: {
      totalScore: v.totalScore,
      averageScore: v.averageScore,
      healthScore: v.healthScore,
      totalFeedbacks: v.totalFeedbacks,
    },
    links: {
      profile: `${origin}/agents/${v.slug}`,
      hire: `${origin}/hire?agent=${encodeURIComponent(v.slug)}`,
      scan: scanUrlFor(v),
    },
    source: v.source,
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;

  const categoryParam = url.searchParams.get("category");
  const category: AgentCategory | null = normalizeCategoryInput(categoryParam);
  if (categoryParam && !category) {
    return NextResponse.json(
      {
        success: false,
        error: `Unknown category '${categoryParam}'. Valid: ${[...CORE_CATEGORIES, "other"].join(", ")}`,
      },
      { status: 400, headers: CORS }
    );
  }

  const limRaw = Number(url.searchParams.get("limit") ?? "24");
  const limit = Number.isFinite(limRaw) ? Math.min(Math.max(1, Math.floor(limRaw)), 100) : 24;

  const dir = await getDirectory({ chainId: 56, limit });
  const all = dir.agents.map((raw) => normalizeScanEntry(raw, 56));

  // Real per-category distribution across everything fetched (before filtering).
  const distribution: Record<string, number> = {};
  for (const c of [...CORE_CATEGORIES, "other"]) distribution[c] = 0;
  for (const v of all) distribution[v.category] = (distribution[v.category] ?? 0) + 1;

  const filtered = category ? all.filter((v) => v.category === category) : all;

  return NextResponse.json(
    {
      success: true,
      // Honest provenance so a consuming agent knows how fresh the data is.
      source: dir.source, // live | lastGood | snapshot | degraded
      stale: dir.stale,
      degraded: dir.degraded,
      fetchedAt: dir.fetchedAt,
      chainId: 56,
      categoryFilter: category ?? null,
      categories: CORE_CATEGORIES.map((c) => ({
        id: c,
        label: CATEGORY_META[c].label,
        description: CATEGORY_META[c].description,
        count: distribution[c] ?? 0,
      })),
      totalIndexed: dir.total, // total agents indexed on BSC (indexer count)
      count: filtered.length,
      note: "Categories are inferred from agent name/description metadata, not an on-chain field.",
      agents: filtered.map((v) => toApiAgent(v, origin)),
    },
    { headers: CORS }
  );
}

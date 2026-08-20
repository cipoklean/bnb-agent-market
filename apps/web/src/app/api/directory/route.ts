// Paginated directory API — powers the marketplace "Load more" control and
// gives autonomous agents a page-aware browse endpoint over the full 8004scan
// index (264k+ agents on BSC), not just the cached top slice served by
// /api/agents.
//
//   GET /api/directory?page=<1..>&limit=<1..100>&chainId=56
//
// Returns already-normalized LiveAgentView rows plus honest pagination meta and
// a degraded flag (the upstream is anonymous-rate-limited to ~10 req/min, so
// callers should page on demand). CORS-open GET so cross-origin agents can read
// it directly.
import { NextResponse } from "next/server";
import { browseAgents } from "@/lib/scan-server";
import { normalizeScanEntry } from "@/lib/scan-normalize";

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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const pageRaw = Number(url.searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1;
  const limitRaw = Number(url.searchParams.get("limit") ?? "24");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(1, Math.floor(limitRaw)), 100)
    : 24;
  const chainIdRaw = Number(url.searchParams.get("chainId") ?? "56");
  const chainId = Number.isFinite(chainIdRaw) ? chainIdRaw : 56;

  const res = await browseAgents({ chainId, page, limit });
  const agents = res.agents.map((raw) => normalizeScanEntry(raw, chainId));

  return NextResponse.json(
    {
      success: !res.degraded,
      chainId,
      page: res.page,
      limit: res.limit,
      total: res.total,
      hasMore: res.hasMore,
      degraded: res.degraded,
      fetchedAt: res.fetchedAt,
      count: agents.length,
      agents,
    },
    { headers: CORS }
  );
}

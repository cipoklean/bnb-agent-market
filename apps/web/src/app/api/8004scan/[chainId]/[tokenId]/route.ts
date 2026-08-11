// 8004scan proxy — same-origin fetch of the AltLayer public REST API.
//
// WHY a proxy: 8004scan.io rotates 4 A-record IPs and the first-resolved one is
// blackholed from some networks/ISPs. Browsers give up after ~13s instead of
// rotating to a live IP. This route uses fetchScanAgent (lib/scan-server.ts)
// which probes ALL resolved addresses server-side with short per-attempt
// timeouts and returns the first working response. Same-origin in the browser
// means no CORS dependency either. Worst-case chain (3 IPs x 2.5s + fallback)
// stays under Vercel's 10s function cap (see memory/SESSION_STATE notes).
import { NextResponse } from "next/server";
import { fetchScanAgent } from "@/lib/scan-server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { chainId: string; tokenId: string } }
) {
  const { chainId, tokenId } = params;
  // Numeric-only guard: keep the upstream URL free of path injection.
  if (!/^\d+$/.test(chainId) || !/^\d+$/.test(tokenId)) {
    return NextResponse.json(
      { success: false, error: "chainId/tokenId must be numeric" },
      { status: 400 }
    );
  }

  let upstream: unknown;
  try {
    upstream = await fetchScanAgent(chainId, tokenId);
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: `8004scan unreachable: ${
          e instanceof Error ? e.message : String(e)
        }`,
      },
      { status: 502 }
    );
  }
  return NextResponse.json(upstream, {
    headers: { "Cache-Control": "no-store" },
  });
}

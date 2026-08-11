// Marketplace — LIVE directory: fetched server-side from the 8004scan indexer
// (60s server-side cache in lib/scan-server.ts), merged client-side with
// locally submitted agents. No mock data in the production path; a graceful
// degraded banner appears when the indexer is unreachable.
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import MarketClient from "@/components/MarketClient";
import SampleMarketplace from "@/components/SampleMarketplace";
import { sampleAgentsEnabled } from "@/lib/data";
import { normalizeScanEntry } from "@/lib/scan-normalize";
import { listAgents } from "@/lib/scan-server";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  // Dev-only sample registry (NEXT_PUBLIC_SAMPLE_DATA=1) — never production.
  if (sampleAgentsEnabled()) return <SampleMarketplace />;

  const dir = await listAgents({ chainId: 56, limit: 24 });
  const live = dir.agents.map((raw) => normalizeScanEntry(raw, 56));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/" className="link inline-flex items-center gap-1 text-[13px]">
          <ArrowLeft size={13} /> Home
        </Link>
        <h1 className="title-page mt-2">Marketplace</h1>
        <p className="body-sm mt-1">
          A live window onto the ERC-8004 agent directory on BNB Smart Chain —
          identity and scores straight from the 8004scan indexer.
        </p>
      </div>

      <MarketClient live={live} degraded={dir.degraded} total={dir.total} />
    </div>
  );
}

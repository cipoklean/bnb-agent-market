// Marketplace — LIVE directory: layered resilience via lib/directory-cache
// (live 5-min TTL → in-memory lastGood → bundled build-time snapshot →
// degraded). No mock data in the production path; honest captions for every
// source.
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import MarketClient from "@/components/MarketClient";
import SampleMarketplace from "@/components/SampleMarketplace";
import { sampleAgentsEnabled } from "@/lib/data";
import { getDirectory } from "@/lib/directory-cache";
import { normalizeScanEntry } from "@/lib/scan-normalize";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  // Dev-only sample registry (NEXT_PUBLIC_SAMPLE_DATA=1) — never production.
  if (sampleAgentsEnabled()) return <SampleMarketplace />;

  const dir = await getDirectory({ chainId: 56, limit: 24 });
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

      <MarketClient
        live={live}
        total={dir.total}
        degraded={dir.degraded}
        stale={dir.stale}
        source={dir.source}
        fetchedAt={dir.fetchedAt}
      />
    </div>
  );
}


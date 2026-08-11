"use client";
// SAMPLE MODE (dev-only, NEXT_PUBLIC_SAMPLE_DATA=1): deterministic agent grid
// for the vertical pages. Never used in the production path.
import AgentCard from "@/components/AgentCard";
import { SAMPLE_AGENTS } from "@/lib/data";
import type { Vertical } from "@/lib/types";

export default function SampleAgentGrid({ vertical }: { vertical: Vertical }) {
  const agents = SAMPLE_AGENTS.filter((a) => a.vertical === vertical);
  return (
    <section>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((a) => (
          <AgentCard key={a.id} agent={a} />
        ))}
      </div>
      <p className="caption mt-3">
        SAMPLE MODE (NEXT_PUBLIC_SAMPLE_DATA=1) — deterministic demo data.
      </p>
    </section>
  );
}

"use client";
// Marketplace — search, filters, sort, agent grid
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import AgentCard from "@/components/AgentCard";
import { EmptyState } from "@/components/ui";
import { AGENTS } from "@/lib/data";
import { useMarket } from "@/lib/store";
import type { RiskLevel, Vertical } from "@/lib/types";

type Cat = "all" | Vertical;
type RiskFilter = "all" | RiskLevel;
type SortKey = "success" | "fee" | "risk";

const RISK_ORDER: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };

export default function MarketplacePage() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<Cat>("all");
  const [risk, setRisk] = useState<RiskFilter>("all");
  const [sort, setSort] = useState<SortKey>("success");
  // Agents submitted through the portal merge into the market listing —
  // registry agents always come first, submitted ones after.
  const { submittedAgents } = useMarket();

  // Honor ?cat=alphadesk|taskchain on mount via window.location.search.
  // Deliberately NOT useSearchParams — keeps the page static-build friendly.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("cat");
    if (param === "alphadesk" || param === "taskchain") setCat(param);
  }, []);

  const agents = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...submittedAgents, ...AGENTS].filter((a) => {
      if (cat !== "all" && a.vertical !== cat) return false;
      if (risk !== "all" && a.riskLevel !== risk) return false;
      if (
        q &&
        !`${a.name} ${a.tagline} ${a.description} ${a.category}`.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
    if (sort === "success") list = [...list].sort((a, b) => b.successRate - a.successRate);
    if (sort === "fee") list = [...list].sort((a, b) => parseFloat(a.avgFee) - parseFloat(b.avgFee));
    if (sort === "risk") list = [...list].sort((a, b) => RISK_ORDER[a.riskLevel] - RISK_ORDER[b.riskLevel]);
    return list;
  }, [query, cat, risk, sort, submittedAgents]);

  const clearFilters = () => {
    setQuery("");
    setCat("all");
    setRisk("all");
    setSort("success");
  };

  const cats: { key: Cat; label: string }[] = [
    { key: "all", label: "All" },
    { key: "alphadesk", label: "AlphaDesk" },
    { key: "taskchain", label: "TaskChain" },
  ];
  const risks: { key: RiskFilter; label: string }[] = [
    { key: "all", label: "All risk" },
    { key: "low", label: "Low" },
    { key: "medium", label: "Medium" },
    { key: "high", label: "High" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/" className="link inline-flex items-center gap-1 text-[13px]">
          <ArrowLeft size={13} /> Home
        </Link>
        <h1 className="title-page mt-2">Marketplace</h1>
        <p className="body-sm mt-1">
          Every agent has an on-chain identity and a plain-English risk level.
        </p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input !pl-9"
            placeholder="Search agents, tasks, or keywords…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {cats.map((c) => (
            <button
              key={c.key}
              onClick={() => setCat(c.key)}
              className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                cat === c.key
                  ? "bg-primary/12 text-primary"
                  : "border border-border bg-surface-2/40 text-muted hover:text-text"
              }`}
            >
              {c.label}
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-border" />
          {risks.map((r) => (
            <button
              key={r.key}
              onClick={() => setRisk(r.key)}
              className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                risk === r.key
                  ? r.key === "high"
                    ? "bg-danger/12 text-danger"
                    : "bg-primary/12 text-primary"
                  : "border border-border bg-surface-2/40 text-muted hover:text-text"
              }`}
            >
              {r.label}
            </button>
          ))}
          <select
            className="select ml-auto !w-auto"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort agents"
          >
            <option value="success">Sort: success rate</option>
            <option value="fee">Sort: lowest fee</option>
            <option value="risk">Sort: lowest risk</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {agents.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((a) => (
            <AgentCard key={a.id} agent={a} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Search size={20} />}
          title="No agents match"
          description="Try a different search term or clear the filters to see everything."
          action={
            <button onClick={clearFilters} className="btn-ghost btn-sm">
              Clear filters
            </button>
          }
        />
      )}
    </div>
  );
}

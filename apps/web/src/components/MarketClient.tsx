"use client";
// MarketClient — the live directory UI. Server pages fetch getDirectory()
// (lib/directory-cache) and pass the views + source state; this client merges
// locally submitted agents from the store, then filters / searches / sorts.
// Honest captions per source: live dot / stale amber note / degraded banner.
import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, Clock, Plus, Search } from "lucide-react";
import ScanAgentCard from "@/components/ScanAgentCard";
import { EmptyState } from "@/components/ui";
import { useMarket } from "@/lib/store";
import { timeAgo } from "@/lib/format";
import { viewFromSubmission } from "@/lib/scan-normalize";
import { CATEGORY_META, CORE_CATEGORIES, type AgentCategory } from "@/lib/categories";
import type { DirectorySource } from "@/lib/directory-cache";
import type { LiveAgentView } from "@/lib/scan-normalize";

type Filter = "all" | "x402" | "verified";
type SortKey = "score" | "feedbacks" | "fresh";
type CatFilter = AgentCategory | "all";

export default function MarketClient({
  live,
  total,
  degraded,
  stale,
  source,
  fetchedAt,
  note,
  initialCategory,
}: {
  live: LiveAgentView[];
  total: number;
  degraded: boolean;
  stale: boolean;
  source: DirectorySource;
  fetchedAt?: string;
  note?: string;
  initialCategory?: CatFilter;
}) {
  const { submittedAgents } = useMarket();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<SortKey>("feedbacks");
  const [cat, setCat] = useState<CatFilter>(initialCategory ?? "all");

  const views = useMemo<LiveAgentView[]>(
    () => [...live, ...submittedAgents.map(viewFromSubmission)],
    [live, submittedAgents]
  );

  // Per-category counts across the whole directory (independent of the active
  // category selection) so the nav chips always show the real distribution.
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: views.length };
    for (const v of views) c[v.category] = (c[v.category] ?? 0) + 1;
    return c;
  }, [views]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = views.filter((v) => {
      if (cat !== "all" && v.category !== cat) return false;
      if (filter === "x402" && !v.x402Supported) return false;
      if (filter === "verified" && !v.verified && v.source !== "submission") return false;
      if (
        q &&
        !`${v.name} ${v.description} ${v.tokenId} ${v.canonicalId}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
    if (sort === "score") list = [...list].sort((a, b) => (b.totalScore ?? -1) - (a.totalScore ?? -1));
    if (sort === "feedbacks") list = [...list].sort((a, b) => b.totalFeedbacks - a.totalFeedbacks);
    if (sort === "fresh") list = [...list].sort((a, b) => a.totalFeedbacks - b.totalFeedbacks);
    return list;
  }, [views, query, filter, sort, cat]);

  // Category nav: All + the four core categories, plus Other only when present.
  const catChips: { key: CatFilter; label: string }[] = [
    { key: "all", label: "All" },
    ...CORE_CATEGORIES.map((c) => ({ key: c as CatFilter, label: CATEGORY_META[c].short })),
    ...(counts["other"] ? [{ key: "other" as CatFilter, label: CATEGORY_META.other.short }] : []),
  ];

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "x402", label: "x402-supported" },
    { key: "verified", label: "Verified" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        {degraded && (
          <div className="flex items-start gap-2.5 rounded-btn border border-amber/30 bg-amber/8 p-3 text-[13px] text-warning">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>
              Indexer unreachable — showing locally listed agents. Live scores
              return when 8004scan responds again.
            </span>
          </div>
        )}
        {!degraded && stale && (
          <div className="flex items-start gap-2.5 rounded-btn border border-amber/30 bg-amber/8 p-3 text-[13px] text-warning">
            <Clock size={15} className="mt-0.5 shrink-0" />
            <span>
              Showing cached directory — fetched {fetchedAt ? timeAgo(fetchedAt) : "recently"}.
              Live scores return when 8004scan responds.
            </span>
          </div>
        )}
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="body-sm">
            {!degraded && !stale && source === "live" && (
              <span className="mr-2 inline-flex items-center gap-1.5 text-[12px] text-muted">
                <span className="dot dot-green" /> live
              </span>
            )}
            <span className="tnum font-semibold text-text">{views.length}</span>{" "}
            listed in this directory ·{" "}
            <span className="tnum font-semibold text-text">
              {total.toLocaleString()}
            </span>{" "}
            agents indexed on BSC
            {note ? ` · ${note}` : ""}
          </p>
          <Link href="/submit" className="btn-ghost btn-sm">
            <Plus size={13} /> Submit an agent
          </Link>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input !pl-9"
            placeholder="Search by name, token id, or address…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Category navigation — the four first-class BNB Agent Studio categories. */}
        <div className="flex flex-wrap items-center gap-2">
          {catChips.map((c) => (
            <button
              key={c.key}
              onClick={() => setCat(c.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                cat === c.key
                  ? "bg-primary/15 text-primary"
                  : "border border-border bg-surface-2/40 text-muted hover:text-text"
              }`}
            >
              {c.label}
              <span className="tnum text-[11px] opacity-70">{counts[c.key] ?? 0}</span>
            </button>
          ))}
        </div>
        {cat !== "all" && (
          <p className="caption -mt-1">
            {CATEGORY_META[cat].description}{" "}
            <span className="text-muted/70">
              · category inferred from agent metadata, not an on-chain field.
            </span>
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                filter === f.key
                  ? "bg-primary/12 text-primary"
                  : "border border-border bg-surface-2/40 text-muted hover:text-text"
              }`}
            >
              {f.label}
            </button>
          ))}
          <select
            className="select ml-auto !w-auto"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort directory"
          >
            <option value="feedbacks">Sort: most feedback</option>
            <option value="score">Sort: highest score</option>
            <option value="fresh">Sort: newest / least feedback</option>
          </select>
        </div>
      </div>

      {shown.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((v) => (
            <ScanAgentCard key={v.slug} view={v} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Search size={20} />}
          title="No agents match"
          description="Try a different search term, or list your own agent in this directory."
          action={
            <Link href="/submit" className="btn-primary btn-sm">
              <Plus size={13} /> Submit an agent
            </Link>
          }
        />
      )}
    </div>
  );
}

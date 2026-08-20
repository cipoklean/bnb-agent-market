"use client";
// MarketClient — the live directory UI. Server pages fetch getDirectory()
// (lib/directory-cache) and pass the views + source state; this client merges
// locally submitted agents from the store, then filters / searches / sorts.
// Honest captions per source: live dot / stale amber note / degraded banner.
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Clock, Loader2, Plus, Search } from "lucide-react";
import ScanAgentCard from "@/components/ScanAgentCard";
import CompareBar from "@/components/CompareBar";
import { EmptyState } from "@/components/ui";
import { useMarket } from "@/lib/store";
import { timeAgo } from "@/lib/format";
import {
  normalizeScanEntry,
  parseCanonicalId,
  viewFromSubmission,
} from "@/lib/scan-normalize";
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

  // Extra pages loaded on demand via "Load more" (paginated /api/directory).
  const [extra, setExtra] = useState<LiveAgentView[]>([]);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pagedOut, setPagedOut] = useState(false);

  // Live find-by-ID: a token id / canonical id typed into search resolves the
  // exact agent from the FULL index (264k+), even when it isn't on a loaded page.
  const [liveHits, setLiveHits] = useState<Record<string, LiveAgentView>>({});
  const [lookupState, setLookupState] = useState<"idle" | "searching" | "notfound">("idle");

  const views = useMemo<LiveAgentView[]>(() => {
    const bySlug = new Map<string, LiveAgentView>();
    for (const v of [
      ...live,
      ...extra,
      ...Object.values(liveHits),
      ...submittedAgents.map(viewFromSubmission),
    ]) {
      if (!bySlug.has(v.slug)) bySlug.set(v.slug, v);
    }
    return Array.from(bySlug.values());
  }, [live, extra, liveHits, submittedAgents]);

  // Detect a token-id or canonical-id in the query, resolve it live if we don't
  // already have it locally. Debounced; aborts stale in-flight requests.
  useEffect(() => {
    const q = query.trim();
    const canonical = parseCanonicalId(q);
    const tokenId = canonical?.tokenId ?? (/^\d{1,12}$/.test(q) ? q : null);
    if (!tokenId) {
      setLookupState("idle");
      return;
    }
    const chainId = canonical ? Number(canonical.chainId) : 56;
    const slug = `scan-${chainId}-${tokenId}`;
    // Already loaded locally — no lookup needed.
    if (views.some((v) => v.slug === slug || v.tokenId === tokenId)) {
      setLookupState("idle");
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLookupState("searching");
      try {
        const r = await fetch(`/api/8004scan/${chainId}/${tokenId}`, {
          signal: ctrl.signal,
        });
        const env = (await r.json()) as { success?: boolean; data?: Record<string, unknown> };
        if (r.ok && env?.data && env.data.token_id) {
          const view = normalizeScanEntry(env.data, chainId);
          setLiveHits((prev) => ({ ...prev, [view.slug]: view }));
          setLookupState("idle");
        } else {
          setLookupState("notfound");
        }
      } catch {
        if (!ctrl.signal.aborted) setLookupState("notfound");
      }
    }, 450);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, views.length]);

  async function loadMore() {
    if (loadingMore || pagedOut) return;
    setLoadingMore(true);
    setLoadError(null);
    const next = page + 1;
    try {
      const r = await fetch(`/api/directory?page=${next}&limit=24&chainId=56`);
      const data = (await r.json()) as {
        agents?: LiveAgentView[];
        hasMore?: boolean;
        degraded?: boolean;
      };
      if (data.degraded || !Array.isArray(data.agents) || data.agents.length === 0) {
        setLoadError("Indexer is rate-limited or unreachable — try again in a moment.");
      } else {
        setExtra((prev) => [...prev, ...data.agents!]);
        setPage(next);
        if (data.hasMore === false) setPagedOut(true);
      }
    } catch {
      setLoadError("Couldn't load more — check your connection and retry.");
    } finally {
      setLoadingMore(false);
    }
  }

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
            placeholder="Search loaded agents by name — or paste any ERC-8004 token id / id to find it live…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {lookupState === "searching" && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 text-[12px] text-muted">
              <Loader2 size={13} className="animate-spin" /> searching the full index…
            </span>
          )}
        </div>
        {lookupState === "notfound" && (
          <p className="caption -mt-1 text-warning">
            No agent with that id on BSC (chain 56). Check the token id, or browse
            the directory below.
          </p>
        )}

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
            <ScanAgentCard key={v.slug} view={v} selectable />
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

      {/* Load more — page deeper into the live index on demand. Hidden when the
          user is filtering/searching (the loaded window is what they're refining). */}
      {!degraded && !pagedOut && query.trim() === "" && cat === "all" && filter === "all" && (
        <div className="flex flex-col items-center gap-2 pt-1">
          {loadError && <p className="caption text-warning">{loadError}</p>}
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="btn-ghost btn-sm disabled:opacity-60"
          >
            {loadingMore ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Loading…
              </>
            ) : (
              <>Load more agents</>
            )}
          </button>
          <p className="caption text-muted/70">
            Showing {views.length} of {total.toLocaleString()} indexed on BSC
          </p>
        </div>
      )}
      {pagedOut && (
        <p className="caption pt-1 text-center text-muted/70">
          Loaded all currently available directory pages.
        </p>
      )}

      <CompareBar />
    </div>
  );
}

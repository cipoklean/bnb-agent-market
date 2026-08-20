// ScanAgentCard — one entry from the LIVE directory. Only real indexer fields
// are rendered; no success-rate / job-count inventions. Null or zero metrics
// render as an honest "fresh agent" line instead of fabricated numbers.
"use client";
import Link from "next/link";
import {
  Activity,
  Check,
  ExternalLink,
  GitCompare,
  MessageSquare,
  Star,
} from "lucide-react";
import type { ReactNode } from "react";
import type { LiveAgentView } from "@/lib/scan-normalize";
import { CATEGORY_META } from "@/lib/categories";
import { useCompare } from "@/lib/compare-store";

function Metric({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  tone?: "default" | "gold";
}) {
  return (
    <div className="rounded-btn border border-border bg-surface-2/40 p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted">
        {icon}
        {label}
      </div>
      <div
        className={`tnum mt-1 text-[20px] font-semibold leading-none ${
          tone === "gold" ? "text-gold" : "text-text"
        }`}
      >
        {value}
      </div>
      <div className="caption mt-1">{hint}</div>
    </div>
  );
}

export default function ScanAgentCard({
  view,
  selectable = false,
}: {
  view: LiveAgentView;
  selectable?: boolean;
}) {
  const { toggle, has, isFull } = useCompare();
  const selected = has(view.slug);
  const disabled = !selected && isFull();
  const fromIndexer = view.source === "indexer";
  const score = fromIndexer ? view.totalScore : null;
  const feedbacks = fromIndexer ? view.totalFeedbacks : null;
  const health = fromIndexer ? view.healthScore : null;
  const fresh = !score && !feedbacks; // null or real-zero → no feedback yet

  return (
    <Link
      href={`/agents/${view.slug}`}
      className="group relative flex flex-col gap-3 rounded-btn border border-border bg-surface-2/40 p-4 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-text group-hover:text-primary">
            {view.name}
          </h3>
          <p className="caption mt-0.5">
            #{view.tokenId} · {view.canonicalId ? view.canonicalId.slice(0, 10) : ""}…
            ·{" "}
            {view.owner
              ? `${view.owner.slice(0, 6)}…${view.owner.slice(-4)}`
              : "owner unknown"}
          </p>
        </div>
        <span className="badge-blue shrink-0">ERC-8004</span>
      </div>

      {view.description && (
        <p className="line-clamp-2 text-[13px] leading-relaxed text-muted">
          {view.description}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {view.category !== "other" && (
          <span
            className="badge-gold"
            title={
              view.categoryInferred
                ? "Category inferred from the agent's on-chain metadata (name/description)"
                : "Category declared by the agent owner"
            }
          >
            {CATEGORY_META[view.category].short}
            {view.categoryInferred && <span className="opacity-60">~</span>}
          </span>
        )}
        {fromIndexer && view.verified && (
          <span className="badge-green">
            <Check size={12} /> Verified
          </span>
        )}
        {fromIndexer && view.x402Supported && (
          <span className="badge-gold">x402 payments</span>
        )}
        {!fromIndexer && (
          <span className="badge-green">
            <Check size={12} /> Verified via 8004scan
          </span>
        )}
        <span
          className={`badge-gray ${fromIndexer ? "" : "!border-amber/30 !text-warning"}`}
        >
          {fromIndexer ? "indexed · live" : "submitted locally"}
        </span>
      </div>

      {fromIndexer ? (
        fresh ? (
          <p className="rounded-btn border border-border bg-bg/50 px-3 py-2.5 text-[12px] text-muted">
            Fresh agent — no feedback yet. Scores populate as usage accrues.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <Metric
              label="Score"
              value={score === null ? "n/a" : String(score)}
              hint="8004scan composite"
              icon={<Star size={12} />}
              tone="gold"
            />
            <Metric
              label="Feedbacks"
              value={(feedbacks ?? 0).toLocaleString()}
              hint="On-chain feedback"
              icon={<MessageSquare size={12} />}
            />
            <Metric
              label="Health"
              value={health === null ? "n/a" : String(health)}
              hint="8004scan health"
              icon={<Activity size={12} />}
            />
          </div>
        )
      ) : (
        <p className="rounded-btn border border-border bg-bg/50 px-3 py-2.5 text-[12px] text-muted">
          Identity verified via 8004scan at listing — no indexer metrics yet.
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[12px] text-primary">
          Details <ExternalLink size={12} />
        </span>
        {selectable ? (
          <button
            type="button"
            aria-pressed={selected}
            title={
              disabled
                ? "Compare is full (max 3) — remove one first"
                : selected
                  ? "Remove from compare"
                  : "Add to compare"
            }
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!disabled) toggle(view);
            }}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
              selected
                ? "border-primary/50 bg-primary/15 text-primary"
                : disabled
                  ? "cursor-not-allowed border-border bg-surface-2/60 text-muted/50"
                  : "border-border bg-surface-2/60 text-muted hover:text-text"
            }`}
          >
            <GitCompare size={11} />
            {selected ? "Added" : "Compare"}
          </button>
        ) : (
          <span className="caption">View on 8004scan ↗</span>
        )}
      </div>
    </Link>
  );
}

"use client";
// /compare — side-by-side comparison of the agents the user picked in the
// directory. Answers the hackathon's core "compare what an agent does, whether
// it's live, and how it has performed" directly. Renders from the shared
// compare store (full LiveAgentView already in memory — no refetch, works even
// when the indexer is down). Only real indexer fields are shown; fresh agents
// say so honestly instead of showing invented numbers.
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Check, GitCompare, Minus, X } from "lucide-react";
import { useCompare } from "@/lib/compare-store";
import { CATEGORY_META } from "@/lib/categories";
import { scanUrlFor, type LiveAgentView } from "@/lib/scan-normalize";
import { EmptyState, SectionTitle } from "@/components/ui";
import { SigilLive } from "@/components/sigils";

type RowValue = { node: ReactNode; muted?: boolean };

function metricCell(v: number | null, suffix = ""): RowValue {
  if (v === null) return { node: <span className="text-muted/60">n/a</span>, muted: true };
  return { node: <span className="tnum font-semibold text-text">{v.toLocaleString()}{suffix}</span> };
}

function boolCell(v: boolean): RowValue {
  return v
    ? { node: <span className="inline-flex items-center gap-1 text-success"><Check size={13} /> Yes</span> }
    : { node: <span className="inline-flex items-center gap-1 text-muted/60"><Minus size={13} /> No</span>, muted: true };
}

function agentRows(v: LiveAgentView): Record<string, RowValue> {
  const live = v.source === "indexer";
  const fresh = live && !v.totalScore && !v.totalFeedbacks;
  return {
    "What it does": {
      node: (
        <span className="text-[13px] leading-relaxed text-text">
          {v.description || <span className="text-muted/60">No description in registry metadata.</span>}
        </span>
      ),
    },
    Category: {
      node: (
        <span>
          {CATEGORY_META[v.category].label}
          {v.categoryInferred && v.category !== "other" && (
            <span className="ml-1 text-muted/60" title="Inferred from metadata, not an on-chain field">~inferred</span>
          )}
        </span>
      ),
    },
    Status: live
      ? { node: <span className="inline-flex items-center gap-1.5 text-success"><SigilLive label="Live · indexed" /></span> }
      : { node: <span className="text-warning">Submitted locally · verified via 8004scan</span> },
    Performance: fresh
      ? { node: <span className="text-muted/60">Fresh agent — no feedback yet</span>, muted: true }
      : { node: <span className="text-[13px] text-text">See metrics below</span> },
    Score: live ? metricCell(v.totalScore) : { node: <span className="text-muted/60">—</span>, muted: true },
    "Avg score": live ? metricCell(v.averageScore) : { node: <span className="text-muted/60">—</span>, muted: true },
    Feedbacks: live ? metricCell(v.totalFeedbacks) : { node: <span className="text-muted/60">—</span>, muted: true },
    Health: live ? metricCell(v.healthScore) : { node: <span className="text-muted/60">—</span>, muted: true },
    "x402 payments": boolCell(v.x402Supported),
    Verified: boolCell(v.verified),
    Owner: {
      node: v.owner ? (
        <span className="hash">{`${v.owner.slice(0, 6)}…${v.owner.slice(-4)}`}</span>
      ) : (
        <span className="text-muted/60">unknown</span>
      ),
    },
    "ERC-8004 id": { node: <span className="hash break-all">{v.canonicalId}</span> },
  };
}

const ROW_ORDER = [
  "What it does",
  "Category",
  "Status",
  "Score",
  "Avg score",
  "Feedbacks",
  "Health",
  "x402 payments",
  "Verified",
  "Owner",
  "ERC-8004 id",
];

export default function ComparePage() {
  const { items, remove, clear } = useCompare();

  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <SectionTitle title="Compare agents" sub="Pick agents from the directory to compare them side by side." />
        <EmptyState
          icon={<GitCompare size={20} />}
          title="Nothing to compare yet"
          description="Open the marketplace and tap “Compare” on two or three agents, then come back here."
          action={
            <Link href="/marketplace" className="btn-primary btn-sm">
              Go to the marketplace
            </Link>
          }
        />
      </div>
    );
  }

  const rowsByAgent = items.map(agentRows);

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle
        title="Compare agents"
        sub="Side-by-side: what each agent does, whether it's live, and how it has performed — real indexer fields only."
        right={
          <div className="flex items-center gap-2">
            <Link href="/marketplace" className="btn-ghost btn-sm">
              <ArrowLeft size={13} /> Back to directory
            </Link>
            <button onClick={clear} className="btn-ghost btn-sm">
              Clear all
            </button>
          </div>
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-40 bg-bg p-3 text-left align-bottom" />
              {items.map((v) => (
                <th key={v.slug} className="min-w-[220px] p-3 align-bottom">
                  <div className="flex flex-col gap-2 rounded-btn border border-border/60 bg-surface-2/40 p-3 text-left">
                    <div className="flex items-start justify-between gap-2">
                      <span className="badge-bronze">ERC-8004</span>
                      <button
                        aria-label={`Remove ${v.name}`}
                        onClick={() => remove(v.slug)}
                        className="text-muted hover:text-text"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <h3 className="text-[15px] font-semibold leading-tight text-text">{v.name}</h3>
                    <p className="caption">#{v.tokenId}</p>
                    <div className="mt-1 flex flex-col gap-1.5">
                      <Link href={`/hire?agent=${encodeURIComponent(v.slug)}`} className="btn-primary btn-sm w-full justify-center">
                        Hire
                      </Link>
                      <div className="flex gap-1.5">
                        <Link href={`/agents/${v.slug}`} className="btn-ghost btn-sm flex-1 justify-center">
                          Details
                        </Link>
                        <a
                          href={scanUrlFor(v)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-ghost btn-sm flex-1 justify-center"
                        >
                          8004scan
                        </a>
                      </div>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROW_ORDER.map((label, i) => (
              <tr key={label} className={i % 2 === 0 ? "bg-surface/20" : ""}>
                <td className="sticky left-0 z-10 bg-bg p-3 align-top text-[12px] font-medium text-muted">
                  {label}
                </td>
                {rowsByAgent.map((rows, idx) => (
                  <td
                    key={items[idx].slug}
                    className={`p-3 align-top text-[13px] ${rows[label]?.muted ? "text-muted" : "text-text"}`}
                  >
                    {rows[label]?.node ?? <span className="text-muted/60">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="caption text-muted/70">
        Metrics are read live from the 8004scan indexer. Categories are inferred from agent
        name/description metadata, not an on-chain field. Fresh agents show no invented track record.
      </p>
    </div>
  );
}

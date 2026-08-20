"use client";
// CompareBar — a floating tray that appears once the user has added agents to
// compare from the directory. Shows the picks, a clear control, and a link to
// the /compare side-by-side view. Reads the shared (non-persisted) compare store.
import Link from "next/link";
import { GitCompare, X } from "lucide-react";
import { MAX_COMPARE, useCompare } from "@/lib/compare-store";

export default function CompareBar() {
  const { items, remove, clear } = useCompare();
  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-3xl flex-wrap items-center gap-3 rounded-card border border-primary/30 bg-surface/95 p-3 shadow-glow backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-text">
          <GitCompare size={15} className="text-primary" />
          Compare
          <span className="tnum text-muted">
            ({items.length}/{MAX_COMPARE})
          </span>
        </span>

        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          {items.map((v) => (
            <span
              key={v.slug}
              className="inline-flex max-w-[180px] items-center gap-1 rounded-full border border-border bg-surface-2/60 py-1 pl-2.5 pr-1 text-[12px] text-text"
            >
              <span className="truncate">{v.name}</span>
              <button
                type="button"
                aria-label={`Remove ${v.name} from compare`}
                onClick={() => remove(v.slug)}
                className="rounded-full p-0.5 text-muted hover:text-text"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={clear} className="btn-ghost btn-sm">
            Clear
          </button>
          <Link
            href="/compare"
            aria-disabled={items.length < 2}
            className={`btn-primary btn-sm ${
              items.length < 2 ? "pointer-events-none opacity-50" : ""
            }`}
          >
            Compare {items.length}
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";
// SessionPass — one session card: id, agent, budget, expiry, status, revoke
import { useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Clock, Copy, Shield } from "lucide-react";
import { PanelGlass, CopyText, Tooltip } from "@/components/ui";
import RiskBadge from "@/components/RiskBadge";
import RevokeButton from "@/components/RevokeButton";
import { resolveSessionAgent } from "@/lib/scan-resolve";
import { countdown, formatAmount } from "@/lib/format";
import type { SessionManifest, SessionStatus } from "@/lib/types";

export const SESSION_STATUS_META: Record<
  SessionStatus,
  { cls: string; dot: string; label: string }
> = {
  draft: { cls: "badge-blue", dot: "dot-blue", label: "Draft" },
  pending_confirmation: {
    cls: "badge-amber",
    dot: "dot-amber",
    label: "Waiting for you",
  },
  active: { cls: "badge-green", dot: "dot-green", label: "Active" },
  paused: { cls: "badge-gray", dot: "dot-blue", label: "Paused" },
  completed: { cls: "badge-blue", dot: "dot-blue", label: "Completed" },
  revoked: { cls: "badge-red", dot: "dot-red", label: "Stopped" },
  expired: { cls: "badge-gray", dot: "dot-amber", label: "Expired" },
};

export default function SessionPass({ session }: { session: SessionManifest }) {
  const agent = resolveSessionAgent(session.agent_id);
  const st = SESSION_STATUS_META[session.status];
  const [copied, setCopied] = useState(false);

  // Short fingerprint for the narrow card; full hash lives on the session page.
  const shortHash = `${session.memory_hash.slice(0, 10)}…${session.memory_hash.slice(-6)}`;
  const copyHash = async () => {
    try {
      await navigator.clipboard.writeText(session.memory_hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard unavailable — full hash remains visible on the session page
    }
  };

  return (
    <PanelGlass className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="label">Session</div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <CopyText text={session.session_id} />
            <span className={st.cls}>
              <span className={st.dot} /> {st.label}
            </span>
          </div>
        </div>
        <Link
          href={`/sessions/${session.session_id}`}
          className="btn-ghost btn-sm shrink-0"
        >
          Details <ChevronRight size={13} />
        </Link>
      </div>

      <div className="divider" />

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="label">Agent</div>
          <div className="mt-0.5 truncate text-[14px] font-medium">
            {agent?.name ?? session.agent_id}
          </div>
        </div>
        <RiskBadge risk={agent?.riskLevel ?? "medium"} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-btn bg-surface-2/50 px-3 py-2">
          <div className="label">Budget cap</div>
          <div className="tnum mt-0.5 text-[14px] font-semibold">
            {formatAmount(session.budget.max_total, session.budget.token)}
          </div>
        </div>
        <div className="rounded-btn bg-surface-2/50 px-3 py-2">
          <div className="label">Expiry</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[14px] font-semibold">
            <Clock size={13} className="text-muted" />
            {countdown(session.expiry)}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Tooltip label="A fingerprint of everything in this session. If it changes, the session is not the one you approved. Click to copy the full hash.">
          <button
            onClick={copyHash}
            title={session.memory_hash}
            className="hash flex min-w-0 items-center gap-1.5 text-left text-[12px] text-muted hover:text-text"
          >
            <Shield size={13} className="shrink-0 text-primary" />
            <span className="truncate">{shortHash}</span>
            {copied ? (
              <Check size={12} className="shrink-0 text-success" />
            ) : (
              <Copy size={12} className="shrink-0 text-muted" />
            )}
          </button>
        </Tooltip>
        <RevokeButton session={session} compact className="shrink-0" />
      </div>
    </PanelGlass>
  );
}
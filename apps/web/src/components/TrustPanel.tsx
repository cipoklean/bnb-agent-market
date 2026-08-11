"use client";
// TrustPanel — right-side panel: memory, permissions, proofs, session health
import { Clock, FileText, Lock, Shield } from "lucide-react";
import { CopyText, PanelGlass, ProgressBar, Tooltip } from "@/components/ui";
import RevokeButton from "@/components/RevokeButton";
import { useMarket } from "@/lib/store";
import { countdown, formatAmount } from "@/lib/format";
import type { SessionManifest } from "@/lib/types";

export default function TrustPanel({ session }: { session: SessionManifest }) {
  const { events, payments } = useMarket();

  const sessionEvents = events.filter((e) => e.session_id === session.session_id);
  const proofs = sessionEvents.filter((e) => Boolean(e.proof)).length;
  const spent = payments
    .filter((p) => p.session_id === session.session_id && p.status === "paid")
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const cap = parseFloat(session.budget.max_total) || 0;
  const pct = cap > 0 ? (spent / cap) * 100 : 0;

  return (
    <PanelGlass className="flex flex-col gap-4">
      <h3 className="title-card flex items-center gap-2">
        <Shield size={15} className="text-primary" /> Session health
      </h3>

      <div>
        <Tooltip label="The fingerprint of the session manifest. Verify it before trusting anything.">
          <div className="label mb-1.5">Session memory</div>
        </Tooltip>
        <CopyText text={session.memory_hash} />
      </div>

      <div>
        <div className="label mb-1.5">Permissions</div>
        <ul className="flex flex-col gap-1.5">
          <li className="flex items-center justify-between gap-2 text-[13px]">
            <span className="text-muted">Allowed targets</span>
            <span className="tnum">{session.permissions.allowed_targets.length}</span>
          </li>
          <li className="flex items-center justify-between gap-2 text-[13px]">
            <span className="text-muted">Allowed selectors</span>
            <span className="tnum">{session.permissions.allowed_selectors.length}</span>
          </li>
          <li className="flex items-center justify-between gap-2 text-[13px]">
            <span className="text-muted">Forbidden actions</span>
            <span className="tnum">{session.permissions.forbidden_actions.length}</span>
          </li>
        </ul>
        {session.permissions.allowed_targets.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {session.permissions.allowed_targets.slice(0, 4).map((t) => (
              <span key={t} className="badge-gray hash !text-[10px]">
                {t}
              </span>
            ))}
            {session.permissions.allowed_targets.length > 4 && (
              <span className="caption">+{session.permissions.allowed_targets.length - 4} more</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="label">Proofs recorded</div>
        <span className="tnum flex items-center gap-1.5 text-[14px] font-semibold">
          <FileText size={13} className="text-success" /> {proofs}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="label flex items-center gap-1.5">
            <Clock size={12} /> Expiry
          </div>
          <span className="tnum text-[13px] font-medium">{countdown(session.expiry)}</span>
        </div>
        <Tooltip label="How much of your total cap has been spent so far.">
          <div className="label flex items-center gap-1.5">
            <Lock size={12} /> Budget used
          </div>
        </Tooltip>
        <ProgressBar
          value={spent}
          max={cap}
          tone={pct >= 80 ? "red" : pct >= 50 ? "gold" : "green"}
        />
        <span className="caption tnum">
          {formatAmount(spent.toFixed(2), session.budget.token)} of{" "}
          {formatAmount(session.budget.max_total, session.budget.token)}
        </span>
      </div>

      <div className="divider" />

      <RevokeButton session={session} />
      <p className="caption text-center">You can stop the agent anytime.</p>
    </PanelGlass>
  );
}

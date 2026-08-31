"use client";
// Session Detail — manifest, memory verify, timeline, payments, revoke
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Clock,
  Lock,
  Shield,
  X,
  Zap,
} from "lucide-react";
import {
  CopyText,
  EmptyState,
  Panel,
  SectionTitle,
  Spinner,
  Tooltip,
  TrustNote,
} from "@/components/ui";
import ActivityTimeline from "@/components/ActivityTimeline";
import MemoryAttestationCard from "@/components/MemoryAttestationCard";
import PaymentSheet from "@/components/PaymentSheet";
import RevokeButton from "@/components/RevokeButton";
import TrustPanel from "@/components/TrustPanel";
import RiskBadge from "@/components/RiskBadge";
import { useMarket } from "@/lib/store";
import { resolveSessionAgent } from "@/lib/scan-resolve";
import { countdown, formatAmount, timeAgo } from "@/lib/format";
import { classifyManifestHash, type ManifestHashStatus } from "@/lib/memory";
import type { SessionManifest, SessionStatus } from "@/lib/types";

const STATUS_LABEL: Record<SessionStatus, { cls: string; label: string }> = {
  draft: { cls: "badge-blue", label: "Draft" },
  pending_confirmation: { cls: "badge-amber", label: "Waiting for you" },
  active: { cls: "badge-green", label: "Active" },
  paused: { cls: "badge-gray", label: "Paused" },
  completed: { cls: "badge-blue", label: "Completed" },
  revoked: { cls: "badge-red", label: "Stopped" },
  expired: { cls: "badge-gray", label: "Expired" },
};

export default function SessionDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { sessions, events, payments, confirmations, reverifySession, submittedAgents } = useMarket();
  const session = useMemo(
    () => sessions.find((s) => s.session_id === id),
    [sessions, id]
  );

  const [verifyState, setVerifyState] = useState<"idle" | "checking" | ManifestHashStatus>("idle");

  useEffect(() => {
    setVerifyState("idle");
  }, [id]);

  if (!session) {
    return (
      <EmptyState
        icon={<AlertTriangle size={20} />}
        title="Session not found"
        description="This session may have been removed or the link is wrong."
        action={
          <Link href="/dashboard" className="btn-ghost btn-sm">
            <ArrowLeft size={13} /> Back to dashboard
          </Link>
        }
      />
    );
  }

  const agent = resolveSessionAgent(session.agent_id, submittedAgents);
  const st = STATUS_LABEL[session.status];
  const sessionEvents = events.filter((e) => e.session_id === session.session_id);
  const sessionPayments = payments.filter((p) => p.session_id === session.session_id);
  const sessionConfirmations = confirmations.filter(
    (c) => c.session_id === session.session_id
  );
  const stopped = session.status === "revoked";

  const verifyMemory = async () => {
    setVerifyState("checking");
    // Read the freshest copy from the store — reverifySession changes the
    // session, and the closure `session` would be stale right after.
    const fresh = useMarket
      .getState()
      .sessions.find((s) => s.session_id === session.session_id);
    if (!fresh) {
      setVerifyState("idle");
      return;
    }
    setVerifyState(await classifyManifestHash(fresh));
  };

  // F6 — upgrade a pre-upgrade fingerprint to the current hash format, then
  // re-verify so the badge turns green.
  const handleReverify = async () => {
    setVerifyState("checking");
    await reverifySession(session.session_id);
    await verifyMemory();
  };

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div>
        <Link href="/dashboard" className="link inline-flex items-center gap-1 text-[13px]">
          <ArrowLeft size={13} /> Dashboard
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="title-page">Session {session.session_id}</h1>
          <span className={st.cls}>{st.label}</span>
          <RiskBadge risk={agent?.riskLevel ?? "medium"} />
          <Link href={`/report/${session.session_id}`} className="btn-ghost btn-sm">
            Agent Advantage Report
          </Link>
        </div>
        <p className="body-sm mt-1">
          {agent?.name ?? session.agent_id} · created {timeAgo(session.created_at)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Manifest */}
          <Panel>
            <SectionTitle title="Session manifest" sub="Exactly what you approved — nothing more." />
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <div className="label mb-1.5">Task</div>
                <p className="text-[14px] font-medium capitalize">{session.scope.task_type}</p>
                <p className="body-sm mt-1">{session.scope.description}</p>
                {Object.keys(session.scope.parameters).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(session.scope.parameters).map(([k, v]) => (
                      <span key={k} className="badge-gray hash !text-[10px]">
                        {k}: {String(v)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className="label mb-1.5">Budget</div>
                <p className="text-[14px] font-medium">
                  {formatAmount(session.budget.max_total, session.budget.token)} total ·{" "}
                  {formatAmount(session.budget.max_per_action, session.budget.token)} per action
                </p>
                <div className="label mb-1.5 mt-3">Expiry</div>
                <p className="flex items-center gap-1.5 text-[14px] font-medium">
                  <Clock size={13} className="text-muted" /> {countdown(session.expiry)}
                </p>
                <div className="label mb-1.5 mt-3">Payment</div>
                <p className="text-[14px] font-medium capitalize">
                  {session.payment.method} · {formatAmount(session.payment.amount, session.payment.token)}
                </p>
              </div>
            </div>
            <div className="divider my-4" />
            <div>
              <div className="label mb-1.5 flex items-center gap-1.5">
                <Lock size={12} /> Permissions
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <div className="caption mb-1.5">Allowed targets</div>
                  <div className="flex flex-wrap gap-1.5">
                    {session.permissions.allowed_targets.length === 0 && (
                      <span className="caption">None — read-only session</span>
                    )}
                    {session.permissions.allowed_targets.map((t) => (
                      <span key={t} className="badge-gray hash !text-[10px]">{t}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="caption mb-1.5">Allowed selectors</div>
                  <div className="flex flex-wrap gap-1.5">
                    {session.permissions.allowed_selectors.length === 0 && (
                      <span className="caption">None</span>
                    )}
                    {session.permissions.allowed_selectors.map((t) => (
                      <span key={t} className="badge-gray hash !text-[10px]">{t}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="caption mb-1.5">Forbidden actions</div>
                  <div className="flex flex-wrap gap-1.5">
                    {session.permissions.forbidden_actions.map((t) => (
                      <span key={t} className="badge-red hash !text-[10px]">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          {/* Memory */}
          <MemoryAttestationCard session={session} />
          <Panel className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Tooltip label="Recompute the hash from the manifest and compare it to the stored one.">
                  <div className="label mb-1">Verify memory</div>
                </Tooltip>
                <CopyText text={session.memory_hash} />
              </div>
              <button onClick={verifyMemory} disabled={verifyState === "checking"} className="btn-ghost btn-sm">
                {verifyState === "checking" ? (
                  <Spinner label="Verifying memory hash…" />
                ) : (
                  <>
                    <Shield size={13} /> Verify memory
                  </>
                )}
              </button>
            </div>
            {verifyState === "verified" && (
              <p className="flex items-center gap-1.5 text-[13px] text-success">
                <Check size={13} /> VERIFIED — the memory hash matches the manifest exactly.
              </p>
            )}
            {verifyState === "seed" && (
              <div className="flex flex-col gap-2 rounded-btn border border-amber/30 bg-amber/8 p-2.5">
                <span className="flex items-center gap-1.5 text-[13px] font-medium text-warning">
                  <AlertTriangle size={13} /> DEMO seed — placeholder hash
                </span>
                <p className="caption">
                  Seeded demo sessions carry labeled placeholder hashes — sessions
                  created through Hire compute real hashes and verify as matched.
                </p>
              </div>
            )}
            {verifyState === "pre-upgrade" && (
              <div className="flex flex-col gap-2 rounded-btn border border-amber/30 bg-amber/8 p-2.5">
                <span className="flex items-center gap-1.5 text-[13px] font-medium text-warning">
                  <Clock size={13} /> Pre-upgrade fingerprint
                </span>
                <p className="caption">
                  Hash format was upgraded; the manifest content is unchanged.
                </p>
                <button
                  onClick={handleReverify}
                  className="btn-ghost btn-sm self-start"
                >
                  Re-verify &amp; upgrade
                </button>
              </div>
            )}
            {verifyState === "tamper" && (
              <p className="flex items-start gap-1.5 text-[13px] text-danger">
                <X size={13} className="mt-0.5 shrink-0" />
                <span>
                  MISMATCH — the stored hash does not match the manifest. If this
                  were live, the action would be refused.
                </span>
              </p>
            )}
          </Panel>

          {/* Timeline */}
          <Panel>
            <SectionTitle title="Activity" sub="Chronological agent actions with proof." />
            <ActivityTimeline events={sessionEvents} />
          </Panel>

          {/* Payments */}
          <Panel className="flex flex-col gap-4">
            <SectionTitle title="Payments" sub="x402 payment requests and receipts for this session." />
            <PaymentSheet session={session} />
            {sessionPayments.length > 0 && (
              <div className="flex flex-col gap-2">
                {sessionPayments.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-btn border border-border bg-surface-2/40 px-3 py-2 text-[13px]"
                  >
                    <span className="flex items-center gap-1.5">
                      <Zap size={12} className="text-primary" />
                      <span className="tnum font-medium">{formatAmount(p.amount, p.token)}</span>
                    </span>
                    <span className="caption">{timeAgo(p.created_at)}</span>
                    <CopyText text={p.tx_hash || p.x402_payment_id} />
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Confirmations */}
          <Panel>
            <SectionTitle title="Confirmation log" sub="Every approval and refusal, recorded." />
            {sessionConfirmations.length === 0 && (
              <p className="body-sm">No confirmations recorded for this session.</p>
            )}
            <div className="flex flex-col gap-2">
              {sessionConfirmations.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-btn border border-border bg-surface-2/40 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium capitalize">{c.action_type.replace("_", " ")}</div>
                    <p className="caption mt-0.5">{c.notes}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <RiskBadge risk={c.risk} />
                    {c.user_confirmed ? (
                      <span className="badge-green"><Check size={12} /> Confirmed</span>
                    ) : (
                      <span className="badge-amber">Awaiting you</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <TrustPanel session={session} />
          {stopped && (
            <TrustNote>This agent was stopped. No further actions will execute.</TrustNote>
          )}
        </div>
      </div>
    </div>
  );
}

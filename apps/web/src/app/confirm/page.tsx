"use client";
// Confirm Center — pending approvals, typed CONFIRM for high risk, manifest diffs
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Shield,
  X,
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
import RiskBadge from "@/components/RiskBadge";
import { useMarket } from "@/lib/store";
import { classifyManifestHash, manifestHash, type ManifestHashStatus } from "@/lib/memory";
import { timeAgo } from "@/lib/format";
import type { Confirmation, SessionManifest } from "@/lib/types";

export default function ConfirmPage() {
  const { sessions, confirmations, confirmSession, addEvent, requireTypedConfirm } = useMarket();
  const [confirmedIds, setConfirmedIds] = useState<Record<string, boolean>>({});
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [working, setWorking] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, "ok" | "blocked">>({});

  // Manifest diff state
  const [diffId, setDiffId] = useState<string>(() => sessions[0]?.session_id ?? "");
  const [recomputed, setRecomputed] = useState<string | null>(null);
  const [diffStatus, setDiffStatus] = useState<ManifestHashStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const diffSession = useMemo(
    () => sessions.find((s) => s.session_id === diffId) ?? null,
    [sessions, diffId]
  );

  const pending = confirmations.filter(
    (c) => !c.user_confirmed && !confirmedIds[c.id]
  );

  useEffect(() => {
    if (!diffSession) {
      setRecomputed(null);
      setDiffStatus(null);
      return;
    }
    let live = true;
    setChecking(true);
    const { memory_hash: _stored, ...rest } = diffSession;
    manifestHash(rest).then((h) => {
      if (live) {
        setRecomputed(h);
        setChecking(false);
      }
    });
    // F6 — same badge classification everywhere: seeds get a labeled DEMO badge,
    // pre-upgrade sessions get amber, only true v2 mismatches show red.
    classifyManifestHash(diffSession).then((s) => {
      if (live) setDiffStatus(s);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diffId, diffSession]);

  const handleConfirm = async (c: Confirmation) => {
    setWorking(c.id);
    setResult((r) => ({ ...r, [c.id]: "ok" }));
    try {
      if (c.action_type === "session_confirm") {
        const ok = await confirmSession(c.session_id);
        if (!ok) {
          setResult((r) => ({ ...r, [c.id]: "blocked" }));
          return;
        }
      } else {
        addEvent({
          session_id: c.session_id,
          type: "confirmed",
          title: `Action confirmed: ${c.action_type.replace("_", " ")}`,
          detail: "You approved this action. Proof recorded.",
          proof: c.memory_hash,
          status: "done",
        });
      }
      setConfirmedIds((m) => ({ ...m, [c.id]: true }));
    } finally {
      setWorking(null);
    }
  };

  const matches = recomputed !== null && diffSession !== null && recomputed === diffSession.memory_hash;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard" className="link inline-flex items-center gap-1 text-[13px]">
          <ArrowLeft size={13} /> Dashboard
        </Link>
        <h1 className="title-page mt-2">Confirm Center</h1>
        <p className="body-sm mt-1">
          No action happens until you confirm. High-risk approvals ask you to type
          CONFIRM unless you turned that off in Settings.
        </p>
      </div>

      {/* Pending confirmations */}
      <section>
        <SectionTitle
          title="Pending confirmations"
          sub="Waiting for you. Nothing executes without your approval."
        />
        {pending.length === 0 ? (
          <EmptyState
            icon={<Check size={20} />}
            title="Nothing waiting on you"
            description="All pending actions are confirmed. New session or action approvals will appear here."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pending.map((c) => {
              const isHigh = c.risk === "high";
              const needsTyping = isHigh && requireTypedConfirm;
              const canGo = !needsTyping || typed[c.id] === "CONFIRM";
              const res = result[c.id];
              return (
                <Panel key={c.id} className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="title-card capitalize">
                          {c.action_type.replace("_", " ")}
                        </h3>
                        <RiskBadge risk={c.risk} />
                      </div>
                      <p className="caption mt-1">
                        {c.session_id} · {timeAgo(c.timestamp)}
                      </p>
                    </div>
                    <Link href={`/sessions/${c.session_id}`} className="link shrink-0 text-[12px]">
                      View session
                    </Link>
                  </div>
                  <Tooltip label="The memory fingerprint this approval is bound to.">
                    <CopyText text={c.memory_hash} />
                  </Tooltip>
                  <p className="body-sm">{c.notes}</p>
                  {isHigh && requireTypedConfirm && (
                    <div className="flex items-start gap-2 rounded-btn border border-danger/30 bg-danger/8 p-2.5 text-[12px] text-danger">
                      <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                      High-risk action — type CONFIRM to approve.
                    </div>
                  )}
                  {isHigh && !requireTypedConfirm && (
                    <div className="flex items-start gap-2 rounded-btn border border-amber/30 bg-amber/8 p-2.5 text-[12px] text-warning">
                      <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                      Reduced confirmation (demo): typing CONFIRM is turned off, so this
                      high-risk action approves with one click. Turn it back on in
                      Settings.
                    </div>
                  )}
                  {needsTyping && (
                    <input
                      className="input !py-1.5 text-[13px]"
                      placeholder="Type CONFIRM to approve"
                      value={typed[c.id] ?? ""}
                      onChange={(e) => setTyped((m) => ({ ...m, [c.id]: e.target.value }))}
                    />
                  )}
                  <div className="flex items-center justify-between gap-2">
                    {res === "blocked" && (
                      <span className="flex items-center gap-1.5 text-[12px] text-danger">
                        <X size={12} /> Memory hash mismatch — action refused.
                      </span>
                    )}
                    {res === "blocked" && (
                      <span className="caption">
                        Seeded demo hashes are labeled placeholders. Sessions created via
                        Hire verify correctly.
                      </span>
                    )}
                    <button
                      onClick={() => handleConfirm(c)}
                      disabled={!canGo || working === c.id || res === "blocked"}
                      className="btn-primary btn-sm ml-auto"
                    >
                      {working === c.id ? (
                        <Spinner label="Confirming…" />
                      ) : (
                        <>
                          <Check size={13} /> Confirm
                        </>
                      )}
                    </button>
                  </div>
                </Panel>
              );
            })}
          </div>
        )}
      </section>

      {/* Manifest diff */}
      <section>
        <SectionTitle
          title="Session manifest diff"
          sub="Compare the stored memory hash against a fresh recomputation."
        />
        <Panel className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="select !w-auto"
              value={diffId}
              onChange={(e) => setDiffId(e.target.value)}
            >
              {sessions.map((s) => (
                <option key={s.session_id} value={s.session_id}>
                  {s.session_id} · {s.agent_id}
                </option>
              ))}
            </select>
            {checking && <Spinner label="Recomputing memory hash…" />}
            {!checking && diffSession && diffStatus && (
              diffStatus === "verified" ? (
                <span className="badge-green"><Check size={12} /> VERIFIED</span>
              ) : diffStatus === "seed" ? (
                <span className="badge-amber">DEMO seed — placeholder hash</span>
              ) : diffStatus === "pre-upgrade" ? (
                <span className="badge-amber">Pre-upgrade fingerprint</span>
              ) : (
                <span className="badge-red"><X size={12} /> MISMATCH</span>
              )
            )}
          </div>
          {diffSession && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-btn border border-border bg-surface-2/40 p-3">
                <div className="label mb-1.5">Stored memory hash</div>
                <CopyText text={diffSession.memory_hash} />
                <p className="caption mt-1.5">What the session recorded when it was created.</p>
              </div>
              <div className="rounded-btn border border-border bg-surface-2/40 p-3">
                <div className="label mb-1.5">Recomputed from manifest</div>
                {checking ? <Spinner label="Hashing…" /> : recomputed ? (
                  <CopyText text={recomputed} />
                ) : null}
                <p className="caption mt-1.5">Fresh SHA-256 of the manifest fields, in canonical order.</p>
              </div>
            </div>
          )}
          {!matches && diffSession && !checking && (
            <TrustNote>
              If hashes match, the session memory is intact. If they don&apos;t, stop the
              agent now. Seeded demo sessions show labeled placeholder hashes — sessions
              from the Hire flow match.
            </TrustNote>
          )}
        </Panel>
      </section>

      {/* Confirmation history */}
      <section>
        <SectionTitle title="Confirmation history" sub="Everything you have approved or refused." />
        <Panel>
          <div className="flex flex-col">
            {confirmations.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 py-2.5 last:border-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium capitalize">
                      {c.action_type.replace("_", " ")}
                    </span>
                    <RiskBadge risk={c.risk} />
                  </div>
                  <p className="caption mt-0.5">{c.session_id} · {timeAgo(c.timestamp)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <CopyText text={c.memory_hash} />
                  {c.user_confirmed ? (
                    <span className="badge-green"><Check size={12} /> Confirmed</span>
                  ) : (
                    <span className="badge-amber">Refused / pending</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      {/* Inline guard banner explaining the rule */}
      <div className="flex items-start gap-3 rounded-btn border border-primary/25 bg-primary/8 p-4">
        <Shield size={16} className="mt-0.5 shrink-0 text-primary" />
        <p className="body-sm !text-[13px]">
          <span className="font-medium text-text">The rule:</span> this agent must confirm
          the session before acting, and every high-risk action is blocked unless you
          approve it{requireTypedConfirm ? " by typing CONFIRM" : ""}. If a memory hash
          ever mismatches, the action is refused immediately.
        </p>
      </div>
    </div>
  );
}

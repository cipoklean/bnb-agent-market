"use client";
// MemoryAttestationCard — session memory hash, state, phase, next action, confirm
import { useEffect, useState } from "react";
import { AlertTriangle, Check, RefreshCw, Shield, X } from "lucide-react";
import { PanelGlass, CopyText, Tooltip, Spinner, TrustNote } from "@/components/ui";
import { useMarket } from "@/lib/store";
import { classifyManifestHash, type ManifestHashStatus } from "@/lib/memory";
import { getAgent } from "@/lib/data";
import type { SessionManifest, SessionStatus } from "@/lib/types";

const PHASE: Record<SessionStatus, string> = {
  draft: "Drafting the session manifest",
  pending_confirmation: "Awaiting your confirmation",
  active: "Running within the limits you set",
  paused: "Paused by the agent",
  completed: "Completed",
  revoked: "Stopped by you",
  expired: "Expired automatically",
};

const NEXT: Record<SessionStatus, string> = {
  draft: "Finish the manifest and confirm it.",
  pending_confirmation: "Confirm the session so the agent may act within your limits.",
  active: "No action happens until you confirm it.",
  paused: "Resume or stop the session.",
  completed: "No pending actions. Proof and receipts are below.",
  revoked: "Session stopped. No further actions will execute.",
  expired: "Session expired. Create a new one if you need it again.",
};

export default function MemoryAttestationCard({
  session,
}: {
  session: SessionManifest;
}) {
  const { confirmSession, reverifySession } = useMarket();
  const [status, setStatus] = useState<ManifestHashStatus | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [reverifying, setReverifying] = useState(false);
  const agent = getAgent(session.agent_id);
  const awaitingConfirm = session.status === "pending_confirmation";

  useEffect(() => {
    let live = true;
    setStatus(null);
    classifyManifestHash(session).then((s) => {
      if (live) setStatus(s);
    });
    return () => {
      live = false;
    };
  }, [session]);

  const handleConfirm = async () => {
    setConfirming(true);
    await confirmSession(session.session_id);
    setConfirming(false);
  };

  // F6 — upgrade a pre-upgrade fingerprint to the current hash format. The store
  // update swaps the session prop, so the effect above re-runs and the card
  // flips to VERIFIED on its own.
  const handleReverify = async () => {
    setReverifying(true);
    await reverifySession(session.session_id);
    setReverifying(false);
  };

  return (
    <PanelGlass className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shield size={15} className="text-primary" />
          <h3 className="title-card">Session memory</h3>
        </div>
        {status === "verified" && (
          <span className="badge-green">
            <Check size={12} /> VERIFIED
          </span>
        )}
        {status === "seed" && (
          <span className="badge-amber">DEMO seed — placeholder hash</span>
        )}
        {status === "pre-upgrade" && (
          <span className="badge-amber">Pre-upgrade fingerprint</span>
        )}
        {status === "tamper" && (
          <span className="badge-red">
            <X size={12} /> MISMATCH
          </span>
        )}
      </div>

      <Tooltip label="The fingerprint of the session manifest. The agent verifies this before every action.">
        <div className="rounded-btn border border-border bg-surface-2/50 px-3 py-2">
          <div className="label">Memory hash</div>
          <div className="mt-1">
            <CopyText text={session.memory_hash} />
          </div>
        </div>
      </Tooltip>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="label">Session state</div>
          <div className="mt-1 text-[14px] font-medium capitalize">
            {session.status.replace("_", " ")}
          </div>
        </div>
        <div>
          <div className="label">Agent</div>
          <div className="mt-1 truncate text-[14px] font-medium">
            {agent?.name ?? session.agent_id}
          </div>
        </div>
        <div>
          <div className="label">Current phase</div>
          <div className="mt-1 text-[14px]">{PHASE[session.status]}</div>
        </div>
        <div>
          <div className="label">Next action</div>
          <div className="mt-1 text-[14px] text-muted">{NEXT[session.status]}</div>
        </div>
      </div>

      {status === "seed" && (
        <p className="caption">
          This is a labeled demo placeholder hash — sessions created through Hire
          compute real hashes and verify as matched.
        </p>
      )}
      {status === "pre-upgrade" && (
        <div className="flex flex-col gap-2">
          <p className="caption">
            Hash format was upgraded; the manifest content is unchanged.
          </p>
          <button
            onClick={handleReverify}
            disabled={reverifying}
            className="btn-ghost btn-sm self-start"
          >
            {reverifying ? (
              <Spinner label="Re-fingerprinting…" />
            ) : (
              <>
                <RefreshCw size={13} /> Re-verify &amp; upgrade
              </>
            )}
          </button>
        </div>
      )}
      {status === "tamper" && (
        <p className="caption">
          The stored hash does not match the manifest. If this were live, the
          action would be refused.
        </p>
      )}

      {status === null && <Spinner label="Verifying memory hash…" />}

      {awaitingConfirm && (
        <div className="flex flex-col gap-3">
          <TrustNote>
            No action happens until you confirm. The agent must confirm the session
            before acting.
          </TrustNote>
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="btn-primary w-full"
          >
            {confirming ? (
              <Spinner label="Confirming session…" />
            ) : (
              <>
                <Check size={14} /> Confirm session — allow this agent to act with limits
                you control.
              </>
            )}
          </button>
        </div>
      )}

      {!awaitingConfirm && status === "verified" && (
        <TrustNote>
          You confirmed this session. The agent may act within the limits you set, and
          you can stop it anytime.
        </TrustNote>
      )}

      {session.status === "revoked" && (
        <div className="flex items-center gap-2 text-[13px] font-medium text-danger">
          <AlertTriangle size={14} /> This agent was stopped and cannot act.
        </div>
      )}
    </PanelGlass>
  );
}

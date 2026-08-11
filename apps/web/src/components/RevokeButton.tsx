"use client";
// RevokeButton — the SINGLE "stop this agent" control for sessions.
// Opens a typed-CONFIRM modal before revoking. Used by SessionPass, TrustPanel,
// and the session detail page so every stop path behaves identically.
// Layout contract: non-compact = w-full (panel contexts); compact = content-sized
// (card rows) so it can never overflow its parent card.
import { useState } from "react";
import { AlertTriangle, StopCircle } from "lucide-react";
import { Modal, Spinner } from "@/components/ui";
import { useMarket } from "@/lib/store";
import { HUMAN_CALLER_ID } from "@/lib/delegation";
import type { SessionManifest } from "@/lib/types";

export default function RevokeButton({
  session,
  compact = false,
  className = "",
}: {
  session: SessionManifest;
  compact?: boolean;
  className?: string;
}) {
  const { revokeSession } = useMarket();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState("");

  const stopped = session.status === "revoked";
  const canStop = typed === "CONFIRM";

  const close = () => {
    if (revoking) return;
    setOpen(false);
    setTyped("");
    setError("");
  };

  const handleStop = async () => {
    setRevoking(true);
    setError("");
    try {
      // The UI is operated by the human principal — always the human caller.
      // Agent callers act through the A2A API path, never this button
      // (strict delegation tree, D008).
      await revokeSession(session.session_id, HUMAN_CALLER_ID);
      setTyped("");
      setOpen(false);
    } catch (e) {
      // Denied by the delegation tree (e.g. an agent caller) — surface honestly.
      setError(e instanceof Error ? e.message : "Revocation denied.");
      setTyped("");
    } finally {
      setRevoking(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={stopped}
        aria-label="Stop this agent now"
        className={`btn-danger ${compact ? "btn-sm" : "w-full"} ${className}`}
      >
        <StopCircle size={14} />{" "}
        {stopped
          ? compact
            ? "Stopped"
            : "Session stopped"
          : compact
            ? "Stop"
            : "Stop this agent now."}
      </button>

      <Modal open={open} onClose={close} title="Stop this agent now?">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-2.5 rounded-btn border border-danger/30 bg-danger/8 p-3 text-[13px] text-danger">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>
              Stopping is immediate and permanent for this session. Any pending actions
              are cancelled. No further actions will execute.
            </span>
          </div>
          <div>
            <div className="label mb-1.5">Type CONFIRM to stop</div>
            <input
              className="input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="CONFIRM"
            />
          </div>
          {error && (
            <div className="flex items-start gap-2.5 rounded-btn border border-danger/30 bg-danger/8 p-3 text-[13px] text-danger">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={close} className="btn-ghost">
              Keep running
            </button>
            <button onClick={handleStop} disabled={!canStop || revoking} className="btn-danger">
              {revoking ? <Spinner label="Stopping…" /> : <><StopCircle size={14} /> Stop now</>}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

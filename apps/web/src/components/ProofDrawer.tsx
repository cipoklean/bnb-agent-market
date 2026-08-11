"use client";
// ProofDrawer — slide-over panel for a transaction hash or an attestation/proof id.
// Only these two are reachable today (see ActivityTimeline); receipt and logs are
// not fed by any caller, so they are not rendered.
import { FileText, Shield, X } from "lucide-react";
import { CopyText } from "@/components/ui";

export interface ProofData {
  title: string;
  txHash?: string;
  attestation?: string;
}

export default function ProofDrawer({
  open,
  onClose,
  proof,
}: {
  open: boolean;
  onClose: () => void;
  proof?: ProofData | null;
}) {
  if (!open || !proof) return null;
  const empty = !proof.txHash && !proof.attestation;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-slide-in-right absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-border bg-surface shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-surface/90 px-5 py-4 backdrop-blur">
          <div className="flex min-w-0 items-center gap-2">
            <FileText size={16} className="shrink-0 text-primary" />
            <h3 className="title-card truncate">Proof — {proof.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-muted hover:text-text"
            aria-label="Close proof"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-5 p-5">
          {proof.txHash && (
            <div>
              <div className="label mb-1.5 flex items-center gap-1.5">
                <FileText size={12} /> Transaction hash
              </div>
              <CopyText text={proof.txHash} />
            </div>
          )}

          {proof.attestation && (
            <div>
              <div className="label mb-1.5 flex items-center gap-1.5">
                <Shield size={12} /> Attestation
              </div>
              <CopyText text={proof.attestation} />
            </div>
          )}

          {empty && <p className="body-sm">No structured proof attached to this event.</p>}
        </div>
      </div>
    </div>
  );
}

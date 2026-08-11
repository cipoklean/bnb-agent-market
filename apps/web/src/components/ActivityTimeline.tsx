"use client";
// ActivityTimeline — chronological agent actions with expandable proof
import { useState } from "react";
import {
  AlertTriangle,
  Check,
  Clock,
  Database,
  FileText,
  Shield,
  StopCircle,
  Zap,
} from "lucide-react";
import ProofDrawer, { type ProofData } from "@/components/ProofDrawer";
import { timeAgo } from "@/lib/format";
import type { SessionEvent } from "@/lib/types";

const TYPE_META: Record<
  SessionEvent["type"],
  { icon: typeof Zap; cls: string; ring: string; label: string }
> = {
  created: { icon: FileText, cls: "text-info", ring: "bg-info/15", label: "Created" },
  confirmed: { icon: Check, cls: "text-success", ring: "bg-success/15", label: "Confirmed" },
  action: { icon: Zap, cls: "text-primary", ring: "bg-primary/15", label: "Action" },
  payment: { icon: Database, cls: "text-info", ring: "bg-info/15", label: "Payment" },
  proof: { icon: Shield, cls: "text-success", ring: "bg-success/15", label: "Proof" },
  revoked: { icon: StopCircle, cls: "text-danger", ring: "bg-danger/15", label: "Stopped" },
  expired: { icon: Clock, cls: "text-muted", ring: "bg-surface-2", label: "Expired" },
  alert: { icon: AlertTriangle, cls: "text-warning", ring: "bg-warning/15", label: "Alert" },
};

export default function ActivityTimeline({ events }: { events: SessionEvent[] }) {
  const [proof, setProof] = useState<ProofData | null>(null);
  const sorted = [...events].sort(
    (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
  );

  return (
    <div className="flex flex-col">
      {sorted.map((e, i) => {
        const m = TYPE_META[e.type];
        const Icon = m.icon;
        const hasProof = Boolean(e.proof);
        return (
          <div key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
            {i < sorted.length - 1 && (
              <span className="absolute bottom-0 left-[11px] top-6 w-px bg-border/60" />
            )}
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${m.ring}`}
            >
              <Icon size={13} className={m.cls} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-[14px] font-medium">{e.title}</span>
                <span className="caption">{timeAgo(e.ts)}</span>
              </div>
              <p className="body-sm mt-0.5">{e.detail}</p>
              {hasProof && (
                <button
                  onClick={() => {
                    // Mutually exclusive: a 0x proof is a transaction hash, anything
                    // else is an attestation/proof id. Never show both.
                    const isTx = e.proof?.startsWith("0x");
                    setProof({
                      title: e.title,
                      txHash: isTx ? e.proof : undefined,
                      attestation: isTx ? undefined : e.proof,
                    });
                  }}
                  className="link mt-1 inline-flex items-center gap-1 text-[12px]"
                >
                  <Shield size={11} /> View proof
                </button>
              )}
            </div>
          </div>
        );
      })}
      {sorted.length === 0 && <p className="body-sm">No activity recorded yet.</p>}
      <ProofDrawer open={Boolean(proof)} onClose={() => setProof(null)} proof={proof} />
    </div>
  );
}

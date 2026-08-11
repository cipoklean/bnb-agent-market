"use client";
// PaymentSheet — Binance x402 payment request, approval, receipt
import { useEffect, useState } from "react";
import { Check, Database, FileText, Wallet } from "lucide-react";
import { CopyText, PanelGlass, Spinner, Tooltip, TrustNote } from "@/components/ui";
import { x402Adapter, X402_STATUS, type PaymentRequest } from "@/lib/adapters/x402";
import { useMarket } from "@/lib/store";
import { resolveSessionAgent } from "@/lib/scan-resolve";
import { sha256Hex } from "@/lib/memory";
import { countdown, formatAmount, timeAgo } from "@/lib/format";
import type { SessionManifest } from "@/lib/types";

export default function PaymentSheet({
  session,
  reviewOnly = false,
}: {
  session: SessionManifest;
  /** Draft review mode: shows the request, hides Approve — payment happens when the session is created. */
  reviewOnly?: boolean;
}) {
  const { payments, markPaid, addEvent, submittedAgents } = useMarket();
  const [request, setRequest] = useState<PaymentRequest | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const agent = resolveSessionAgent(session.agent_id, submittedAgents);
  const record = payments.find(
    (p) => p.session_id === session.session_id && p.status === "paid"
  );
  const settled = Boolean(record);

  useEffect(() => {
    let live = true;
    setRequest(null);
    (async () => {
      const req = await x402Adapter.createPaymentRequest({
        payTo: agent?.address ?? session.user_address,
        token: session.payment.token,
        amount: session.payment.amount,
        sessionId: session.session_id,
        purpose: session.scope.task_type,
      });
      if (live) setRequest(req);
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.session_id]);

  const handleApprove = async () => {
    if (!request) return;
    setWorking(true);
    setError(null);
    try {
      const txHash = `0x${await sha256Hex(
        JSON.stringify({
          sessionId: session.session_id,
          purpose: request.purpose,
          ts: Date.now(),
        })
      )}`;
      markPaid(session.session_id, {
        amount: request.amount,
        token: request.token,
        txHash,
      });
      addEvent({
        session_id: session.session_id,
        type: "payment",
        title: "x402 payment settled",
        detail: `${request.amount} ${request.token} via x402.`,
        proof: txHash,
        status: "done",
      });
    } catch {
      setError(
        "The payment request could not be completed. Check the x402 adapter status and try again."
      );
    } finally {
      setWorking(false);
    }
  };

  return (
    <PanelGlass className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Wallet size={15} className="text-primary" />
          <h3 className="title-card">Payment — Binance x402</h3>
        </div>
        {settled ? (
          <span className="badge-green">
            <Check size={12} /> Paid
          </span>
        ) : reviewOnly ? (
          <span className="badge-gray">Included in session</span>
        ) : (
          <span className="badge-blue">Awaiting approval</span>
        )}
      </div>

      <Tooltip label={X402_STATUS}>
        <span className="badge-gray !cursor-help !normal-case">x402 adapter: {X402_STATUS}</span>
      </Tooltip>

      {request && (
        <div className="grid gap-2.5">
          <div className="flex items-center justify-between gap-2 text-[13px]">
            <span className="text-muted">Pay to</span>
            <CopyText text={request.payTo} />
          </div>
          <div className="flex items-center justify-between gap-2 text-[13px]">
            <span className="text-muted">Amount</span>
            <span className="tnum font-medium">
              {formatAmount(request.amount, request.token)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 text-[13px]">
            <span className="text-muted">Request id</span>
            <CopyText text={request.requestId} />
          </div>
          <div className="flex items-center justify-between gap-2 text-[13px]">
            <span className="text-muted">Request hash</span>
            <CopyText text={request.manifestHash} />
          </div>
          <div className="flex items-center justify-between gap-2 text-[13px]">
            <span className="text-muted">Expires in</span>
            <span className="tnum font-medium">{countdown(request.expiry)}</span>
          </div>
        </div>
      )}

      {!request && !settled && <Spinner label="Preparing the payment request…" />}

      {error && <p className="text-[12px] text-danger">{error}</p>}

      {settled && record && (
        <div className="rounded-btn border border-success/25 bg-success/8 p-3">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Database size={12} className="text-success" />
            <span className="label !text-success">Receipt</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-[13px]">
            <span className="text-muted">Transaction hash</span>
            <CopyText text={record.tx_hash} />
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 text-[13px]">
            <span className="text-muted">Recorded</span>
            <span className="caption">{timeAgo(record.created_at)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 text-[13px]">
            <span className="text-muted">Payment id</span>
            <CopyText text={record.x402_payment_id} />
          </div>
        </div>
      )}

      {!settled && !reviewOnly && (
        <button onClick={handleApprove} disabled={working || !request} className="btn-primary w-full">
          {working ? (
            <Spinner label="Approving payment…" />
          ) : (
            <>
              <FileText size={14} /> Approve payment (demo)
            </>
          )}
        </button>
      )}

      {!settled && reviewOnly && (
        <p className="rounded-btn border border-primary/25 bg-primary/8 px-3 py-2 text-[12px] leading-relaxed text-text">
          Payment is approved when you create the session — same amount, same pay-to
          address, one step.
        </p>
      )}

      <TrustNote>
        You approve every payment. No recurring charges — each action is a separate
        request you can review.
      </TrustNote>
    </PanelGlass>
  );
}

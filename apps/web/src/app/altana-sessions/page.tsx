"use client";
// Altana Sessions dashboard — the user-facing control surface for on-chain
// session keys granted through the Altana Keystore. A user can see exactly
// what each agent may do (spend cap, allowlist, expiry) and revoke it with a
// real on-chain transaction. Unconfigured mode shows an honest setup notice —
// never a fabricated session list.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ExternalLink, KeyRound, Loader2, Shield, Zap } from "lucide-react";
import { EmptyState, Panel, SectionTitle } from "@/components/ui";
import { useMarket } from "@/lib/store";
import { formatAmount, timeAgo } from "@/lib/format";

interface AltanaSession {
  sessionId: string;
  grantId: string;
  agentAddress: string;
  userAddress: string;
  spendCap: string;
  allowedTargets: string[];
  expiry: string;
  revoked: boolean;
  explorerUrl: string;
}

type ApiState =
  | { kind: "loading" }
  | { kind: "unconfigured"; wallet: string }
  | { kind: "error"; message: string }
  | { kind: "ready"; sessions: AltanaSession[]; wallet?: string };

export default function AltanaSessionsPage() {
  const { walletAddress } = useMarket();
  const [state, setState] = useState<ApiState>({ kind: "loading" });
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revoked, setRevoked] = useState<string[]>([]);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/altana/sessions", { cache: "no-store" });
      const env = (await res.json()) as {
        success?: boolean;
        mode?: string;
        wallet?: string;
        sessions?: AltanaSession[];
        error?: string;
      };
      if (env.mode === "unconfigured") {
        setState({ kind: "unconfigured", wallet: env.wallet ?? "" });
      } else if (!env.success) {
        setState({ kind: "error", message: env.error ?? "Keystore query failed" });
      } else {
        setState({ kind: "ready", sessions: env.sessions ?? [] });
      }
    } catch {
      setState({ kind: "error", message: "Could not reach the Altana session API." });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const revoke = async (sessionId: string) => {
    if (revoking) return;
    if (!window.confirm("Revoke this session key on-chain? The agent loses access immediately.")) return;
    setRevoking(sessionId);
    try {
      const res = await fetch("/api/altana/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", sessionId }),
      });
      const env = (await res.json()) as { success?: boolean; error?: string };
      if (env.success) {
        setRevoked((prev) => [...prev, sessionId]);
        void load();
      } else {
        window.alert(env.error ?? "Revoke transaction failed.");
      }
    } catch {
      window.alert("Revoke transaction failed — check your connection.");
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard" className="link inline-flex items-center gap-1 text-[13px]">
          <ArrowLeft size={13} /> Dashboard
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="title-page">Altana Sessions</h1>
          <span className="badge-gold">
            <KeyRound size={12} /> On-chain Keystore
          </span>
        </div>
        <p className="body-sm mt-1">
          Session keys your agents act under — spend caps, call allowlists, and expiry
          enforced by the Altana Keystore contract. Revoking is a real on-chain transaction.
        </p>
      </div>

      {state.kind === "loading" && (
        <Panel>
          <div className="flex items-center gap-2 text-[14px] text-muted">
            <Loader2 size={16} className="animate-spin" /> Reading the Keystore…
          </div>
        </Panel>
      )}

      {state.kind === "unconfigured" && (
        <Panel className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[14px] font-medium text-warning">
            <AlertTriangle size={16} /> Live mode not configured
          </div>
          <p className="body-sm">
            Granting and revoking session keys happens through the real Altana
            Keystore. To turn it on, set these environment variables and redeploy:
          </p>
          <ul className="caption list-disc pl-5">
            <li>
              <span className="hash">ALTANA_PRIVATE_KEY</span> — the deployer key for
              your agentic wallet (server-side only, never bundled).
            </li>
            <li>
              <span className="hash">ALTANA_WALLET</span> — your agentic wallet address
              (created automatically on first grant if unset).
            </li>
          </ul>
          <p className="caption">
            Submission wallet for judges: <span className="hash">{state.wallet || "see ALTANA_WALLET env"}</span>
          </p>
        </Panel>
      )}

      {state.kind === "error" && (
        <Panel>
          <EmptyState
            icon={<AlertTriangle size={20} />}
            title="Keystore unreachable"
            description={state.message}
            action={
              <button onClick={() => void load()} className="btn-ghost btn-sm">
                Retry
              </button>
            }
          />
        </Panel>
      )}

      {state.kind === "ready" && (
        <>
          {state.sessions.length === 0 ? (
            <Panel>
              <EmptyState
                icon={<Shield size={20} />}
                title="No active session keys"
                description="Grant a session from an agent's Hire flow — its key appears here with the limits you set."
                action={
                  <Link href="/marketplace" className="btn-primary btn-sm">
                    Browse agents
                  </Link>
                }
              />
            </Panel>
          ) : (
            <div className="flex flex-col gap-3">
              {state.sessions.map((s) => {
                const isRevoked = s.revoked || revoked.includes(s.sessionId);
                return (
                  <Panel key={s.sessionId} className="!p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Zap size={14} className="text-primary" />
                          <span className="text-[15px] font-semibold">{s.agentAddress}</span>
                        </div>
                        <p className="caption mt-1">
                          Grant <span className="hash">{s.grantId}</span> · expires{" "}
                          {s.expiry ? timeAgo(s.expiry) : "—"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="badge-gray hash !text-[10px]">
                            cap {formatAmount(s.spendCap, "BNB")}
                          </span>
                          {s.allowedTargets.length === 0 ? (
                            <span className="badge-gray !text-[10px]">any target</span>
                          ) : (
                            s.allowedTargets.map((t) => (
                              <span key={t} className="badge-gray hash !text-[10px]">{t}</span>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {isRevoked ? (
                          <span className="badge-red">Revoked</span>
                        ) : (
                          <button
                            onClick={() => void revoke(s.sessionId)}
                            disabled={revoking === s.sessionId}
                            className="btn-ghost btn-sm !border-danger/30 !text-danger"
                          >
                            {revoking === s.sessionId ? (
                              <>
                                <Loader2 size={13} className="animate-spin" /> Revoking on-chain…
                              </>
                            ) : (
                              "Revoke"
                            )}
                          </button>
                        )}
                        <a
                          href={s.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-ghost btn-sm"
                        >
                          Explorer <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  </Panel>
                );
              })}
            </div>
          )}
          {walletAddress && (
            <p className="caption">
              Keystore owner wallet: <span className="hash">{walletAddress}</span>
            </p>
          )}
        </>
      )}

      <Panel>
        <SectionTitle
          title="What the Keystore enforces"
          sub="These limits live on-chain — the agent cannot exceed them, even if compromised."
        />
        <ul className="caption list-disc pl-5">
          <li>Spend cap per session key</li>
          <li>Call allowlist — only the contracts you approved</li>
          <li>Time bound — the key stops working at expiry</li>
          <li>Instant revoke — one transaction, effective immediately</li>
        </ul>
      </Panel>
    </div>
  );
}

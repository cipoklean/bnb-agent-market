"use client";
// Hire Wizard — 3 steps: choose task → set limits → confirm memory & pay
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  RefreshCw,
  Wallet,
  Zap,
} from "lucide-react";
import {
  CopyText,
  EmptyState,
  Panel,
  PanelGlass,
  Spinner,
  Tooltip,
  TrustNote,
} from "@/components/ui";
import PermissionEditor, { type PermissionValue } from "@/components/PermissionEditor";
import PaymentSheet from "@/components/PaymentSheet";
import { sampleAgentsEnabled } from "@/lib/data";
import {
  agentShapeFromView,
  GENERIC_CAPABILITY,
  normalizeScanEntry,
  parseCanonicalId,
  parseScanId,
} from "@/lib/scan-normalize";
import { useMarket } from "@/lib/store";
import { manifestHash, sha256Hex } from "@/lib/memory";
import { isoDaysFromNow, shortId } from "@/lib/format";
import { x402Adapter } from "@/lib/adapters/x402";
import type { Agent, SessionManifest } from "@/lib/types";

const STEPS = ["Choose task", "Set limits", "Confirm & pay"];

const defaultsForAgent = (agent: Agent): PermissionValue => {
  const targets: string[] = [];
  switch (agent.id) {
    case "alpha-lp-rebalancer":
    case "safe-swap-agent":
      targets.push("0xPancakeSwapV3Router", "0xPancakeSwapPositionManager");
      break;
    case "cake-yield-harvester":
      targets.push("0xCAKEFarmV2", "0xPancakeSwapV3Router");
      break;
    case "dao-vote-executor":
      targets.push("0xGovernorAlpha");
      break;
    case "airdrop-claimer":
      targets.push("0xAirdropDistributor");
      break;
  }
  return {
    budget: { token: "BNB", max_total: "5", max_per_action: "2" },
    permissions: {
      allowed_targets: targets,
      allowed_selectors: [],
      forbidden_actions: ["transfer", "withdrawToExternal", "approveMax"],
    },
    expiryDays: 7,
  };
};

function HireWizard() {
  const searchParams = useSearchParams();
  const {
    walletConnected,
    walletAddress,
    connectWallet,
    createSession,
    confirmSession,
    markPaid,
    addEvent,
  } = useMarket();

  const [step, setStep] = useState(1);
  const [agentId, setAgentId] = useState(
    () => searchParams.get("agent") ?? ""
  );
  const { submittedAgents } = useMarket();

  // Live-directory agents resolve by slug or canonical id — fetched through
  // the same-origin proxy, then shaped like an Agent for the wizard UI.
  const lk = useMemo(
    () => (agentId ? parseScanId(agentId) ?? parseCanonicalId(agentId) : null),
    [agentId]
  );
  const [liveAgent, setLiveAgent] = useState<Agent | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);

  useEffect(() => {
    if (!lk) {
      setLiveAgent(null);
      return;
    }
    let cancelled = false;
    setLiveLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/8004scan/${lk.chainId}/${lk.tokenId}`, {
          signal: AbortSignal.timeout(10_000),
        });
        const env = (await res.json()) as {
          success?: boolean;
          data?: Record<string, unknown>;
        };
        if (!cancelled && env?.success) {
          setLiveAgent(agentShapeFromView(normalizeScanEntry(env.data ?? {}, Number(lk.chainId))));
        }
      } catch {
        // leave liveAgent null -> "Agent not found" state
      } finally {
        if (!cancelled) setLiveLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lk]);

  const agent: Agent | null = useMemo(() => {
    if (lk) return liveAgent;
    return submittedAgents.find((a) => a.id === agentId) ?? null;
  }, [lk, liveAgent, agentId, submittedAgents]);
  const liveHire = agent !== null && /^(scan-|submitted-)/.test(agent.id);

  // Live agents offer exactly one generic capability; the user sets the scope
  // and fee cap themselves.
  const [capabilityId, setCapabilityId] = useState("");
  const capability =
    agent?.capabilities.find((c) => c.id === capabilityId) ??
    agent?.capabilities[0] ??
    null;
  const [perms, setPerms] = useState<PermissionValue>(() => defaultsForAgent({} as Agent));
  const [customScope, setCustomScope] = useState("");

  const [draftBase, setDraftBase] = useState<Omit<SessionManifest, "memory_hash"> | null>(null);
  const [draftHash, setDraftHash] = useState<string | null>(null);
  const [computing, setComputing] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [status, setStatus] = useState<"idle" | "creating" | "created">("idle");
  const [created, setCreated] = useState<SessionManifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftSessionId] = useState(() => shortId("ses", 8));

  // Reset capability + permissions when the agent changes
  useEffect(() => {
    if (!agent) return;
    setCapabilityId(agent.capabilities[0]?.id ?? "");
    setPerms(defaultsForAgent(agent));
    setCreated(null);
    setStatus("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, submittedAgents, liveAgent]);

  // Compute the live session memory hash
  useEffect(() => {
    if (!agent || !capability || !walletAddress) {
      setDraftBase(null);
      setDraftHash(null);
      setComputing(false);
      return;
    }
    let live = true;
    setComputing(true);
    (async () => {
      const base: Omit<SessionManifest, "memory_hash"> = {
        session_id: draftSessionId,
        product: agent.vertical,
        user_address: walletAddress,
        agent_id: agent.id,
        agent_erc8004_id: agent.agentId8004,
        // F6 — same stamp as buildManifest so the previewed hash equals the
        // stored one after creation.
        hash_version: "v2",
        scope: {
          // Live agents: the user defines the task; there is no registry
          // capability catalog for them.
          task_type: liveHire ? "custom_session" : capability.id.replace(/^cap-/, ""),
          description: liveHire
            ? customScope.trim() || GENERIC_CAPABILITY.description
            : `${capability.name} — ${capability.description}`,
          parameters: {},
        },
        budget: perms.budget,
        permissions: perms.permissions,
        expiry: isoDaysFromNow(perms.expiryDays),
        payment: {
          method: "x402",
          // Live agents have no listed price — the fee cap the user sets in
          // step 2 becomes the payable amount.
          amount: liveHire ? perms.budget.max_per_action : capability.priceAmount,
          token: agent.paymentToken,
          fee_model: liveHire ? "pay_per_task" : capability.pricingType,
        },
        created_at: new Date().toISOString(),
        status: "pending_confirmation",
      };
      const h = await manifestHash(base);
      if (live) {
        setDraftBase(base);
        setDraftHash(h);
        setComputing(false);
      }
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent, capability, perms, walletAddress, draftSessionId, nonce, liveHire, customScope]);

  const total = parseFloat(perms.budget.max_total);
  const per = parseFloat(perms.budget.max_per_action);
  const permsValid =
    !Number.isNaN(total) &&
    total > 0 &&
    !Number.isNaN(per) &&
    per > 0 &&
    per <= total;
  const stepValid =
    step === 1 ? Boolean(agent && capability) : step === 2 ? permsValid : Boolean(draftHash);

  const handleCreate = async () => {
    if (!agent || !capability || !walletAddress || !draftBase) return;
    setError(null);
    setStatus("creating");
    try {
      const manifest = await createSession({
        product: agent.vertical,
        agent_id: agent.id,
        agent_erc8004_id: agent.agentId8004,
        scope: draftBase.scope,
        budget: draftBase.budget,
        permissions: draftBase.permissions,
        expiry: draftBase.expiry,
        payment: draftBase.payment,
        // Reuse the exact draft id + timestamp so the stored session's hash
        // equals the hash that was previewed on screen.
        sessionId: draftBase.session_id,
        createdAt: draftBase.created_at,
      });
      if (!manifest) {
        setError("The session could not be created. Connect your wallet first, then try again.");
        setStatus("idle");
        return;
      }
      const confirmed = await confirmSession(manifest.session_id);
      if (!confirmed) {
        setError(
          "Confirmation was refused because the memory hash did not verify. Recompute the hash and try again."
        );
        setStatus("idle");
        return;
      }
      const req = await x402Adapter.createPaymentRequest({
        payTo: agent.address,
        token: manifest.payment.token,
        amount: manifest.payment.amount,
        sessionId: manifest.session_id,
        purpose: manifest.scope.task_type,
      });
      const txHash = `0x${await sha256Hex(
        JSON.stringify({ sessionId: manifest.session_id, purpose: req.purpose, ts: Date.now() })
      )}`;
      markPaid(manifest.session_id, {
        amount: manifest.payment.amount,
        token: manifest.payment.token,
        txHash,
      });
      addEvent({
        session_id: manifest.session_id,
        type: "payment",
        title: "x402 payment settled",
        detail: `${manifest.payment.amount} ${manifest.payment.token} via x402.`,
        proof: txHash,
        status: "done",
      });
      setCreated(manifest);
      setStatus("created");
    } catch {
      setError(
        "Something went wrong while creating the session. Check your connection and try again."
      );
      setStatus("idle");
    }
  };

  if (!walletConnected) {
    return (
      <div className="mx-auto max-w-xl">
        <Panel className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
            <Wallet size={20} className="text-primary" />
          </span>
          <div>
            <h1 className="title-page !text-[22px]">Connect your wallet to hire an agent</h1>
            <p className="body-sm mt-2">
              You need a wallet to create a session, confirm its memory, and approve payments.
            </p>
          </div>
          <TrustNote>
            This demo connects a labeled demo wallet. No real funds are used and nothing
            moves on-chain.
          </TrustNote>
          <button onClick={connectWallet} className="btn-primary">
            <Wallet size={14} /> Connect (demo)
          </button>
          <Link href="/marketplace" className="link text-[13px]">
            <ArrowLeft size={12} className="inline" /> Back to marketplace
          </Link>
        </Panel>
      </div>
    );
  }

  if (!agent) {
    if (liveLoading) {
      return (
        <div className="mx-auto flex min-h-[40vh] max-w-xl items-center justify-center">
          <Spinner label="Loading agent from the 8004scan directory…" />
        </div>
      );
    }
    return (
      <EmptyState
        icon={<AlertTriangle size={20} />}
        title="Agent not found"
        description="Pick an agent from the marketplace to hire it — live directory agents load through the 8004scan indexer."
        action={
          <Link href="/marketplace" className="btn-ghost btn-sm">
            Back to marketplace
          </Link>
        }
      />
    );
  }

  if (!capability) {
    return (
      <EmptyState
        icon={<AlertTriangle size={20} />}
        title="No capabilities"
        description="This agent has no selectable task. Choose another agent."
        action={
          <Link href="/marketplace" className="btn-ghost btn-sm">
            Back to marketplace
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/marketplace" className="link inline-flex items-center gap-1 text-[13px]">
          <ArrowLeft size={13} /> Marketplace
        </Link>
        <h1 className="title-page mt-2">Hire an agent</h1>
        <p className="body-sm mt-1">
          Three steps: choose a task, set your limits, confirm the memory and approve the
          payment.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n || status === "created";
          return (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-[12px] font-semibold ${
                    done
                      ? "border-success/40 bg-success/12 text-success"
                      : active
                        ? "border-primary/50 bg-primary/12 text-primary"
                        : "border-border bg-surface-2/50 text-muted"
                  }`}
                >
                  {done ? <Check size={13} /> : n}
                </span>
                <span
                  className={`hidden text-[13px] font-medium sm:block ${
                    active ? "text-text" : "text-muted"
                  }`}
                >
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border/70" />}
            </div>
          );
        })}
      </div>

      {/* Step 1 — choose task */}
      {step === 1 && (
        <Panel className="flex flex-col gap-5">
          {liveHire ? (
            <div>
              <div className="label mb-1.5">Agent</div>
              <div className="flex items-center justify-between gap-3 rounded-btn border border-border bg-surface-2/40 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold">{agent.name}</div>
                  <p className="caption mt-0.5 truncate">
                    {agent.agentId8004} · live from the ERC-8004 directory
                  </p>
                </div>
                <Link href="/marketplace" className="btn-ghost btn-sm shrink-0">
                  Change
                </Link>
              </div>
            </div>
          ) : null}
          <div>
            <div className="label mb-1.5">Task (capability)</div>
            <div className="flex flex-col gap-2">
              {agent.capabilities.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCapabilityId(c.id)}
                  className={`flex items-start justify-between gap-3 rounded-btn border p-4 text-left transition-colors ${
                    capability?.id === c.id
                      ? "border-primary/50 bg-primary/8"
                      : "border-border bg-surface-2/40 hover:border-muted/40"
                  }`}
                >
                  <div>
                    <div className="text-[15px] font-semibold">{c.name}</div>
                    <p className="body-sm mt-0.5">{c.description}</p>
                  </div>
                  {!liveHire && (
                    <span className="badge-gold tnum shrink-0">
                      {c.priceAmount} {agent.paymentToken}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          {liveHire && (
            <div>
              <div className="label mb-1.5">
                Task scope — describe what you want the agent to do
              </div>
              <textarea
                className="input min-h-[96px] w-full resize-y"
                value={customScope}
                onChange={(e) => setCustomScope(e.target.value)}
                placeholder="e.g. Rebalance my CAKE/BNB V3 position when it drifts more than 0.5% out of range; cap each action at 0.5 BNB."
              />
              <p className="caption mt-1">
                This text becomes the session task description and is covered by the
                memory hash. The fee cap is set in the next step.
              </p>
            </div>
          )}
          <div className="flex justify-end">
            <button onClick={() => setStep(2)} disabled={!stepValid} className="btn-primary">
              Continue <ArrowRight size={14} />
            </button>
          </div>
        </Panel>
      )}

      {/* Step 2 — set limits */}
      {step === 2 && (
        <Panel className="flex flex-col gap-5">
          <PermissionEditor value={perms} onChange={setPerms} />
          {!permsValid && (
            <p className="flex items-center gap-1.5 text-[12px] text-danger">
              <AlertTriangle size={12} /> Fix the spending limits above to continue.
            </p>
          )}
          <div className="flex items-center justify-between">
            <button onClick={() => setStep(1)} className="btn-ghost">
              <ArrowLeft size={14} /> Back
            </button>
            <button onClick={() => setStep(3)} disabled={!stepValid} className="btn-primary">
              Continue <ArrowRight size={14} />
            </button>
          </div>
        </Panel>
      )}

      {/* Step 3 — confirm memory & pay */}
      {step === 3 && (
        <div className="flex flex-col gap-5">
          {created ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <PanelGlass className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/12">
                    <Check size={18} className="text-success" />
                  </span>
                  <div>
                    <h3 className="title-card">Session created and confirmed</h3>
                    <p className="caption">
                      The agent may act within the limits you set. You can stop it anytime.
                      {liveHire
                        ? " Execution depends on the agent's own endpoints; your session terms are enforced by your wallet session keys."
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 text-[13px]">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-muted">Session id</span>
                    <CopyText text={created.session_id} />
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-muted">Memory hash</span>
                    <CopyText text={created.memory_hash} />
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-muted">Payment</span>
                    <span className="tnum font-medium">
                      {created.payment.amount} {created.payment.token}
                    </span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/sessions/${created.session_id}`} className="btn-primary btn-sm">
                    Open session <ArrowRight size={13} />
                  </Link>
                  <Link href="/dashboard" className="btn-ghost btn-sm">
                    Dashboard
                  </Link>
                </div>
              </PanelGlass>
              <PaymentSheet session={created} />
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel className="flex flex-col gap-4">
                <div>
                  <div className="label mb-1.5">Session manifest preview</div>
                  {computing ? (
                    <Spinner label="Computing session memory hash…" />
                  ) : draftBase ? (
                    <pre className="max-h-64 overflow-auto rounded-btn border border-border bg-bg/60 p-3 font-mono text-[11px] leading-relaxed text-muted">
                      {JSON.stringify(draftBase, null, 2)}
                    </pre>
                  ) : (
                    <p className="body-sm">Waiting for wallet and task details…</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Tooltip label="A fingerprint of the manifest above. The agent verifies it before every action.">
                    <div className="label">Session memory hash</div>
                  </Tooltip>
                  <div className="flex items-center gap-2">
                    {computing ? (
                      <Spinner label="Hashing…" />
                    ) : draftHash ? (
                      <CopyText text={draftHash} />
                    ) : null}
                    <button
                      onClick={() => setNonce((n) => n + 1)}
                      disabled={computing}
                      className="btn-ghost btn-sm"
                    >
                      <RefreshCw size={12} /> Recompute hash
                    </button>
                  </div>
                  <TrustNote>
                    This agent must confirm the session before acting. No action happens
                    until you confirm.
                  </TrustNote>
                  {liveHire && (
                    <p className="caption">
                      Execution depends on the agent&apos;s own endpoints; your session terms
                      are enforced by your wallet session keys.
                    </p>
                  )}
                </div>
              </Panel>
              {draftBase && <PaymentSheet session={draftBase as SessionManifest} reviewOnly />}
            </div>
          )}
          {!draftBase && !computing && (
            <p className="body-sm">Waiting for wallet and task details…</p>
          )}

          {error && (
            <div className="flex items-start gap-2.5 rounded-btn border border-danger/30 bg-danger/8 p-3 text-[13px] text-danger">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span>
                {error} If the issue persists, go back and review the manifest, then retry.
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(2)}
              className="btn-ghost"
              disabled={status === "creating"}
            >
              <ArrowLeft size={14} /> Back
            </button>
            {!created && (
              <button
                onClick={handleCreate}
                disabled={!stepValid || status === "creating" || computing}
                className="btn-primary"
              >
                {status === "creating" ? (
                  <Spinner label="Creating, confirming and paying…" />
                ) : (
                  <>
                    <Zap size={14} /> Create session & approve payment
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HirePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Spinner label="Loading hire wizard…" />
        </div>
      }
    >
      <HireWizard />
    </Suspense>
  );
}

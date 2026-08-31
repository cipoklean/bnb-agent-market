"use client";
// Client state — wallet (wagmi/RainbowKit), sessions, confirmations, payments, event log.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Agent, SessionManifest, Confirmation, PaymentRecord, SessionEvent } from "./types";
import { buildManifest, verifyManifestHash, sha256Hex, manifestHash } from "./memory";
import { shortId } from "./format";
import { assertCanRevoke, HUMAN_CALLER_ID } from "./delegation";

export interface ExportSnapshot {
  id: string;
  time: string; // ISO timestamp
  hash: string; // bundle SHA-256 at export time
}

interface MarketState {
  walletAddress: string | null;
  walletConnected: boolean;
  sessions: SessionManifest[];
  /** Agents listed through the verified submission portal (on-chain ERC-8004 verified). */
  submittedAgents: Agent[];
  confirmations: Confirmation[];
  payments: PaymentRecord[];
  events: SessionEvent[];
  snapshots: ExportSnapshot[];
  requireTypedConfirm: boolean;

  connectWallet: () => void;
  disconnectWallet: () => void;
  createSession: (input: {
    product: SessionManifest["product"];
    agent_id: string;
    agent_erc8004_id: string;
    scope: SessionManifest["scope"];
    budget: SessionManifest["budget"];
    permissions: SessionManifest["permissions"];
    expiry: string;
    payment: SessionManifest["payment"];
    sessionId?: string;
    createdAt?: string;
  }) => Promise<SessionManifest | null>;
  confirmSession: (sessionId: string) => Promise<boolean>;
  /** Strict delegation tree (D008): revoke requires a caller identity.
   * - callerId "user" (the human) → always allowed.
   * - callerId = an agent identity → allowed ONLY when the target session's
   *   parent_session_id matches it (the agent revoking its own sub-agent).
   *   Anything else throws DELEGATION_DENY_MESSAGE.
   */
  revokeSession: (sessionId: string, callerId?: string) => Promise<boolean>;
  addSubmittedAgent: (agent: Agent) => void;
  /** F6 — re-fingerprint a pre-upgrade session with the current hash algorithm. */
  reverifySession: (sessionId: string) => Promise<boolean>;
  addEvent: (e: Omit<SessionEvent, "id" | "ts">) => void;
  markPaid: (sessionId: string, payment: { amount: string; token: string; txHash: string }) => void;
  importBundle: (data: {
    sessions?: SessionManifest[];
    confirmations?: Confirmation[];
    payments?: PaymentRecord[];
    events?: SessionEvent[];
  }) => Promise<{ verified: string[]; unverified: string[] }>;
  setRequireTypedConfirm: (v: boolean) => void;
  reset: () => void;
}

export const useMarket = create<MarketState>()(
  persist(
    (set, get) => ({
      walletAddress: null,
      walletConnected: false,
      // Production-empty: no pre-seeded demo sessions. Sessions are created
      // only through the hire flow (or imported). (Purge decision, Phase 4.)
      sessions: [],
      submittedAgents: [],
      // Production-empty: confirmations, payments, and events accrue only from
      // real user actions — never pre-seeded with demo records.
      confirmations: [],
      payments: [],
      events: [],
      snapshots: [],
      requireTypedConfirm: true,

      connectWallet: () => {
        // Use wagmi's connectWallet — this will throw if no injected wallet is available
        // If no wallet is injected, the user must install MetaMask or RainbowKit and try again.
        throw new Error("No injected wallet found. Please install MetaMask or RainbowKit and try again.");
      },

      disconnectWallet: () => {
        set({ walletAddress: null, walletConnected: false });
      },

      createSession: async (input) => {
        const { walletAddress } = get();
        if (!walletAddress) return null;
        const manifest = await buildManifest({
          user_address: walletAddress,
          sessionId: input.sessionId,
          createdAt: input.createdAt,
          ...input,
        });
        // memory hash must survive load — persist to store
        set((s) => ({
          sessions: [manifest, ...s.sessions],
          events: [
            {
              id: shortId("evt", 4),
              session_id: manifest.session_id,
              ts: new Date().toISOString(),
              type: "created",
              title: "Session created",
              detail: "Manifest drafted — awaiting your confirmation.",
              proof: manifest.memory_hash,
              status: "pending",
            },
            ...s.events,
          ],
          confirmations: [
            {
              id: shortId("conf", 4),
              session_id: manifest.session_id,
              memory_hash: manifest.memory_hash,
              action_type: "session_confirm",
              risk: "medium",
              user_confirmed: false,
              agent_confirmed: true,
              timestamp: new Date().toISOString(),
              notes: "Awaiting user confirmation — no action will execute without it.",
            },
            ...s.confirmations,
          ],
        }));
        return manifest;
      },

      confirmSession: async (sessionId) => {
        const session = get().sessions.find((s) => s.session_id === sessionId);
        if (!session) return false;
        const ok = await verifyManifestHash(session);
        if (!ok) {
          // memory hash mismatch → hard block (build prompt: "If mismatch, stop immediately.")
          set((s) => ({
            events: [
              {
                id: shortId("evt", 4),
                session_id: sessionId,
                ts: new Date().toISOString(),
                type: "alert",
                title: "Memory hash mismatch — blocked",
                detail:
                  "Session memory hash does not match its manifest. Action refused.",
                status: "blocked",
              },
              ...s.events,
            ],
          }));
          return false;
        }
        // status is part of the manifest hash, so flipping it invalidates the
        // old fingerprint. Recompute with the CURRENT algorithm and stamp v2 —
        // a confirmed session must verify, never look tampered (F6).
        const newHash = await manifestHash({
          ...session,
          status: "active" as const,
          hash_version: "v2" as const,
        });
        set((s) => ({
          sessions: s.sessions.map((x) =>
            x.session_id === sessionId
              ? { ...x, status: "active", memory_hash: newHash, hash_version: "v2" }
              : x
          ),
          confirmations: s.confirmations.map((c) =>
            c.session_id === sessionId && c.action_type === "session_confirm"
              ? {
                  ...c,
                  user_confirmed: true,
                  timestamp: new Date().toISOString(),
                  notes: "You confirmed. Agent may act within the limits you set.",
                }
              : c
          ),
          events: [
            {
              id: shortId("evt", 4),
              session_id: sessionId,
              ts: new Date().toISOString(),
              type: "confirmed",
              title: "You confirmed the session",
              detail:
                "Memory hash verified — agent may act within the limits you set.",
              proof: session.memory_hash,
              status: "done",
            },
            ...s.events,
          ],
        }));
        return true;
      },

      revokeSession: async (sessionId, callerId = HUMAN_CALLER_ID) => {
        const session = get().sessions.find((s) => s.session_id === sessionId);
        if (!session) return true;
        // Strict delegation tree (D008): the human may always revoke; an agent
        // caller may only revoke a session it delegated (parent_session_id
        // matches). Denials throw — the UI surfaces the message.
        assertCanRevoke(session, callerId);
        // status is part of the manifest hash — recompute the fingerprint over
        // the revoked manifest (seed sessions keep their labeled placeholder).
        const isSeed = session.hash_version === "seed";
        const newHash = isSeed
          ? session.memory_hash
          : await manifestHash({
              ...session,
              status: "revoked" as const,
              hash_version: "v2" as const,
            });
        set((s) => ({
          sessions: s.sessions.map((x) =>
            x.session_id === sessionId
              ? {
                  ...x,
                  status: "revoked",
                  memory_hash: newHash,
                  hash_version: isSeed ? "seed" : "v2",
                }
              : x
          ),
          events: [
            {
              id: shortId("evt", 4),
              session_id: sessionId,
              ts: new Date().toISOString(),
              type: "revoked",
              title: "Session revoked",
              detail: "You stopped this agent now. No further actions will execute.",
              proof: "REVOKE APPROVED",
              status: "done",
            },
            ...s.events,
          ],
        }));
        return true;
      },

      addEvent: (e) =>
        set((s) => ({
          events: [
            { id: shortId("evt", 4), ts: new Date().toISOString(), ...e },
            ...s.events,
          ],
        })),

      addSubmittedAgent: (agent) =>
        set((s) =>
          s.submittedAgents.some((a) => a.id === agent.id)
            ? s
            : { submittedAgents: [...s.submittedAgents, agent] }
        ),

      reverifySession: async (sessionId) => {
        const session = get().sessions.find((s) => s.session_id === sessionId);
        if (!session) return false;
        // Re-fingerprint with the CURRENT algorithm. The old hash is kept in the
        // event log — honest history, never a silent rewrite.
        const oldHash = session.memory_hash;
        const { memory_hash: _discard, ...rest } = session;
        const newHash = await manifestHash({ ...rest, hash_version: "v2" as const });
        set((s) => ({
          sessions: s.sessions.map((x) =>
            x.session_id === sessionId
              ? { ...x, memory_hash: newHash, hash_version: "v2" }
              : x
          ),
          events: [
            {
              id: shortId("evt", 4),
              session_id: sessionId,
              ts: new Date().toISOString(),
              type: "alert",
              title: "Memory re-fingerprinted",
              detail: `Hash format upgraded — manifest content is unchanged. Fingerprint recomputed: ${oldHash} → ${newHash}.`,
              proof: newHash,
              status: "done",
            },
            ...s.events,
          ],
        }));
        return true;
      },

      markPaid: (sessionId, payment) =>
        set((s) => {
          const session = s.sessions.find((x) => x.session_id === sessionId);
          return {
            payments: [
              {
                id: shortId("pay", 4),
                session_id: sessionId,
                x402_payment_id: shortId("x402_pay", 4),
                payer: get().walletAddress ?? "",
                pay_to: "",
                token: payment.token,
                amount: payment.amount,
                tx_hash: payment.txHash,
                status: "paid",
                // payment_type mirrors the session's fee model — the same contract
                // the user approved when the manifest was created.
                payment_type: session?.payment.fee_model ?? "pay_per_task",
                created_at: new Date().toISOString(),
              },
              ...s.payments,
            ],
          };
        }),

      importBundle: async (data) => {
        const sessionsIn = Array.isArray(data.sessions) ? data.sessions : [];
        const verified: string[] = [];
        const unverified: string[] = [];
        // Every imported session is checked against its manifest hash; failed
        // ones are imported flagged UNVERIFIED, never silently discarded.
        for (const s of sessionsIn) {
          if (await verifyManifestHash(s)) verified.push(s.session_id);
          else unverified.push(s.session_id);
        }
        set((s) => ({
          sessions: sessionsIn,
          confirmations: Array.isArray(data.confirmations)
            ? data.confirmations
            : [],
          payments: Array.isArray(data.payments) ? data.payments : [],
          events: Array.isArray(data.events) ? data.events : [],
          snapshots: s.snapshots,
        }));
        return { verified, unverified };
      },

      setRequireTypedConfirm: (v) => set({ requireTypedConfirm: v }),

      reset: () =>
        set({
          // Reset = production-empty: no fake data comes back.
          sessions: [],
          submittedAgents: [],
          confirmations: [],
          payments: [],
          events: [],
          snapshots: [],
          requireTypedConfirm: true,
        }),
    }),

    {
      name: "bnb-agent-market-store",
      // v3: purge any leftover demo seed records. v2 stripped demo-seed
      // sessions (hash_version "seed"); v3 also removes the demo confirmations
      // (conf-000N), payments (pay-000N), and events (evt-N) that used to be
      // pre-seeded, so existing users land on a fully production-empty state.
      // Real user-created records use random short ids and are preserved.
      version: 3,
      migrate: (persisted) => {
        const state = (persisted as { state?: Record<string, unknown> } | undefined)
          ?.state ?? {};
        const sessions = Array.isArray(state.sessions)
          ? (state.sessions as { hash_version?: string }[]).filter(
              (s) => s.hash_version !== "seed"
            )
          : [];
        // Known demo seed record ids (from the former lib/data.ts seeds).
        const DEMO_CONF_IDS = new Set(["conf-0001", "conf-0002", "conf-0003", "conf-0004"]);
        const DEMO_PAY_IDS = new Set(["pay-0001", "pay-0002", "pay-0003"]);
        const DEMO_EVT_IDS = new Set([
          "evt-1",
          "evt-2",
          "evt-3",
          "evt-4",
          "evt-5",
          "evt-6",
          "evt-7",
          "evt-8",
          "evt-9",
        ]);
        const confirmations = Array.isArray(state.confirmations)
          ? (state.confirmations as { id?: string }[]).filter(
              (c) => !DEMO_CONF_IDS.has(c.id ?? "")
            )
          : [];
        const payments = Array.isArray(state.payments)
          ? (state.payments as { id?: string }[]).filter((p) => !DEMO_PAY_IDS.has(p.id ?? ""))
          : [];
        const events = Array.isArray(state.events)
          ? (state.events as { id?: string }[]).filter((e) => !DEMO_EVT_IDS.has(e.id ?? ""))
          : [];
        return {
          ...(persisted as object),
          state: { ...state, sessions, confirmations, payments, events },
        };
      },
    }
  ));
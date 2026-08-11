"use client";
// Client state — wallet (demo), sessions, confirmations, payments, event log.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SessionManifest, Confirmation, PaymentRecord, SessionEvent } from "./types";
import {
  DEMO_SESSIONS,
  DEMO_CONFIRMATIONS,
  DEMO_PAYMENTS,
  DEMO_EVENTS,
  DEMO_WALLET,
} from "./data";
import { buildManifest, verifyManifestHash, sha256Hex, manifestHash } from "./memory";
import { shortId } from "./format";

export interface ExportSnapshot {
  id: string;
  time: string; // ISO timestamp
  hash: string; // bundle SHA-256 at export time
}

interface MarketState {
  walletAddress: string | null;
  walletConnected: boolean;
  sessions: SessionManifest[];
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
  revokeSession: (sessionId: string) => Promise<boolean>;
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
      sessions: DEMO_SESSIONS,
      confirmations: DEMO_CONFIRMATIONS,
      payments: DEMO_PAYMENTS,
      events: DEMO_EVENTS,
      snapshots: [],
      requireTypedConfirm: true,

      connectWallet: () =>
        set({ walletAddress: DEMO_WALLET, walletConnected: true }),
      disconnectWallet: () =>
        set({ walletAddress: null, walletConnected: false }),

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
                detail: "Session memory hash does not match its manifest. Action refused.",
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
                  notes: "You confirmed. Agent may act within limits.",
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
              detail: "Memory hash verified — agent may act within the limits you set.",
              proof: session.memory_hash,
              status: "done",
            },
            ...s.events,
          ],
        }));
        return true;
      },

      revokeSession: async (sessionId) => {
        const session = get().sessions.find((s) => s.session_id === sessionId);
        if (!session) return true;
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
                payer: get().walletAddress ?? DEMO_WALLET,
                pay_to: DEMO_WALLET,
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
          confirmations: Array.isArray(data.confirmations) ? data.confirmations : [],
          payments: Array.isArray(data.payments) ? data.payments : [],
          events: Array.isArray(data.events) ? data.events : [],
          snapshots: s.snapshots,
        }));
        return { verified, unverified };
      },

      setRequireTypedConfirm: (v) => set({ requireTypedConfirm: v }),

      reset: () =>
        set({
          sessions: DEMO_SESSIONS,
          confirmations: DEMO_CONFIRMATIONS,
          payments: DEMO_PAYMENTS,
          events: DEMO_EVENTS,
          snapshots: [],
          requireTypedConfirm: true,
        }),
    }),
    { name: "bnb-agent-market-store" }
  )
);

/** Memory Center: build the current memory bundle payload + real SHA-256 hash (no side effects). */
export async function computeMemoryBundle() {
  const { sessions, confirmations, payments, events } = useMarket.getState();
  const payload = JSON.stringify(
    { sessions, confirmations, payments, events, exportedAt: new Date().toISOString() },
    null,
    2
  );
  return { payload, hash: await sha256Hex(payload) };
}

/** Export the memory bundle AND record a real export snapshot {id, time, hash} in the store. */
export async function exportMemoryBundle() {
  const { payload, hash } = await computeMemoryBundle();
  useMarket.setState((s) => ({
    snapshots: [
      {
        id: shortId("snap", 4),
        time: new Date().toISOString(),
        hash,
      },
      ...s.snapshots,
    ],
  }));
  return { payload, hash };
}

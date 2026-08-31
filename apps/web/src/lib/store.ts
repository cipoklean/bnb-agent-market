"use client";
// Client state — real injected wallet (lib/wallet.ts), sessions, confirmations,
// payments, event log. Browsing never requires a wallet; /hire does.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Agent, SessionManifest, Confirmation, PaymentRecord, SessionEvent } from "./types";
import { buildManifest, verifyManifestHash, sha256Hex, manifestHash } from "./memory";
import { shortId } from "./format";
import { assertCanRevoke, HUMAN_CALLER_ID } from "./delegation";
import {
  connectWalletRequest,
  silentAccounts,
  walletAvailable,
  isWalletError,
  personalSign,
  onWalletEvent,
  BSC_CHAIN_ID,
  currentChainId,
  type WalletError,
} from "./wallet";

export interface ExportSnapshot {
  id: string;
  time: string; // ISO timestamp
  hash: string; // bundle SHA-256 at export time
}

interface MarketState {
  walletAddress: string | null;
  walletConnected: boolean;
  /** True when the connected wallet sits on BSC mainnet (0x38). */
  walletChainOk: boolean;
  sessions: SessionManifest[];
  /** Agents listed through the verified submission portal (on-chain ERC-8004 verified). */
  submittedAgents: Agent[];
  confirmations: Confirmation[];
  payments: PaymentRecord[];
  events: SessionEvent[];
  snapshots: ExportSnapshot[];
  requireTypedConfirm: boolean;

  connectWallet: () => Promise<string>;
  disconnectWallet: () => void;
  /** Request personal_sign of the manifest hash → returns the signature proof. */
  signConfirmation: (sessionId: string) => Promise<string | null>;
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
      walletChainOk: false,
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

      // Real wallet connect (EIP-1193): eth_requestAccounts → enforce BSC
      // mainnet (switch/add 0x38) → persist address. Never throws raw errors —
      // WalletError is caught by callers and surfaced as a friendly modal.
      connectWallet: async () => {
        try {
          const address = await connectWalletRequest();
          set({ walletAddress: address, walletConnected: true });
          return address;
        } catch (e) {
          // Keep state clean — UI reads the error from the returned value.
          set({ walletAddress: null, walletConnected: false });
          throw e;
        }
      },

      disconnectWallet: () => {
        // Local disconnect only (EIP-1193 has no disconnect); the wallet
        // stays connected at the provider but our app forgets the address.
        set({ walletAddress: null, walletConnected: false });
      },

      /** personal_sign of the session's SHA-256 manifest hash — the user's
       *  cryptographic confirmation proof. Stored on the confirmation record
       *  and rendered as "Confirmation proof" in the session UI. */
      signConfirmation: async (sessionId) => {
        const { walletAddress, sessions } = get();
        const session = sessions.find((s) => s.session_id === sessionId);
        if (!walletAddress || !session) return null;
        const message = `Confirm session ${session.session_id}\nManifest hash: ${session.memory_hash}\n\nBy signing you approve the session terms exactly as hashed above.`;
        try {
          const signature = await personalSign(message, walletAddress);
          set((s) => ({
            confirmations: s.confirmations.map((c) =>
              c.session_id === sessionId && c.action_type === "session_confirm"
                ? { ...c, user_confirmed: true, signature_proof: signature, timestamp: new Date().toISOString(), notes: "You signed the manifest hash — confirmation proof stored." }
                : c
            ),
          }));
          return signature;
        } catch {
          return null;
        }
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

/**
 * Wallet rehydration — call once from a client root (SiteHeader mounts it).
 * Re-checks eth_accounts so a returning user stays connected, and keeps the
 * store in sync when the user switches accounts or chains in their wallet.
 */
export function initWalletSync(): () => void {
  if (typeof window === "undefined") return () => {};
  void (async () => {
    const accounts = await silentAccounts();
    if (accounts.length > 0) {
      const chain = await currentChainId();
      useMarket.setState({ walletAddress: accounts[0], walletConnected: true });
      // Wrong persisted chain is not a disconnect — mark it so the UI can
      // prompt the switch on the next hire action.
      useMarket.setState({ walletChainOk: chain === BSC_CHAIN_ID });
    } else {
      useMarket.setState({ walletAddress: null, walletConnected: false });
    }
  })();
  return onWalletEvent((event, payload) => {
    if (event === "accountsChanged") {
      const accounts = payload as string[] | undefined;
      if (!accounts || accounts.length === 0) {
        useMarket.setState({ walletAddress: null, walletConnected: false });
      } else {
        useMarket.setState({ walletAddress: accounts[0], walletConnected: true });
      }
    } else if (event === "chainChanged") {
      useMarket.setState({ walletChainOk: payload === BSC_CHAIN_ID });
    }
  });
}

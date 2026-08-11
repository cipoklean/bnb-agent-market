// Altana adapter — user smart-account sessions with spend caps, expiry, revocation.
// STATUS: DEMO. Altana SDK / session contract interface + network config UNKNOWN (memory/UNKNOWN_ITEMS.md #7-8).
import { shortId, isoDaysFromNow } from "../format";

export interface SessionInput {
  userAddress: string;
  agentAddress: string;
  spendCap: string;
  token: string;
  expiryDays: number;
  allowedTargets: string[];
}

export interface SessionResult {
  sessionId: string;
  sessionKey: string; // agent-bound key, never exposed to UI as raw secret
  altanaAccount: string;
  spendCap: string;
  spent: string;
  expiry: string;
  explorerUrl: string;
}

export interface IAltanaAdapter {
  createSession(input: SessionInput): Promise<SessionResult>;
  revokeSession(sessionId: string): Promise<boolean>;
  getSession(sessionId: string): Promise<SessionResult | null>;
}

export const ALTANA_STATUS = "DEMO (SDK/contract interface UNKNOWN)" as const;

const active = new Map<string, SessionResult>();

export const altanaAdapter: IAltanaAdapter = {
  async createSession(input) {
    const session: SessionResult = {
      sessionId: shortId("alt", 8),
      sessionKey: `0x${"k".repeat(64)}`.replace(/k/g, (_, i) => ((i * 7) % 16).toString(16)),
      altanaAccount: `0x${"a".repeat(40)}`.replace(/a/g, (_, i) => ((i * 3 + 5) % 16).toString(16)),
      spendCap: input.spendCap,
      spent: "0",
      expiry: isoDaysFromNow(input.expiryDays),
      explorerUrl: `https://explorer.altana.example/session/${shortId("alt", 8)}`,
    };
    active.set(session.sessionId, session);
    return session;
  },
  async revokeSession(sessionId) {
    return active.delete(sessionId);
  },
  async getSession(sessionId) {
    return active.get(sessionId) ?? null;
  },
};

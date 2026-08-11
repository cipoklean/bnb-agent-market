/**
 * Altana (AltLayer) agent-session adapter.
 *
 * STATUS: DEMO — the Altana SDK / session-contract interface and its testnet/mainnet
 * configuration are UNKNOWN (see memory/UNKNOWN_ITEMS.md). This adapter keeps sessions
 * in an in-memory Map and returns deterministic results so the rest of the system can
 * integrate. A real implementation must call the Altana session contract / SDK once
 * the interface is verified. Sessions here are in-memory only — they disappear on
 * process restart and carry no chain guarantees.
 */

/** Honest status flag — surfaced in logs/UI. */
export const ALTANA_STATUS = 'DEMO — Altana SDK / session contract interface UNKNOWN';

/** Input to create a session. */
export interface SessionInput {
  userAddress: string;
  agentAddress: string;
  spendCap: string; // decimal string
  token: string; // e.g. 'BNB'
  expiryDays: number;
  allowedTargets: string[];
}

/** Result of a successful session creation. */
export interface SessionResult {
  sessionId: string;
  sessionKey: string; // agent-side credential (DEMO; a real key is issued by Altana)
  altanaAccount: string;
  spendCap: string;
  spent: string;
  expiry: string; // ISO timestamp
  explorerUrl: string; // DEMO link — PLACEHOLDER until Altana explorer URL is known
}

/** Current status of a session. */
export interface SessionStatus {
  sessionId: string;
  agentAddress: string;
  userAddress: string;
  spendCap: string;
  spent: string;
  expiry: string; // ISO timestamp
  revoked: boolean;
}

/** The interface all marketplace code depends on. */
export interface IAltanaAdapter {
  createSession(input: SessionInput): Promise<SessionResult>;
  revokeSession(sessionId: string): Promise<boolean>;
  getSession(sessionId: string): Promise<SessionStatus>;
}

/** PLACEHOLDER demo account — replace with a real Altana account once known. */
export const ALTANA_DEMO_ACCOUNT = '0xAltanaDemoAccount000000000000000000000000';
/** PLACEHOLDER demo explorer base URL — UNKNOWN until Altana config is verified. */
export const ALTANA_DEMO_EXPLORER = 'https://explorer.alt.xyz/demo/';

/** Deterministic in-memory implementation. NOT an Altana SDK client. */
export class DemoAltanaAdapter implements IAltanaAdapter {
  private readonly sessions = new Map<string, SessionStatus>();
  private counter = 0;

  async createSession(input: SessionInput): Promise<SessionResult> {
    this.counter += 1;
    const sessionId = `altana-demo-${this.counter}`;
    const expiry = new Date(Date.now() + input.expiryDays * 86_400_000).toISOString();

    this.sessions.set(sessionId, {
      sessionId,
      agentAddress: input.agentAddress,
      userAddress: input.userAddress,
      spendCap: input.spendCap,
      spent: '0',
      expiry,
      revoked: false,
    });

    return {
      sessionId,
      sessionKey: `sk-demo-${sessionId}`, // DEMO — real key issued by Altana
      altanaAccount: ALTANA_DEMO_ACCOUNT,
      spendCap: input.spendCap,
      spent: '0',
      expiry,
      explorerUrl: `${ALTANA_DEMO_EXPLORER}${sessionId}`,
    };
  }

  async revokeSession(sessionId: string): Promise<boolean> {
    const status = this.sessions.get(sessionId);
    if (!status) return false;
    status.revoked = true;
    return true;
  }

  async getSession(sessionId: string): Promise<SessionStatus> {
    const status = this.sessions.get(sessionId);
    if (!status) throw new Error(`AltanaDemo: session not found: ${sessionId}`);
    return { ...status };
  }
}

const demoAltanaAdapter: IAltanaAdapter = new DemoAltanaAdapter();
export default demoAltanaAdapter;

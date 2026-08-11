/**
 * ERC-8004 adapter.
 *
 * STATUS: DEMO — the official ERC-8004 registry (BNB Agent Studio / AltLayer 8004scan)
 * address, ABI, and metadata schema are UNKNOWN (see memory/UNKNOWN_ITEMS.md and the
 * build spec "UNKNOWN items" section).
 *
 * This module defines the interface the marketplace code depends on and provides a
 * deterministic in-memory DEMO so the rest of the system can be built and tested
 * honestly. Swap DemoErc8004Adapter for a real registry-backed client once the official
 * ABI + address are verified. Never treat DEMO values as production data.
 */

/** Honest status flag — surfaced in logs/UI so nobody mistakes the demo for the real thing. */
export const ERC8004_STATUS = 'DEMO — official ERC-8004 registry address/ABI UNKNOWN';

/** A single attestation attached to an agent. */
export interface AgentAttestation {
  id: string;
  attType: string; // e.g. 'identity' | 'track_record' | 'security_audit'
  dataRef: string; // off-chain reference (IPFS CID / URL / memory file path)
}

/** An agent as exposed to the marketplace. */
export interface Agent8004 {
  id: string; // marketplace-internal stable id
  agentId8004: string; // on-chain ERC-8004 agent id — PLACEHOLDER until registry verified
  address: string; // agent EVM address
  name: string;
  category: string; // e.g. 'lp-manager' | 'yield' | 'defi'
  successRate: number; // 0..1
  jobsCompleted: number;
  attestations: AgentAttestation[];
}

/** Filter for listAgents. */
export interface AgentFilter {
  category?: string;
  query?: string; // matches name
}

/** The interface all marketplace code depends on. */
export interface IErc8004Adapter {
  getAgentById(agentId: string): Promise<Agent8004 | null>;
  getAgentByAddress(address: string): Promise<Agent8004 | null>;
  listAgents(filter: AgentFilter): Promise<Agent8004[]>;
  getAttestations(agentId: string): Promise<AgentAttestation[]>;
}

// ---------------------------------------------------------------------------
// DEMO data — deterministic, clearly fake. Replace with real registry queries
// once the official ERC-8004 address/ABI are verified.
// ---------------------------------------------------------------------------

const DEMO_AGENTS: Agent8004[] = [
  {
    id: 'agent-alpha-lp-rebalancer',
    agentId8004: '8004:0x0000000000000000000000000000000000000001', // PLACEHOLDER — UNKNOWN
    address: '0x1111111111111111111111111111111111111111',
    name: 'alpha-lp-rebalancer',
    category: 'lp-manager',
    successRate: 0.92,
    jobsCompleted: 128,
    attestations: [
      { id: 'att-demo-1', attType: 'identity', dataRef: 'ipfs://QmDemoIdentityAlpha' },
      { id: 'att-demo-2', attType: 'track_record', dataRef: 'memory/agents/alpha-lp-rebalancer.md' },
    ],
  },
  {
    id: 'agent-vega-yield-sweeper',
    agentId8004: '8004:0x0000000000000000000000000000000000000002', // PLACEHOLDER — UNKNOWN
    address: '0x2222222222222222222222222222222222222222',
    name: 'vega-yield-sweeper',
    category: 'yield',
    successRate: 0.87,
    jobsCompleted: 73,
    attestations: [
      { id: 'att-demo-3', attType: 'security_audit', dataRef: 'ipfs://QmDemoAuditVega' },
    ],
  },
  {
    id: 'agent-nova-hft-market-maker',
    agentId8004: '8004:0x0000000000000000000000000000000000000003', // PLACEHOLDER — UNKNOWN
    address: '0x3333333333333333333333333333333333333333',
    name: 'nova-hft-market-maker',
    category: 'defi',
    successRate: 0.95,
    jobsCompleted: 210,
    attestations: [],
  },
];

const DEMO_BY_ADDRESS = new Map(DEMO_AGENTS.map((a) => [a.address.toLowerCase(), a]));

/** Deterministic in-memory implementation. NOT a real registry client. */
export class DemoErc8004Adapter implements IErc8004Adapter {
  getAgentById(agentId: string): Promise<Agent8004 | null> {
    const agent = DEMO_AGENTS.find((a) => a.id === agentId) ?? null;
    return Promise.resolve(agent ? { ...agent, attestations: [...agent.attestations] } : null);
  }

  getAgentByAddress(address: string): Promise<Agent8004 | null> {
    const agent = DEMO_BY_ADDRESS.get(address.toLowerCase()) ?? null;
    return Promise.resolve(agent ? { ...agent, attestations: [...agent.attestations] } : null);
  }

  listAgents(filter: AgentFilter): Promise<Agent8004[]> {
    const q = (filter.query ?? '').toLowerCase();
    const out = DEMO_AGENTS.filter((a) => {
      if (filter.category && a.category !== filter.category) return false;
      if (q && !a.name.toLowerCase().includes(q)) return false;
      return true;
    });
    return Promise.resolve(out.map((a) => ({ ...a, attestations: [...a.attestations] })));
  }

  getAttestations(agentId: string): Promise<AgentAttestation[]> {
    const agent = DEMO_AGENTS.find((a) => a.id === agentId);
    return Promise.resolve(agent ? [...agent.attestations] : []);
  }
}

const demoErc8004Adapter: IErc8004Adapter = new DemoErc8004Adapter();
export default demoErc8004Adapter;

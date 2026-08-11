// ERC-8004 adapter — agent identity + track record.
// STATUS: DEMO. Official registry address/ABI/metadata schema UNKNOWN (memory/UNKNOWN_ITEMS.md #1-4).
// Swap the DEMO impl for a viem contract read against the official registry when verified.
import { AGENTS, DEMO_MODE } from "../data";
import type { Agent } from "../types";

export interface IErc8004Adapter {
  getAgentById(agentId: string): Promise<Agent | null>;
  getAgentByAddress(address: string): Promise<Agent | null>;
  listAgents(vertical?: "alphadesk" | "taskchain"): Promise<Agent[]>;
  getAttestations(agentId: string): Promise<Agent["attestations"]>;
}

export const ERC8004_STATUS = "DEMO (registry address/ABI UNKNOWN)" as const;

const delay = () => new Promise((r) => setTimeout(r, 60));

export const erc8004Adapter: IErc8004Adapter = {
  async getAgentById(agentId) {
    await delay();
    return AGENTS.find((a) => a.id === agentId) ?? null;
  },
  async getAgentByAddress(address) {
    await delay();
    return AGENTS.find((a) => a.address.toLowerCase() === address.toLowerCase()) ?? null;
  },
  async listAgents(vertical) {
    await delay();
    return vertical ? AGENTS.filter((a) => a.vertical === vertical) : AGENTS;
  },
  async getAttestations(agentId) {
    await delay();
    return AGENTS.find((a) => a.id === agentId)?.attestations ?? [];
  },
};

export const erc8004DemoNote = DEMO_MODE
  ? "Demo adapter — ERC-8004 registry address and ABI not yet verified. Agent identity shown from labeled demo data."
  : "";

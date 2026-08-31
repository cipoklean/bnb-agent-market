// Session-context agent lookup — submitted-store entry → scan/canonical slug
// → null. Lives apart from scan-normalize.ts because it needs the store types;
// the pure normalizers stay node-testable.
import type { Agent } from "./types";
import { GENERIC_CAPABILITY, parseCanonicalId, parseScanId } from "./scan-normalize";

/**
 * Resolve the agent behind a session (dashboard cards, session pages, payment
 * sheet): submitted-store entry → scan/canonical slug → null.
 * No sample-registry fallback — demo agents are purged from production.
 */
export function resolveSessionAgent(agentId: string, submittedAgents?: Agent[]): Agent | null {
  const sub = submittedAgents?.find((a) => a.id === agentId);
  if (sub) return sub;
  const sc = parseScanId(agentId);
  const cc = parseCanonicalId(agentId);
  const tok = sc?.tokenId ?? cc?.tokenId;
  if (tok) {
    return {
      id: agentId,
      agentId8004: agentId,
      address: "",
      name: `Agent #${tok}`,
      tagline: "",
      description: "",
      category: "Indexer-listed",
      vertical: "taskchain",
      owner: "",
      riskLevel: "medium",
      successRate: 0,
      jobsCompleted: 0,
      avgFee: "0",
      paymentToken: "BNB",
      feeModel: "pay_per_task",
      verified: false,
      capabilities: [GENERIC_CAPABILITY],
      controls: [],
      attestations: [],
      performance: [],
    };
  }
  return null;
}

export function sessionAgentName(agentId: string, submittedAgents?: Agent[]): string {
  return resolveSessionAgent(agentId, submittedAgents)?.name ?? agentId;
}

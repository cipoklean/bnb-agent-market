// Core data model — BNB Agent Market Core (mirrors memory/CORE data model + Session Manifest spec)

export type Vertical = "alphadesk" | "taskchain";
export type RiskLevel = "low" | "medium" | "high";
export type SessionStatus =
  | "draft"
  | "pending_confirmation"
  | "active"
  | "paused"
  | "completed"
  | "revoked"
  | "expired";
export type FeeModel = "fixed" | "pay_per_task" | "subscription" | "performance";
export type PaymentMethod = "x402";

export interface Capability {
  id: string;
  name: string;
  description: string;
  pricingType: FeeModel;
  paymentToken: string;
  priceAmount: string;
  inputSchema?: string;
  outputSchema?: string;
}

export interface Attestation {
  id: string;
  attester: string;
  type: string; // e.g. "track_record", "audit", "performance"
  data: string;
  proofUri: string;
  txHash: string;
  createdAt: string;
}

export interface Erc8004ScanMetrics {
  // Real indexer data from the AltLayer 8004scan public REST API
  // (https://8004scan.io/api/v1/public/agents/{chainId}/{tokenId}).
  chainId: number;
  tokenId: string;
  agentId: string; // canonical "chainId:registryAddress:tokenId"
  name: string;
  totalScore: number | null;
  averageScore: number | null;
  healthScore: number | null;
  totalFeedbacks: number;
  x402Supported: boolean;
  isActive: boolean;
  isTestnet: boolean;
  createdAt: string;
  updatedAt: string;
  sourceUrl: string; // the API URL this was fetched from
  fetchedAt: string; // when we fetched it
}

export interface Agent {
  id: string;
  agentId8004: string;
  address: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  vertical: Vertical;
  owner: string;
  riskLevel: RiskLevel;
  successRate: number;
  jobsCompleted: number;
  avgFee: string;
  paymentToken: string;
  feeModel: FeeModel;
  capabilities: Capability[];
  controls: string[]; // risk controls shown to users
  attestations: Attestation[];
  performance: { label: string; value: number }[];
  featured?: boolean;
  verified: boolean;
  /** Live 8004scan indexer metrics — set only for the mainnet-registered agent. */
  scanMetrics?: Erc8004ScanMetrics | null;
  /** True for agents listed through the submission portal after 8004scan verification. */
  verifiedVia8004?: boolean;
}

export interface SessionScope {
  task_type: string;
  description: string;
  parameters: Record<string, string | number | boolean>;
}

export interface SessionBudget {
  token: string;
  max_total: string;
  max_per_action: string;
}

export interface SessionPermissions {
  allowed_targets: string[];
  allowed_selectors: string[];
  forbidden_actions: string[];
}

export interface SessionPayment {
  method: PaymentMethod;
  amount: string;
  token: string;
  fee_model: FeeModel;
}

// Session Manifest — exact structure from the build prompt
export interface SessionManifest {
  session_id: string;
  product: Vertical;
  user_address: string;
  agent_id: string;
  agent_erc8004_id: string;
  scope: SessionScope;
  budget: SessionBudget;
  permissions: SessionPermissions;
  expiry: string; // ISO timestamp
  payment: SessionPayment;
  memory_hash: string;
  // Hash algorithm version. "v2" = current canonical serializer; "seed" = labeled
  // demo placeholder; absent = pre-upgrade session (hash from an older serializer).
  hash_version?: "v2" | "seed";
  created_at: string;
  status: SessionStatus;
  /**
   /** Delegation tree (D008): who delegated this session. Undefined = hired by
    * the human. Set to the DELEGATING AGENT's identity (agent_id) when an agent
    * hired this agent. Revocation: human may always revoke; an agent may only
    * revoke sessions where parent_session_id === its own id (its sub-agents).
    */
  parent_session_id?: string;
}

export interface SessionEvent {
  id: string;
  session_id: string;
  ts: string;
  type: "created" | "confirmed" | "action" | "payment" | "proof" | "revoked" | "expired" | "alert";
  title: string;
  detail: string;
  proof?: string;
  status: "done" | "pending" | "blocked";
}

export interface Confirmation {
  id: string;
  session_id: string;
  memory_hash: string;
  action_type: string; // e.g. "session_confirm", "swap", "revoke"
  risk: "low" | "medium" | "high";
  user_confirmed: boolean;
  agent_confirmed: boolean;
  timestamp: string;
  notes: string;
}

export interface PaymentRecord {
  id: string;
  session_id: string;
  x402_payment_id: string;
  payer: string;
  pay_to: string;
  token: string;
  amount: string;
  tx_hash: string;
  status: "pending" | "paid" | "failed";
  payment_type: FeeModel;
  created_at: string;
}

export interface WalletState {
  address: string | null;
  connected: boolean;
  demo: boolean;
}

export interface EvidenceItem {
  id: string;
  partner: "TermiX" | "PancakeSwap" | "Altana" | "AltLayer" | "ERC-8004" | "x402" | "Memory";
  title: string;
  summary: string;
  proof: string; // tx hash / memory hash / confirmation id
  createdAt: string;
}

// Production-only data module: no demo/sample agents anywhere.
// Every agent must be verified via the on-chain ERC-8004 registry
// (0x8004A169FB4a3325136EB29fA0ceB6D2e539a432, BSC mainnet) or listed
// through the verified submission portal (/submit).
//
// NOTE: manifest building/hashing lives in ./memory (buildManifest,
// verifyManifestHash, manifestHash) and the memory-bundle helpers live in
// ./store (computeMemoryBundle, exportMemoryBundle). This module only keeps
// the sample-mode kill switch and the permission target allowlist.

/** Always returns false — demo/sample agents are never loaded in production. */
export const sampleAgentsEnabled = (): boolean => false;

/**
 * Permission targets offered in the hire wizard's permission editor.
 * Labeled protocol targets only — real execution adapters must resolve
 * these to verified official contract addresses before any tx is built.
 */
export const AVAILABLE_TARGETS = [
  "0xPancakeSwapV3Router",
  "0xPancakeSwapPositionManager",
  "0xCAKEFarmV2",
  "0xGovernorAlpha",
  "0xAirdropDistributor",
];

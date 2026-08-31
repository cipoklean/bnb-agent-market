"use client";
// Real injected-wallet connect — dependency-free (window.ethereum, EIP-1193).
// No wagmi/RainbowKit: the flows we need are eth_requestAccounts, chain
// switch/add (BSC mainnet 0x38), eth_accounts rehydrate, and personal_sign
// for session confirmation proofs. Never crashes when no wallet is present
// — callers check walletAvailable() and show a friendly modal instead.

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}

/** BSC mainnet (chain id 56, hex 0x38) — the chain this marketplace runs on. */
export const BSC_CHAIN_ID = "0x38";

const BSC_NETWORK_PARAMS = {
  chainId: BSC_CHAIN_ID,
  chainName: "BNB Smart Chain",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: ["https://bsc-dataseed.binance.org"],
  blockExplorerUrls: ["https://bscscan.com"],
};

export type WalletError =
  | { kind: "not_detected" }
  | { kind: "user_rejected" }
  | { kind: "wrong_chain"; message: string }
  | { kind: "unknown"; message: string };

export function walletAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.ethereum !== "undefined";
}

export function isWalletError(e: unknown): e is WalletError {
  return typeof e === "object" && e !== null && "kind" in e;
}

function walletError(method: string, e: unknown): WalletError {
  const code = (e as { code?: number } | null)?.code;
  if (code === 4001 || code === -32603) return { kind: "user_rejected" };
  return { kind: "unknown", message: `${method} failed: ${e instanceof Error ? e.message : String(e)}` };
}

/** Read current accounts without prompting (rehydrate on load). */
export async function silentAccounts(): Promise<string[]> {
  if (!walletAvailable()) return [];
  try {
    const accs = (await window.ethereum!.request({ method: "eth_accounts" })) as string[];
    return Array.isArray(accs) ? accs : [];
  } catch {
    return [];
  }
}

/** Current chain id (hex). Returns null when unavailable. */
export async function currentChainId(): Promise<string | null> {
  if (!walletAvailable()) return null;
  try {
    return (await window.ethereum!.request({ method: "eth_chainId" })) as string;
  } catch {
    return null;
  }
}

/**
 * Force BSC mainnet. wallet_switchEthereumChain first; on 4902 (chain not
 * added) fall back to wallet_addEthereumChain with the official BSC params.
 */
async function ensureBscChain(): Promise<void> {
  const chainId = await currentChainId();
  if (chainId === BSC_CHAIN_ID) return;
  try {
    await window.ethereum!.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BSC_CHAIN_ID }],
    });
  } catch (e) {
    const code = (e as { code?: number } | null)?.code;
    if (code === 4902 || code === -32603) {
      try {
        await window.ethereum!.request({
          method: "wallet_addEthereumChain",
          params: [BSC_NETWORK_PARAMS],
        });
      } catch (addErr) {
        throw walletError("wallet_addEthereumChain", addErr);
      }
    } else if ((e as { code?: number } | null)?.code === 4001) {
      throw { kind: "user_rejected" } as WalletError;
    } else {
      throw walletError("wallet_switchEthereumChain", e);
    }
  }
  // A user can dismiss the switch prompt while the wallet stays elsewhere.
  const after = await currentChainId();
  if (after !== BSC_CHAIN_ID) {
    throw {
      kind: "wrong_chain",
      message: `BNB Smart Chain required — your wallet is on chain ${after}.`,
    } as WalletError;
  }
}

/**
 * Connect: eth_requestAccounts → enforce BSC mainnet → return address.
 * Throws WalletError (never a raw browser error) so UI can show a modal.
 */
export async function connectWalletRequest(): Promise<string> {
  if (!walletAvailable()) throw { kind: "not_detected" } as WalletError;
  let accounts: string[];
  try {
    accounts = (await window.ethereum!.request({
      method: "eth_requestAccounts",
    })) as string[];
  } catch (e) {
    throw walletError("eth_requestAccounts", e);
  }
  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw { kind: "unknown", message: "No accounts returned by the wallet." } as WalletError;
  }
  try {
    await ensureBscChain();
  } catch (e) {
    // Connected but on the wrong chain — still throw so the user knows.
    throw isWalletError(e) ? e : walletError("ensureBscChain", e);
  }
  return accounts[0];
}

/** personal_sign of a hex message (our SHA-256 confirmation proof). */
export async function personalSign(message: string, address: string): Promise<string> {
  if (!walletAvailable()) throw { kind: "not_detected" } as WalletError;
  try {
    return (await window.ethereum!.request({
      method: "personal_sign",
      params: [message, address],
    })) as string;
  } catch (e) {
    throw walletError("personal_sign", e);
  }
}

/** Subscribe to account/chain changes; returns an unsubscribe. */
export function onWalletEvent(handler: (event: "accountsChanged" | "chainChanged", payload?: unknown) => void): () => void {
  if (!walletAvailable() || !window.ethereum!.on) return () => {};
  const accounts = (...args: unknown[]) => handler("accountsChanged", args[0]);
  const chain = (...args: unknown[]) => handler("chainChanged", args[0]);
  window.ethereum!.on("accountsChanged", accounts);
  window.ethereum!.on("chainChanged", chain);
  return () => {
    window.ethereum!.removeListener?.("accountsChanged", accounts);
    window.ethereum!.removeListener?.("chainChanged", chain);
  };
}

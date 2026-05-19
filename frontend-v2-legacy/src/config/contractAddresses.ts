/**
 * contractAddresses.ts
 * ====================
 * Single source of truth for deployed CineX smart contract addresses.
 * All values default to empty strings; set them via .env or the
 * VITE_* environment variables at build / deploy time.
 *
 * The app reads VITE_* vars first, then falls back to the testnet
 * defaults defined below.  When testing against a local devnet you
 * should set the VITE_* vars to match your local deployment.
 */

/** Logical contract key used across the codebase */
export type ContractKey =
  | "crowdfunding"
  | "coep"
  | "core"
  | "verification"
  | "escrow";

/** Address + name pair that together make a contract identifier */
export interface ContractEntry {
  /** Stacks address that deployed the contract */
  address: string;
  /** Contract name as deployed on-chain */
  name: string;
}

/**
 * resolveContract
 * ---------------
 * Returns the address + name for a contract key.
 * Precedence:
 *   1. VITE_{KEY}_CONTRACT_ADDRESS / VITE_{KEY}_CONTRACT_NAME env vars
 *   2. Hardcoded testnet defaults below
 *
 * @param key - Logical contract name ("crowdfunding", "coep", etc.)
 */
export function resolveContract(key: ContractKey): ContractEntry {
  const envKey   = key.toUpperCase().replace(/-/g, "_");
  const envAddr  = import.meta.env[`VITE_${envKey}_CONTRACT_ADDRESS`] as string | undefined;
  const envName  = import.meta.env[`VITE_${envKey}_CONTRACT_NAME`]   as string | undefined;

  // Return env values if either is set; caller will validate
  if (envAddr || envName) {
    return {
      address: envAddr || TESTNET_DEFAULTS[key].address,
      name:    envName || TESTNET_DEFAULTS[key].name,
    };
  }

  return TESTNET_DEFAULTS[key];
}

/**
 * TESTNET_DEFAULTS
 * ----------------
 * Hardcoded testnet contract names the app uses when no VITE_* variables
 * are provided.  Addresses are empty by default — fill them in after you
 * deploy the contracts to testnet.
 */
export const TESTNET_DEFAULTS: Record<ContractKey, ContractEntry> = {
  crowdfunding: { address: "", name: "crowdfunding-module" },
  coep:         { address: "", name: "Co-EP-rotating-fundings" },
  core:         { address: "", name: "CineX-project" },
  verification: { address: "", name: "film-verification-module" },
  escrow:       { address: "", name: "escrow-module" },
};

/**
 * CONTRACT_NAMES
 * --------------
 * Short-hand for quick imports.  Use `resolveContract(key)` when you need
 * the full address+name; use the map below for just the name string.
 */
export const CONTRACT_NAMES: Record<ContractKey, string> = {
  crowdfunding: "crowdfunding-module",
  coep:         "Co-EP-rotating-fundings",
  core:         "CineX-project",
  verification: "film-verification-module",
  escrow:       "escrow-module",
};

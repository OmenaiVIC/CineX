/**
 * networkConfig.ts
 * ================
 * Network configuration type definition and loader.
 *
 * Satisfies: Engineering rules — "separate sandbox/testnet from production explicitly"
 */

import { resolve } from "path";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NetworkConfig {
  name: "devnet" | "testnet" | "mainnet";
  networkUrl: string;
  deployerAddress: string;
  deployer: string;
  deployerMnemonicPath: string;
  feeMultiplier: number;
  confirmTimeoutMs: number;
  confirmPollIntervalMs: number;
  explorerBaseUrl: string;
  isProduction: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getSettingsPath(network: string): string {
  const capNetwork = network.charAt(0).toUpperCase() + network.slice(1);
  return resolve("settings", `${capNetwork}.toml`);
}

export function getExplorerTxUrl(config: NetworkConfig, txId: string): string {
  return `${config.explorerBaseUrl}/txid/${txId}?chain=${config.name}`;
}

export function getExplorerContractUrl(config: NetworkConfig, contractId: string): string {
  return `${config.explorerBaseUrl}/address/${contractId}?chain=${config.name}`;
}

// ─── Config Loader ───────────────────────────────────────────────────────────

export async function loadNetworkConfig(
  network: "devnet" | "testnet" | "mainnet"
): Promise<NetworkConfig> {
  switch (network) {
    case "devnet":
      return (await import("../config/devnet.js")).default;
    case "testnet":
      return (await import("../config/testnet.js")).default;
    case "mainnet":
      return (await import("../config/mainnet.js")).default;
    default:
      throw new Error(`Unknown network: ${network}. Must be devnet, testnet, or mainnet.`);
  }
}

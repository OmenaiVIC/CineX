/**
 * mainnet.ts
 * ==========
 * Mainnet network configuration (Hiro mainnet API).
 *
 * Satisfies: Engineering rules — "separate sandbox/testnet from production explicitly"
 *            "keep secrets in environment variables only"
 */

import { resolve } from "path";
import type { NetworkConfig } from "../lib/networkConfig.js";

// Mainnet deployer address MUST be set via environment variable
const deployerAddress = process.env.CINEX_MAINNET_DEPLOYER;
if (!deployerAddress) {
  throw new Error(
    "CINEX_MAINNET_DEPLOYER environment variable is required for mainnet deployment. " +
    "Set it to the ST... address of your mainnet deployer wallet."
  );
}

const config: NetworkConfig = {
  name: "mainnet",
  networkUrl: "https://api.mainnet.hiro.so",
  deployerAddress,
  deployer: deployerAddress,
  deployerMnemonicPath: resolve("settings", "Mainnet.toml"),
  feeMultiplier: 1.5,              // 50% fee buffer for mainnet
  confirmTimeoutMs: 1_800_000,     // 30 minutes
  confirmPollIntervalMs: 5_000,    // 5 seconds
  explorerBaseUrl: "https://explorer.hiro.so",
  isProduction: true,
};

export default config;

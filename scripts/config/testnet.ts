/**
 * testnet.ts
 * ==========
 * Testnet network configuration (Hiro testnet API).
 *
 * Satisfies: Engineering rules — "separate sandbox/testnet from production explicitly"
 */

import { resolve } from "path";
import type { NetworkConfig } from "../lib/networkConfig.js";

const config: NetworkConfig = {
  name: "testnet",
  networkUrl: "https://api.testnet.hiro.so",
  deployerAddress: process.env.CINEX_TESTNET_DEPLOYER ?? "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  deployer: process.env.CINEX_TESTNET_DEPLOYER ?? "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  deployerMnemonicPath: resolve("settings", "Testnet.toml"),
  feeMultiplier: 1.0,
  confirmTimeoutMs: 600_000,       // 10 minutes
  confirmPollIntervalMs: 3_000,    // 3 seconds
  explorerBaseUrl: "https://explorer.hiro.so",
  isProduction: false,
};

export default config;

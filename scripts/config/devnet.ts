/**
 * devnet.ts
 * =========
 * Devnet network configuration (embedded Clarinet, localhost).
 *
 * Satisfies: Engineering rules — "separate sandbox/testnet from production explicitly"
 */

import { resolve } from "path";
import type { NetworkConfig } from "../lib/networkConfig.js";

const config: NetworkConfig = {
  name: "devnet",
  networkUrl: "http://localhost:20443",
  deployerAddress: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  deployer: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  deployerMnemonicPath: resolve("settings", "Devnet.toml"),
  feeMultiplier: 1.0,
  confirmTimeoutMs: 120_000,       // 2 minutes
  confirmPollIntervalMs: 2_000,    // 2 seconds
  explorerBaseUrl: "http://localhost:8080",
  isProduction: false,
};

export default config;

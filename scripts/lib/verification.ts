/**
 * verification.ts
 * ================
 * Post-deploy verification: read-only calls to confirm contracts are live
 * and initialization took effect.
 *
 * Satisfies: Engineering rules — "no production money movement may depend on
 *            ambiguous or manually inferred state"
 */

import type { NetworkConfig } from "./networkConfig.js";
import type { DeployResult } from "./contractDeployer.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VerificationResult {
  contract: string;
  check: string;
  passed: boolean;
  detail: string;
}

// ─── Verification ────────────────────────────────────────────────────────────

async function callReadOnly(
  config: NetworkConfig,
  contractAddress: string,
  contractName: string,
  functionName: string
): Promise<{ okay: boolean; result?: any; error?: string }> {
  try {
    const url = `${config.networkUrl}/v2/contracts/call-read/${contractAddress}/${contractName}/${functionName}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: config.deployerAddress,
        arguments: [],
      }),
    });
    const data = await resp.json();
    return { okay: data.okay, result: data.result, error: data.error };
  } catch (err: any) {
    return { okay: false, error: err.message };
  }
}

/**
 * Verify that a contract is deployed and responds to read-only calls.
 */
export async function verifyDeployment(
  config: NetworkConfig,
  deployResults: DeployResult[]
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  console.log("\n🔍 Verifying deployment");
  console.log(`  Network: ${config.networkUrl}\n`);

  for (const deploy of deployResults) {
    if (deploy.status !== "deployed" || !deploy.contractAddress) continue;

    // Check 1: Contract exists on-chain
    const existsCheck = await callReadOnly(
      config,
      config.deployerAddress,
      deploy.name,
      "get-contract-owner" // common getter that most contracts have
    );

    results.push({
      contract: deploy.name,
      check: "contract-exists",
      passed: existsCheck.okay,
      detail: existsCheck.okay
        ? "Contract responds to read-only calls"
        : `Contract not responding: ${existsCheck.error ?? "unknown"}`,
    });
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`  ✅ Passed: ${passed}`);
  if (failed > 0) {
    console.log(`  ❌ Failed: ${failed}`);
  }

  return results;
}

/**
 * Verify initialization by calling admin/getter functions.
 * Returns verification results for each initialized contract.
 */
export async function verifyInitialization(
  config: NetworkConfig,
  deployResults: DeployResult[]
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  console.log("\n🔍 Verifying initialization");

  // Map of contract -> getter function to verify init
  const initChecks: Record<string, string> = {
    "cinex-multisig": "get-signer-1",
    "timelock": "get-multisig-addr",
    "asset-registry": "get-admin",
    "oracle-proxy": "get-admin",
    "project-verification-module": "get-admin",
    "reputation": "get-admin",
    "campaign-module-2": "get-core-contract",
    "bitflow-strategy": "get-admin",
    "milestone-escrow": "get-core-contract",
    "milestone-verification": "get-admin",
    "yield-escrow": "get-admin",
    "funding-pool": "get-admin",
  };

  for (const deploy of deployResults) {
    if (deploy.status !== "deployed" || !deploy.contractAddress) continue;

    const getter = initChecks[deploy.name];
    if (!getter) continue;

    const check = await callReadOnly(
      config,
      config.deployerAddress,
      deploy.name,
      getter
    );

    results.push({
      contract: deploy.name,
      check: `init-${getter}`,
      passed: check.okay,
      detail: check.okay
        ? `${getter} returned a value — initialized`
        : `${getter} failed: ${check.error ?? "not initialized"}`,
    });
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`  ✅ Initialized: ${passed}`);
  if (failed > 0) {
    console.log(`  ⚠️  Not initialized or check failed: ${failed}`);
  }

  return results;
}

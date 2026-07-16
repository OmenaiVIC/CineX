/**
 * contractDeployer.ts
 * ===================
 * Core deployment logic: check on-chain status, broadcast contract-publish,
 * wait for confirmation, handle idempotency and retry.
 *
 * Satisfies: PRD §4 (Smart Contract Status), §1.1 (Contract deployment status)
 *            Engineering rules — idempotency, retry path, deterministic state transitions
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import {
  makeContractDeploy,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
} from "@stacks/transactions";
import { StacksTestnet, StacksMainnet } from "@stacks/network-v6";
import { generateWallet, getStxAddress } from "@stacks/wallet-sdk";
import type { NetworkConfig } from "./networkConfig.js";
import type { ContractEntry } from "./dependencyGraph.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DeployResult {
  name: string;
  sourcePath: string;
  type: "trait" | "logic";
  deployOrder: number;
  txId: string | null;
  blockHeight: number | null;
  contractAddress: string | null;
  fullContractId: string | null;
  deployCost: number;
  status: "deployed" | "skipped" | "failed" | "unconfirmed";
  deployedAt: string | null;
  error: string | null;
  deployDurationMs: number;
}

export interface DeployOptions {
  dryRun?: boolean;
  specificContract?: string;
}

// ─── Network Setup ───────────────────────────────────────────────────────────

async function getWallet(config: NetworkConfig) {
  const raw = readFileSync(resolve(config.deployerMnemonicPath), "utf-8");
  const match = raw.match(/^mnemonic\s*=\s*"(.+)"$/m);
  if (!match) {
    throw new Error(`Could not find mnemonic in ${config.deployerMnemonicPath}`);
  }
  const mnemonic = match[1].trim();

  const wallet = await generateWallet({
    secretKey: mnemonic,
    password: `cinex-deploy-${config.name}`,
  });

  const account = wallet.accounts[0];
  return {
    privateKey: account.stxPrivateKey,
    address: getStxAddress(account, config.name === "mainnet" ? "mainnet" : "testnet"),
  };
}

// ─── API Helpers ─────────────────────────────────────────────────────────────

async function apiGet(url: string): Promise<any> {
  const resp = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!resp.ok) {
    throw new Error(`API error: ${resp.status} ${resp.statusText} — ${url}`);
  }
  return resp.json();
}

async function getNonce(address: string, config: NetworkConfig): Promise<number> {
  const data = await apiGet(`${config.networkUrl}/extended/v1/address/${address}/nonces`);
  return data?.possible_next_nonce ?? 0;
}

/**
 * Check if a contract is already deployed on-chain.
 * Returns the contract info if it exists, null otherwise.
 */
export async function isContractDeployed(
  config: NetworkConfig,
  contractName: string
): Promise<{ exists: boolean; contractId?: string; blockHeight?: number }> {
  try {
    const data = await apiGet(
      `${config.networkUrl}/extended/v1/contract/${config.deployerAddress}.${contractName}`
    );
    if (data && data.tx_status === "success") {
      return {
        exists: true,
        contractId: `${config.deployerAddress}.${contractName}`,
        blockHeight: data.block_height,
      };
    }
    return { exists: false };
  } catch {
    return { exists: false };
  }
}

async function waitForTxConfirmation(
  txId: string,
  config: NetworkConfig,
  maxRetries?: number
): Promise<{ confirmed: boolean; blockHeight: number; txStatus: string }> {
  const max = maxRetries ?? Math.ceil(config.confirmTimeoutMs / config.confirmPollIntervalMs);

  for (let i = 0; i < max; i++) {
    try {
      const data = await apiGet(`${config.networkUrl}/extended/v1/tx/${txId}`);

      if (data.tx_status === "success") {
        return { confirmed: true, blockHeight: data.block_height, txStatus: "success" };
      }

      if (
        data.tx_status === "abort_by_response" ||
        data.tx_status === "abort_by_post_condition"
      ) {
        const reason = data.tx_result?.repr ?? "unknown";
        return { confirmed: false, blockHeight: 0, txStatus: `${data.tx_status}: ${reason}` };
      }

      // Still pending/queued — keep polling
      if (i % 10 === 0 && i > 0) {
        console.log(`    ⏳ ${data.tx_status}... (${i + 1}/${max})`);
      }
    } catch {
      // API not yet seeing the tx — keep polling
    }

    await new Promise((r) => setTimeout(r, config.confirmPollIntervalMs));
  }

  return { confirmed: false, blockHeight: 0, txStatus: "timeout" };
}

function getNetworkFromConfig(config: NetworkConfig) {
  if (config.name === "mainnet") {
    return new StacksMainnet({ url: config.networkUrl });
  }
  return new StacksTestnet({ url: config.networkUrl });
}

// ─── Deploy Logic ────────────────────────────────────────────────────────────

/**
 * Deploy a single contract.
 * Returns a DeployResult with status, txId, and timing information.
 */
async function deploySingleContract(
  entry: ContractEntry,
  config: NetworkConfig,
  wallet: { privateKey: string; address: string },
  deployOrder: number,
  dryRun: boolean
): Promise<DeployResult> {
  const startTime = Date.now();
  const result: DeployResult = {
    name: entry.name,
    sourcePath: entry.sourcePath,
    type: entry.type,
    deployOrder,
    txId: null,
    blockHeight: null,
    contractAddress: null,
    fullContractId: null,
    deployCost: 0,
    status: "failed",
    deployedAt: null,
    error: null,
    deployDurationMs: 0,
  };

  try {
    // 1. Check if already deployed (idempotency)
    const existing = await isContractDeployed(config, entry.name);
    if (existing.exists) {
      result.status = "skipped";
      result.contractAddress = config.deployerAddress;
      result.fullContractId = existing.contractId ?? null;
      result.blockHeight = existing.blockHeight ?? null;
      result.deployedAt = new Date().toISOString();
      result.error = null;
      console.log(`  ⏭️  ${entry.name} — already deployed at ${existing.contractId}`);
      return result;
    }

    // 2. Read source
    const sourcePath = resolve(entry.sourcePath);
    const codeBody = readFileSync(sourcePath, "utf-8");

    // 3. Estimate cost (from Clarinet.toml or use a reasonable default)
    result.deployCost = Math.round(100_000 * config.feeMultiplier);

    if (dryRun) {
      result.status = "deployed"; // "would deploy"
      result.contractAddress = config.deployerAddress;
      result.fullContractId = `${config.deployerAddress}.${entry.name}`;
      result.deployedAt = new Date().toISOString();
      console.log(`  🔍 ${entry.name} — DRY RUN: would deploy`);
      return result;
    }

    // 4. Get nonce
    const nonce = await getNonce(wallet.address, config);

    // 5. Build and broadcast
    const network = getNetworkFromConfig(config);
    const tx = await makeContractDeploy({
      contractName: entry.name,
      codeBody,
      senderKey: wallet.privateKey,
      network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      fee: Math.round(50_000 * config.feeMultiplier),
      nonce,
    });

    const broadcastResult = await broadcastTransaction(tx, network);

    if (broadcastResult.error || broadcastResult.reason) {
      result.error = `Broadcast error: ${broadcastResult.error || "unknown"} — ${broadcastResult.reason || "no reason"}`;
      console.log(`  ❌ ${entry.name} — ${result.error}`);
      return result;
    }

    const txId = `0x${broadcastResult.txid}`;
    result.txId = txId;
    result.contractAddress = config.deployerAddress;
    result.fullContractId = `${config.deployerAddress}.${entry.name}`;

    console.log(`  🚀 ${entry.name} → ${txId}`);

    // 6. Wait for confirmation
    const confirmation = await waitForTxConfirmation(txId, config);

    if (confirmation.confirmed) {
      result.status = "deployed";
      result.blockHeight = confirmation.blockHeight;
      result.deployedAt = new Date().toISOString();
      console.log(`  ✅ ${entry.name} — confirmed at block ${confirmation.blockHeight}`);
    } else {
      result.status = "unconfirmed";
      result.error = `Confirmation failed: ${confirmation.txStatus}`;
      console.log(`  ⚠️  ${entry.name} — ${result.error}`);
    }
  } catch (err: any) {
    result.error = err.message || String(err);
    console.log(`  ❌ ${entry.name} — ${result.error}`);
  } finally {
    result.deployDurationMs = Date.now() - startTime;
  }

  return result;
}

// ─── Batch Deploy ────────────────────────────────────────────────────────────

/**
 * Deploy all contracts in topological order.
 * Skips already-deployed contracts (idempotent).
 * Continues on failure — does not abort the batch.
 */
export async function deployAll(
  config: NetworkConfig,
  orderedContracts: ContractEntry[],
  options: DeployOptions = {}
): Promise<DeployResult[]> {
  const results: DeployResult[] = [];

  // If specific contract requested, filter to just that contract + its transitive deps
  let toDeploy = orderedContracts;
  if (options.specificContract) {
    toDeploy = getTransitiveDeps(options.specificContract, orderedContracts);
    console.log(`\n📦 Deploying ${options.specificContract} and ${toDeploy.length} dependencies\n`);
  }

  // Get wallet
  const wallet = await getWallet(config);
  console.log(`  Deployer: ${wallet.address}`);
  console.log(`  Network: ${config.networkUrl}`);
  console.log(`  Mode: ${options.dryRun ? "DRY RUN" : "LIVE"}\n`);

  // Deploy in order
  for (let i = 0; i < toDeploy.length; i++) {
    const entry = toDeploy[i];
    console.log(`[${i + 1}/${toDeploy.length}] ${entry.name}`);

    const result = await deploySingleContract(entry, config, wallet, i, options.dryRun ?? false);
    results.push(result);
  }

  return results;
}

/**
 * Get a contract and all its transitive dependencies, in deployment order.
 */
function getTransitiveDeps(
  contractName: string,
  orderedContracts: ContractEntry[]
): ContractEntry[] {
  const contractMap = new Map(orderedContracts.map((c) => [c.name, c]));
  const needed = new Set<string>();

  function collectDeps(name: string) {
    if (needed.has(name)) return;
    needed.add(name);
    const entry = contractMap.get(name);
    if (entry) {
      for (const dep of entry.dependencies) {
        collectDeps(dep);
      }
    }
  }

  collectDeps(contractName);

  // Return in original order, filtered to needed
  return orderedContracts.filter((c) => needed.has(c.name));
}

/**
 * contractInitializer.ts
 * =======================
 * Post-deploy initialization: calls initialize() on each contract
 * in dependency order with correct principal arguments.
 *
 * Satisfies: PRD §4 (Smart Contract Status), Epic 1+2 (mainnet deploy)
 *            Engineering rules — idempotency, deterministic state transitions
 */

import {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  contractPrincipalCV,
  standardPrincipalCV,
  uintCV,
  type ClarityValue,
} from "@stacks/transactions";
import { StacksTestnet, StacksMainnet } from "@stacks/network-v6";
import { readFileSync } from "fs";
import { resolve } from "path";
import { generateWallet, getStxAddress } from "@stacks/wallet-sdk";
import type { NetworkConfig } from "./networkConfig.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InitStep {
  contract: string;
  function: string;
  description: string;
  args: (deployer: string, addresses: ContractAddresses) => ClarityValue[];
}

export interface ContractAddresses {
  [contractName: string]: string;
}

export interface InitResult {
  contract: string;
  function: string;
  txId: string | null;
  status: "initialized" | "skipped" | "failed";
  error: string | null;
  blockHeight: number | null;
}

// ─── Network Helpers ─────────────────────────────────────────────────────────

function getNetwork(config: NetworkConfig) {
  if (config.name === "mainnet") {
    return new StacksMainnet({ url: config.networkUrl });
  }
  return new StacksTestnet({ url: config.networkUrl });
}

async function getWallet(config: NetworkConfig) {
  const raw = readFileSync(resolve(config.deployerMnemonicPath), "utf-8");
  const match = raw.match(/^mnemonic\s*=\s*"(.+)"$/m);
  if (!match) throw new Error(`Could not find mnemonic in ${config.deployerMnemonicPath}`);
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

async function getNonce(address: string, config: NetworkConfig): Promise<number> {
  const resp = await fetch(`${config.networkUrl}/extended/v1/address/${address}/nonces`, {
    headers: { Accept: "application/json" },
  });
  const data: any = await resp.json();
  return data?.possible_next_nonce ?? 0;
}

async function callReadOnly(
  config: NetworkConfig,
  contractAddress: string,
  contractName: string,
  functionName: string,
  args: ClarityValue[]
): Promise<any> {
  const url = `${config.networkUrl}/v2/contracts/call-read/${contractAddress}/${contractName}/${functionName}`;
  const body = JSON.stringify({
    sender: config.deployerAddress,
    arguments: args.map((a) => JSON.stringify(a)),
  });

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  return resp.json();
}

async function waitForTx(txId: string, config: NetworkConfig): Promise<number> {
  const maxRetries = Math.ceil(config.confirmTimeoutMs / config.confirmPollIntervalMs);
  for (let i = 0; i < maxRetries; i++) {
    try {
      const resp = await fetch(`${config.networkUrl}/extended/v1/tx/${txId}`, {
        headers: { Accept: "application/json" },
      });
      const data: any = await resp.json();
      if (data.tx_status === "success") return data.block_height;
      if (data.tx_status === "abort_by_response" || data.tx_status === "abort_by_post_condition") {
        throw new Error(`Tx rejected: ${data.tx_result?.repr ?? "unknown"}`);
      }
    } catch (err: any) {
      if (err.message.startsWith("Tx rejected")) throw err;
    }
    await new Promise((r) => setTimeout(r, config.confirmPollIntervalMs));
  }
  throw new Error(`Timeout waiting for tx ${txId}`);
}

// ─── Initialization Steps ────────────────────────────────────────────────────

/**
 * All 12 initialization steps in dependency order.
 * Each step defines the contract, function, and arguments.
 */
function getInitSteps(): InitStep[] {
  return [
    {
      contract: "cinex-multisig",
      function: "initialize",
      description: "Initialize 2-of-3 multisig root admin",
      args: (deployer) => [
        standardPrincipalCV(deployer), // s1
        standardPrincipalCV(deployer), // s2 (will be rotated to real signers)
        standardPrincipalCV(deployer), // s3 (will be rotated to real signers)
      ],
    },
    {
      contract: "timelock",
      function: "set-multisig-addr",
      description: "Link timelock to multisig",
      args: (deployer) => [standardPrincipalCV(deployer)],
    },
    {
      contract: "asset-registry",
      function: "initialize",
      description: "Initialize asset registry with sBTC and USDCx",
      args: (_deployer, addresses) => [
        standardPrincipalCV(_deployer),                    // admin
        standardPrincipalCV(_deployer),                    // emergency
        contractPrincipalCV(
          addresses["sbtc-token"].split(".")[0],
          addresses["sbtc-token"].split(".")[1]
        ),                                                  // sBTC contract
        contractPrincipalCV(
          addresses["usdcx"].split(".")[0],
          addresses["usdcx"].split(".")[1]
        ),                                                  // USDCx contract
      ],
    },
    {
      contract: "oracle-proxy",
      function: "initialize",
      description: "Initialize STX/USD price oracle",
      args: (deployer) => [
        standardPrincipalCV(deployer), // admin
        standardPrincipalCV(deployer), // emergency
      ],
    },
    {
      contract: "project-verification-module",
      function: "initialize",
      description: "Initialize verification tier system",
      args: (deployer) => [
        standardPrincipalCV(deployer), // admin
        standardPrincipalCV(deployer), // emergency
      ],
    },
    {
      contract: "reputation",
      function: "initialize",
      description: "Initialize reputation system",
      args: (deployer) => [standardPrincipalCV(deployer)],
    },
    {
      contract: "campaign-module-2",
      function: "initialize",
      description: "Initialize campaign module (fixed version)",
      args: (deployer) => [standardPrincipalCV(deployer)],
    },
    {
      contract: "bitflow-strategy",
      function: "initialize",
      description: "Initialize Bitflow yield strategy (mock v1)",
      args: (deployer) => [
        standardPrincipalCV(deployer),                    // admin
        standardPrincipalCV(deployer),                    // emergency
        standardPrincipalCV("SP000000000000000000002Q6VF78"), // router (sentinel for mock)
        uintCV(0),                                         // pool-id (mock)
        standardPrincipalCV("SP000000000000000000002Q6VF78"), // base asset (sentinel)
      ],
    },
    {
      contract: "milestone-escrow",
      function: "initialize",
      description: "Initialize milestone escrow",
      args: (_deployer) => [
        contractPrincipalCV(
          _deployer,
          "campaign-module-2"
        ),                                                  // core (campaign-module-2)
        contractPrincipalCV(
          _deployer,
          "milestone-verification"
        ),                                                  // verification
      ],
    },
    {
      contract: "milestone-verification",
      function: "initialize",
      description: "Initialize milestone verification (backer voting)",
      args: (deployer) => [
        standardPrincipalCV(deployer),                    // admin
        standardPrincipalCV(deployer),                    // emergency
        contractPrincipalCV(deployer, "yield-escrow"),    // yield-escrow
        contractPrincipalCV(deployer, "milestone-escrow"), // escrow
      ],
    },
    {
      contract: "yield-escrow",
      function: "initialize",
      description: "Initialize yield escrow (70/20/10 split)",
      args: (deployer) => [
        standardPrincipalCV(deployer),                    // admin
        standardPrincipalCV(deployer),                    // emergency
        contractPrincipalCV(deployer, "milestone-escrow"), // escrow
        contractPrincipalCV(deployer, "milestone-verification"), // milestone-verification
      ],
    },
    {
      contract: "funding-pool",
      function: "initialize",
      description: "Initialize funding pool (shared capital pools)",
      args: (deployer) => [
        standardPrincipalCV(deployer),                    // admin
        standardPrincipalCV(deployer),                    // emergency
        contractPrincipalCV(deployer, "project-verification-module"), // verification
        contractPrincipalCV(deployer, "reputation"),      // reputation
        contractPrincipalCV(deployer, "milestone-escrow"), // escrow
      ],
    },
  ];
}

// ─── Main Initialization ─────────────────────────────────────────────────────

/**
 * Check if a contract is already initialized by calling a read-only getter.
 * Returns true if initialized, false otherwise.
 */
async function isInitialized(
  config: NetworkConfig,
  contractName: string
): Promise<boolean> {
  try {
    // Try calling get-admin or a similar getter — if it returns a value, it's initialized
    const result = await callReadOnly(
      config,
      config.deployerAddress,
      contractName,
      "get-admin",
      []
    );
    return result?.okay === true;
  } catch {
    return false;
  }
}

/**
 * Initialize all contracts in dependency order.
 * Skips contracts that are already initialized (idempotent).
 */
export async function initializeAll(
  config: NetworkConfig,
  contractAddresses: ContractAddresses,
  dryRun: boolean = false
): Promise<InitResult[]> {
  const results: InitResult[] = [];
  const wallet = await getWallet(config);
  const steps = getInitSteps();

  console.log("\n🔧 Initializing contracts");
  console.log(`  Deployer: ${wallet.address}`);
  console.log(`  Network: ${config.networkUrl}\n`);

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log(`[${i + 1}/${steps.length}] ${step.description}`);

    const result: InitResult = {
      contract: step.contract,
      function: step.function,
      txId: null,
      status: "failed",
      error: null,
      blockHeight: null,
    };

    try {
      // Check if already initialized (idempotency)
      const alreadyInit = await isInitialized(config, step.contract);
      if (alreadyInit) {
        result.status = "skipped";
        console.log(`  ⏭️  ${step.contract} — already initialized`);
        results.push(result);
        continue;
      }

      if (dryRun) {
        result.status = "initialized";
        console.log(`  🔍 ${step.contract} — DRY RUN: would initialize`);
        results.push(result);
        continue;
      }

      // Get nonce
      const nonce = await getNonce(wallet.address, config);

      // Build and broadcast
      const network = getNetwork(config);
      const args = step.args(wallet.address, contractAddresses);

      const tx = await makeContractCall({
        contractAddress: config.deployerAddress,
        contractName: step.contract,
        functionName: step.function,
        functionArgs: args,
        senderKey: wallet.privateKey,
        network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
        fee: Math.round(10_000 * config.feeMultiplier),
        nonce,
      });

      const broadcastResult = await broadcastTransaction(tx, network);

      if (broadcastResult.error || broadcastResult.reason) {
        result.error = `Broadcast error: ${broadcastResult.error} — ${broadcastResult.reason}`;
        console.log(`  ❌ ${result.error}`);
        results.push(result);
        continue;
      }

      const txId = `0x${broadcastResult.txid}`;
      result.txId = txId;
      console.log(`  🚀 ${step.contract}.${step.function} → ${txId}`);

      // Wait for confirmation
      const blockHeight = await waitForTx(txId, config);
      result.status = "initialized";
      result.blockHeight = blockHeight;
      console.log(`  ✅ Confirmed at block ${blockHeight}`);
    } catch (err: any) {
      result.error = err.message || String(err);
      console.log(`  ❌ ${result.error}`);
    }

    results.push(result);
  }

  return results;
}

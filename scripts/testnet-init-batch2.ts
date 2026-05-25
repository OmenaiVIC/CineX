/**
 * testnet-init-batch2.ts
 * ======================
 * Batch 2 initialization: asset-registry, milestone-escrow,
 * milestone-verification, yield-escrow, bitflow-strategy, funding-pool.
 *
 * Usage: npx tsx scripts/testnet-init-batch2.ts
 *
 * Prerequisites:
 *   - Batch 1 contracts initialized (testnet-init.ts ran successfully)
 *   - settings/Testnet.toml with deployer mnemonic
 *   - Sufficient testnet STX balance
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  type SignedContractCallOptions,
  contractPrincipalCV,
  standardPrincipalCV,
  uintCV,
  type ClarityValue,
} from "@stacks/transactions";
import { StacksTestnet } from "@stacks/network-v6";
import { generateWallet, getStxAddress } from "@stacks/wallet-sdk";

// ─── Configuration ───────────────────────────────────────────────────────────

const DEPLOYER_MNEMONIC = readMnemonic("settings/Testnet.toml");
const NETWORK = new StacksTestnet({ url: "https://api.testnet.hiro.so" });
const API_URL = "https://api.testnet.hiro.so";

const DEPLOYER = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
const BURN_ADDR = "SP000000000000000000002Q6VF78";

// External token contract IDs
const SBTC_CONTRACT = "ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token";
const USDCX_CONTRACT = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readMnemonic(tomlPath: string): string {
  const raw = readFileSync(resolve(tomlPath), "utf-8");
  const match = raw.match(/^mnemonic\s*=\s*"(.+)"$/m);
  if (!match) throw new Error(`Could not find mnemonic in ${tomlPath}`);
  return match[1].trim();
}

async function getWallet(index = 0) {
  const wallet = await generateWallet({
    secretKey: DEPLOYER_MNEMONIC,
    password: "cinex-deploy-2026",
  });
  const account = wallet.accounts[index];
  const privateKey = account.stxPrivateKey;
  const address = getStxAddress(account, "testnet");
  console.log(`  Wallet[${index}] address: ${address}`);
  return { privateKey, address };
}

async function callContract(
  privateKey: string,
  contractName: string,
  functionName: string,
  functionArgs: ClarityValue[],
  label?: string
): Promise<string> {
  const opts: SignedContractCallOptions = {
    contractAddress: DEPLOYER,
    contractName,
    functionName,
    functionArgs,
    senderKey: privateKey,
    network: NETWORK,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    fee: 10000,
  };

  const tx = await makeContractCall(opts);
  const result = await broadcastTransaction(tx, NETWORK);
  const txId = `0x${result.txid}`;

  const lbl = label || `${contractName}.${functionName}`;
  console.log(`  🚀 ${lbl} → ${txId}`);

  // Wait for confirmation
  await waitForTx(txId);
  return txId;
}

async function waitForTx(txId: string, maxRetries = 30): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const resp = await fetch(`${API_URL}/extended/v1/tx/${txId}`, {
        headers: { Accept: "application/json" },
      });
      const data = await resp.json();
      if (data.tx_status === "success") {
        console.log(`  ✅ Confirmed (block ${data.block_height})`);
        return;
      }
      if (data.tx_status === "pending" || data.tx_status === "queued") {
        console.log(`  ⏳ ${data.tx_status}... (${i + 1}/${maxRetries})`);
      } else if (["abort_by_response", "abort_by_post_condition"].includes(data.tx_status)) {
        console.error(`  ❌ Failed: ${data.tx_status}`, data.tx_result?.repr || "");
        return;
      }
    } catch {
      // API not yet seeing the tx — keep polling
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  console.log(`  ⚠️  Timed out waiting for ${txId} — check explorer`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔧 CineX Testnet Initialization — Batch 2");
  console.log("──────────────────────────────────────────\n");

  const { privateKey, address } = await getWallet();
  console.log(`  Deployer: ${address}\n`);

  // ── Batch 2: Remaining 6 contracts ──────────────────────────────────────

  // 1. asset-registry.initialize(admin, emergency, sbtc-contract, usdcx-contract)
  console.log("1. asset-registry.initialize");
  await callContract(
    privateKey,
    "asset-registry",
    "initialize",
    [
      standardPrincipalCV(DEPLOYER),  // admin (will be timelock)
      standardPrincipalCV(DEPLOYER),  // emergency (will be multisig)
      contractPrincipalCV("ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT", "sbtc-token"),
      contractPrincipalCV("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", "usdcx"),
    ],
    "asset-registry.initialize"
  );

  // 2. bitflow-strategy.initialize(admin, emergency, router, pool-id, asset)
  // Mock v1 — uses sentinel values for router/pool-id
  console.log("\n2. bitflow-strategy.initialize");
  await callContract(
    privateKey,
    "bitflow-strategy",
    "initialize",
    [
      standardPrincipalCV(DEPLOYER),  // admin
      standardPrincipalCV(DEPLOYER),  // emergency
      standardPrincipalCV(BURN_ADDR), // router (sentinel for mock)
      uintCV(0),                      // pool-id (mock)
      standardPrincipalCV(BURN_ADDR), // base asset (STX sentinel)
    ],
    "bitflow-strategy.initialize"
  );

  // 3. milestone-escrow.initialize(core=campaign-module-2, verification)
  console.log("\n3. milestone-escrow.initialize");
  await callContract(
    privateKey,
    "milestone-escrow",
    "initialize",
    [
      contractPrincipalCV(DEPLOYER, "campaign-module-2"),
      contractPrincipalCV(DEPLOYER, "milestone-verification"),
    ],
    "milestone-escrow.initialize"
  );

  // 4. milestone-verification.initialize(admin, emergency, yield-escrow, escrow)
  console.log("\n4. milestone-verification.initialize");
  await callContract(
    privateKey,
    "milestone-verification",
    "initialize",
    [
      standardPrincipalCV(DEPLOYER),  // admin
      standardPrincipalCV(DEPLOYER),  // emergency
      contractPrincipalCV(DEPLOYER, "yield-escrow"),
      contractPrincipalCV(DEPLOYER, "milestone-escrow"),
    ],
    "milestone-verification.initialize"
  );

  // 5. yield-escrow.initialize(admin, emergency, escrow, milestone-verification)
  console.log("\n5. yield-escrow.initialize");
  await callContract(
    privateKey,
    "yield-escrow",
    "initialize",
    [
      standardPrincipalCV(DEPLOYER),  // admin
      standardPrincipalCV(DEPLOYER),  // emergency
      contractPrincipalCV(DEPLOYER, "milestone-escrow"),
      contractPrincipalCV(DEPLOYER, "milestone-verification"),
    ],
    "yield-escrow.initialize"
  );

  // 6. funding-pool.initialize(admin, emergency, verification, reputation, escrow)
  console.log("\n6. funding-pool.initialize");
  await callContract(
    privateKey,
    "funding-pool",
    "initialize",
    [
      standardPrincipalCV(DEPLOYER),  // admin
      standardPrincipalCV(DEPLOYER),  // emergency
      contractPrincipalCV(DEPLOYER, "milestone-verification"),
      contractPrincipalCV(DEPLOYER, "reputation"),
      contractPrincipalCV(DEPLOYER, "milestone-escrow"),
    ],
    "funding-pool.initialize"
  );

  console.log("\n── Batch 2 complete ──");
  console.log("  All 6 contracts initialized on testnet.");
  console.log("\nNext: Phase B — Build & run testnet e2e test script.");
}

main().catch((err) => {
  console.error("\n❌ Fatal:", err.message);
  process.exit(1);
});

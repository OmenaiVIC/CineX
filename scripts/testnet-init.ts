/**
 * testnet-init.ts
 * ===============
 * Initializes deployed CineX contracts on testnet by calling initialize()
 * on each contract in dependency order.
 *
 * Usage: npx tsx scripts/testnet-init.ts
 *
 * Prerequisites:
 *   - Contracts deployed to testnet (see deployments/default.testnet-plan.yaml)
 *   - settings/Testnet.toml with deployer mnemonic
 *   - Sufficient testnet STX balance
 */

import { readFileSync, existsSync } from "fs";
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
  someCV,
  noneCV,
  type ClarityValue,
} from "@stacks/transactions";
import { StacksTestnet } from "@stacks/network-v6";
import { generateWallet, getStxAddress } from "@stacks/wallet-sdk";

// ─── Configuration ───────────────────────────────────────────────────────────

const DEPLOYER_MNEMONIC = readMnemonic("settings/Testnet.toml");
const NETWORK = new StacksTestnet({ url: "https://api.testnet.hiro.so" });
const API_URL = "https://api.testnet.hiro.so";

const DEPLOYER = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";

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
        // Still return — don't throw, let caller decide
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
  console.log("🔧 CineX Testnet Initialization");
  console.log("─────────────────────────────────\n");

  const { privateKey, address } = await getWallet();
  console.log(`  Deployer: ${address}\n`);

  // ── Batch 1: No external dependencies ─────────────────────────────────────

  console.log("── Batch 1: No external dependencies ──\n");

  // 1. cinex-multisig.initialize(s1, s2, s3)
  console.log("1. cinex-multisig.initialize");
  await callContract(
    privateKey,
    "cinex-multisig",
    "initialize",
    [
      standardPrincipalCV(DEPLOYER),
      standardPrincipalCV(DEPLOYER),
      standardPrincipalCV(DEPLOYER),
    ],
    "cinex-multisig.initialize"
  );

  // 2. timelock.set-multisig-addr(cinex-multisig)
  console.log("\n2. timelock.set-multisig-addr");
  await callContract(
    privateKey,
    "timelock",
    "set-multisig-addr",
    [standardPrincipalCV(DEPLOYER)],
    "timelock.set-multisig-addr"
  );

  // 3. oracle-proxy.initialize(admin=timelock, emergency=multisig)
  console.log("\n3. oracle-proxy.initialize");
  await callContract(
    privateKey,
    "oracle-proxy",
    "initialize",
    [standardPrincipalCV(DEPLOYER), standardPrincipalCV(DEPLOYER)],
    "oracle-proxy.initialize"
  );

  // 4. project-verification-module.initialize(admin=timelock, emergency=multisig)
  console.log("\n4. project-verification-module.initialize");
  await callContract(
    privateKey,
    "project-verification-module",
    "initialize",
    [standardPrincipalCV(DEPLOYER), standardPrincipalCV(DEPLOYER)],
    "project-verification-module.initialize"
  );

  // 5. reputation.initialize(admin=timelock)
  console.log("\n5. reputation.initialize");
  await callContract(
    privateKey,
    "reputation",
    "initialize",
    [standardPrincipalCV(DEPLOYER)],
    "reputation.initialize"
  );

  // 6. campaign-module-2.initialize(core=deployer)
  console.log("\n6. campaign-module-2.initialize");
  await callContract(
    privateKey,
    "campaign-module-2",
    "initialize",
    [standardPrincipalCV(DEPLOYER)],
    "campaign-module-2.initialize"
  );

  console.log("\n── Batch 1 complete ──");
  console.log("\n⚠️  Batch 2 requires sBTC + USDCx testnet token IDs.");
  console.log("   Run testnet-init-batch2.ts after looking those up.");
}

main().catch((err) => {
  console.error("\n❌ Fatal:", err.message);
  process.exit(1);
});

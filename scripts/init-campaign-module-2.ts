/**
 * init-campaign-module-2.ts
 * =========================
 * Initializes campaign-module-2 (the fixed version) on testnet.
 * Uses deployer account (the bug is now fixed, deployer can call).
 *
 * Already ran — kept for reference.
 * Usage: npx tsx scripts/init-campaign-module-2.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  standardPrincipalCV,
} from "@stacks/transactions";
import { StacksTestnet } from "@stacks/network-v6";
import { generateWallet, getStxAddress } from "@stacks/wallet-sdk";

const MNEMONIC = readMnemonic("settings/Testnet.toml");
const NETWORK = new StacksTestnet({ url: "https://api.testnet.hiro.so" });
const API_URL = "https://api.testnet.hiro.so";
const DEPLOYER = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";

function readMnemonic(tomlPath: string): string {
  const raw = readFileSync(resolve(tomlPath), "utf-8");
  const match = raw.match(/^mnemonic\s*=\s*"(.+)"$/m);
  if (!match) throw new Error(`Could not find mnemonic in ${tomlPath}`);
  return match[1].trim();
}

async function waitForTx(txId: string, maxRetries = 60): Promise<number> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const resp = await fetch(`${API_URL}/extended/v1/tx/${txId}`, {
        headers: { Accept: "application/json" },
      });
      const data = await resp.json();
      if (data.tx_status === "success") {
        console.log(`  ✅ Confirmed at block ${data.block_height}`);
        return data.block_height;
      }
      if (data.tx_status === "abort_by_response") {
        console.log(`  ❌ Reverted: ${data.tx_result?.repr || "unknown"}`);
        return 0;
      }
      if (data.tx_status === "pending" || data.tx_status === "queued") {
        if (i % 5 === 0) console.log(`  ⏳ ${data.tx_status}... (${i+1}/${maxRetries})`);
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 3000));
  }
  console.log(`  ⚠️  Timed out`);
  return 0;
}

async function main() {
  const wallet = await generateWallet({ secretKey: MNEMONIC, password: "cinex-deploy-v2" });
  const pk = wallet.accounts[0].stxPrivateKey;

  const resp = await fetch(`${API_URL}/extended/v1/address/${DEPLOYER}/nonces`, {
    headers: { Accept: "application/json" },
  });
  const nonceData = await resp.json();
  const nonce = nonceData.possible_next_nonce;

  console.log(`🔧 Initialize campaign-module-2`);
  console.log(`  Deployer: ${DEPLOYER}`);
  console.log(`  Nonce: ${nonce}\n`);

  const tx = await makeContractCall({
    contractAddress: DEPLOYER,
    contractName: "campaign-module-2",
    functionName: "initialize",
    functionArgs: [standardPrincipalCV(DEPLOYER)],
    senderKey: pk,
    network: NETWORK,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    fee: 10000,
    nonce,
  });

  const result = await broadcastTransaction(tx, NETWORK);
  if (result.error) {
    console.error(`❌ Broadcast error: ${result.error} — ${result.reason}`);
    process.exit(1);
  }
  const txId = `0x${result.txid}`;
  console.log(`  🚀 ${txId}`);

  const block = await waitForTx(txId);
  if (block) {
    console.log(`\n✅ campaign-module-2 initialized successfully`);
  } else {
    console.log(`\n❌ Failed`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`\n❌ Fatal:`, err.message);
  process.exit(1);
});

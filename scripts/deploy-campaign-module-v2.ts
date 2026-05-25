/**
 * deploy-campaign-module-v2.ts
 * ============================
 * Deploys the fixed campaign-module as campaign-module-2 on testnet.
 *
 * Usage: npx tsx scripts/deploy-campaign-module-v2.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import {
  makeContractDeploy,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
} from "@stacks/transactions";
import { StacksTestnet } from "@stacks/network-v6";
import { generateWallet, getStxAddress } from "@stacks/wallet-sdk";

const MNEMONIC = readMnemonic("settings/Testnet.toml");
const NETWORK = new StacksTestnet({ url: "https://api.testnet.hiro.so" });
const API_URL = "https://api.testnet.hiro.so";
const DEPLOYER = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
const CLARITY_SRC = readFileSync(resolve("contracts/campaign-module.clar"), "utf-8");

function readMnemonic(tomlPath: string): string {
  const raw = readFileSync(resolve(tomlPath), "utf-8");
  const match = raw.match(/^mnemonic\s*=\s*"(.+)"$/m);
  if (!match) throw new Error(`Could not find mnemonic in ${tomlPath}`);
  return match[1].trim();
}

async function getWallet() {
  const wallet = await generateWallet({ secretKey: MNEMONIC, password: "cinex-deploy-v2" });
  const account = wallet.accounts[0];
  return { privateKey: account.stxPrivateKey, address: getStxAddress(account, "testnet") };
}

async function getNonce(address: string): Promise<number> {
  const resp = await fetch(`${API_URL}/extended/v1/address/${address}/nonces`, {
    headers: { Accept: "application/json" },
  });
  const data = await resp.json();
  return data?.possible_next_nonce ?? 0;
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
      if (data.tx_status === "pending" || data.tx_status === "queued") {
        if (i % 5 === 0) console.log(`  ⏳ ${data.tx_status}... (${i + 1}/${maxRetries})`);
      } else {
        console.error(`  ❌ Failed: ${data.tx_status}`, data.tx_result?.repr || "");
        return 0;
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  console.log(`  ⚠️  Timed out`);
  return 0;
}

async function main() {
  console.log("🚀 Deploying campaign-module-2 (fixed initialize)\n");

  const { privateKey, address } = await getWallet();
  console.log(`  Deployer: ${address}`);

  const nonce = await getNonce(address);
  console.log(`  Nonce: ${nonce}`);

  const tx = await makeContractDeploy({
    contractName: "campaign-module-2",
    codeBody: CLARITY_SRC,
    senderKey: privateKey,
    network: NETWORK,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    fee: 50000,
    nonce,
  });

  const result = await broadcastTransaction(tx, NETWORK);
  console.log(`  Raw result: ${JSON.stringify(result)}`);
  if (result.error || result.reason) {
    console.error(`  ❌ Broadcast error: ${result.error || 'unknown'} — ${result.reason || result.message || 'no reason'}`);
    process.exit(1);
  }
  const txId = `0x${result.txid}`;
  console.log(`  🚀 Deploy tx: ${txId}`);

  const block = await waitForTx(txId);
  if (block) {
    const contractId = `${address}.campaign-module-2`;
    console.log(`\n  ✅ Deployed: ${contractId}`);
    console.log(`  📍 Block: ${block}`);
  } else {
    console.log(`\n  ❌ Deployment failed`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`\n❌ Fatal:`, err.message);
  process.exit(1);
});

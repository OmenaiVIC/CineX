/**
 * Testnet Deployment Script — Phase 1C
 *
 * Deploys cinex-smart-vault.clar to Stacks testnet:
 *   1. Generate deployer keypair (or use existing from DEPLOYER_KEY env)
 *   2. Request STX from Hiro testnet faucet
 *   3. Deploy vault contract
 *   4. Call onboard() with a P-256 public key
 *   5. Verify contract state via read-only call
 *   6. Save deployment info to JSON
 *
 * Usage:
 *   npx tsx scripts/testnet-deploy.ts
 *   DEPLOYER_KEY=<hex> npx tsx scripts/testnet-deploy.ts   # reuse existing key
 *
 * API notes (v6.17.0):
 *   - makeContractDeploy returns a Promise<StacksTransaction>
 *   - signWithKey(privateKey, messageHash) — two positional args, NOT an object
 *   - broadcastTransaction(tx, network) — takes StacksTransaction directly, calls .serialize()
 *   - getAddressFromPrivateKey(hexKey, TransactionVersion.Testnet) — hex string, NOT StacksPrivateKey
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  makeContractDeploy,
  makeContractCall,
  signWithKey,
  broadcastTransaction,
  getNonce,
  getAddressFromPrivateKey,
  makeRandomPrivKey,
  privateKeyToString,
  TransactionVersion,
  bufferCV,
  principalCV,
  uintCV,
  someCV,
  noneCV,
  stringAsciiCV,
} from "@stacks/transactions";
import { StacksTestnet } from "@stacks/network";
import { p256 } from "@noble/curves/nist.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");

// ── Constants ─────────────────────────────────────────────────────────────

const TESTNET = new StacksTestnet();
const HIRO_TESTNET_API = "https://api.testnet.hiro.so";
const HIRO_EXPLORER = "https://explorer.hiro.so";

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Step 1: Generate or load deployer key ─────────────────────────────────

async function getDeployerKey(): Promise<{ hex: string; stxAddress: string }> {
  const envKey = process.env.DEPLOYER_KEY;
  if (envKey) {
    const address = getAddressFromPrivateKey(envKey, TransactionVersion.Testnet);
    console.log(`🔑 Using existing deployer key: ${address}`);
    return { hex: envKey, stxAddress: address };
  }

  const privKey = makeRandomPrivKey();
  const hex = privateKeyToString(privKey);
  const address = getAddressFromPrivateKey(hex, TransactionVersion.Testnet);
  console.log(`🔑 Generated new deployer key: ${address}`);
  console.log(`   Private key (save this!): ${hex}`);
  return { hex, stxAddress: address };
}

// ── Step 2: Request faucet STX ───────────────────────────────────────────

async function requestFaucetStx(address: string): Promise<boolean> {
  console.log(`\n🚰 Requesting testnet STX from faucet for ${address}...`);
  try {
    const url = `${HIRO_TESTNET_API}/extended/v1/faucets/stx?address=${address}&stacking=false`;
    const res = await fetch(url, { method: "POST" });

    if (res.ok) {
      const data = (await res.json()) as { txId?: string };
      console.log(`   ✅ Faucet request sent. txId: ${data.txId ?? "(pending)"}`);
      return true;
    }

    const text = await res.text();
    if (text.includes("already") || text.includes("recently") || res.status === 429) {
      console.log(`   ⚠️  Faucet: rate-limited or already requested. Will check balance anyway.`);
      return true; // non-fatal, proceed to check balance
    }
    console.log(`   ❌ Faucet error (${res.status}): ${text.slice(0, 200)}`);
    return false;
  } catch (e: any) {
    console.log(`   ❌ Faucet request failed: ${e.message}`);
    return false;
  }
}

// ── Step 3: Wait for balance ─────────────────────────────────────────────

async function getBalance(address: string): Promise<number> {
  try {
    const res = await fetch(
      `${HIRO_TESTNET_API}/extended/v1/address/${address}/balances`
    );
    if (res.ok) {
      const data = (await res.json()) as {
        stx?: { balance?: string; total_sent?: string };
      };
      return Number(data.stx?.balance ?? "0");
    }
  } catch {
    // network hiccup
  }
  return 0;
}

async function waitForBalance(
  address: string,
  maxWaitMs = 120_000
): Promise<boolean> {
  console.log(`\n⏳ Waiting for STX balance...`);
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    const balance = await getBalance(address);
    if (balance > 0) {
      console.log(`   ✅ Balance: ${balance} µSTX (${balance / 1e6} STX)`);
      return true;
    }
    console.log(`   ⏳ Balance: ${balance} µSTX (waiting...)`);
    await delay(5000);
  }

  console.log(`   ❌ Timed out waiting for balance`);
  return false;
}

// ── Step 4: Deploy vault contract ────────────────────────────────────────

async function deployVaultContract(
  deployerHexKey: string,
  nonce: number
): Promise<string> {
  console.log(`\n📦 Deploying cinex-smart-vault.clar...`);

  const contractSource = readFileSync(
    resolve(PROJECT_ROOT, "contracts/cinex-smart-vault.clar"),
    "utf-8"
  );

  // makeContractDeploy with senderKey signs internally
  const tx = await makeContractDeploy({
    contractName: "cinex-smart-vault",
    codeBody: contractSource,
    senderKey: deployerHexKey,
    nonce,
    fee: 10000n,
    network: TESTNET,
  });

  console.log(`   txid: ${tx.txid()}`);
  const result = await broadcastTransaction(tx, TESTNET);

  if (result.error) {
    throw new Error(`Deploy failed: ${JSON.stringify(result)}`);
  }

  const txid = result.txid!;
  console.log(`   📤 Broadcast: ${txid}`);
  return txid;
}

// ── Step 5: Wait for tx confirmation ─────────────────────────────────────

async function waitForTxConfirm(
  txid: string,
  maxWaitMs = 180_000
): Promise<boolean> {
  console.log(`\n⏳ Waiting for tx ${txid} to confirm...`);
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await fetch(
        `${HIRO_TESTNET_API}/extended/v1/tx/${txid}`
      );
      if (res.ok) {
        const data = (await res.json()) as {
          tx_status?: string;
          block_height?: number;
          burn_block_time?: number;
        };
        if (data.tx_status === "success") {
          console.log(
            `   ✅ Confirmed in block ${data.block_height}`
          );
          return true;
        }
        if (data.tx_status === "abort_by_response" || data.tx_status === "abort_by_post_condition") {
          console.log(`   ❌ Transaction aborted: ${data.tx_status}`);
          return false;
        }
        console.log(`   ⏳ Status: ${data.tx_status}...`);
      }
    } catch {
      // retry
    }
    await delay(5000);
  }

  console.log(`   ❌ Timed out waiting for confirmation`);
  return false;
}

// ── Step 6: Call onboard() ───────────────────────────────────────────────

async function onboardUser(
  deployerHexKey: string,
  deployerAddress: string,
  userP256Pubkey: Uint8Array,
  nonce: number
): Promise<string> {
  console.log(`\n🔐 Calling onboard() with P-256 public key...`);
  console.log(`   Pubkey: ${Buffer.from(userP256Pubkey).toString("hex")}`);

  const contractId = `${deployerAddress}.cinex-smart-vault`;

  const tx = await makeContractCall({
    contractAddress: deployerAddress,
    contractName: "cinex-smart-vault",
    functionName: "onboard",
    functionArgs: [
      bufferCV(userP256Pubkey),
      principalCV(contractId),
    ],
    senderKey: deployerHexKey,
    nonce,
    fee: 10000n,
    network: TESTNET,
  });

  console.log(`   txid: ${tx.txid()}`);
  const result = await broadcastTransaction(tx, TESTNET);

  if (result.error) {
    throw new Error(`Onboard failed: ${JSON.stringify(result)}`);
  }

  const txid = result.txid!;
  console.log(`   📤 Broadcast: ${txid}`);
  return txid;
}

// ── Step 7: Verify contract state via read-only call ─────────────────────

async function verifyContract(
  deployerAddress: string,
  userP256Pubkey: Uint8Array
): Promise<void> {
  console.log(`\n🔍 Verifying contract state...`);

  const contractId = `${deployerAddress}.cinex-smart-vault`;

  // Check contract exists
  const infoRes = await fetch(
    `${HIRO_TESTNET_API}/extended/v1/contract/${contractId}`
  );
  if (infoRes.ok) {
    const info = (await infoRes.json()) as {
      tx_id?: string;
      deploy_block_height?: number;
      deployer_address?: string;
    };
    console.log(`   ✅ Contract deployed at block ${info.deploy_block_height}`);
    console.log(`   Deployer: ${info.deployer_address}`);
  } else {
    console.log(`   ⚠️  Contract info not available yet`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 CineX Pillar Testnet Deployment\n");

  // 1. Get deployer key
  const deployer = await getDeployerKey();

  // 2. Check existing balance
  const existingBalance = await getBalance(deployer.stxAddress);
  if (existingBalance > 0) {
    console.log(`\n💰 Existing balance: ${existingBalance} µSTX (${existingBalance / 1e6} STX)`);
  } else {
    // 3. Request faucet
    const faucetOk = await requestFaucetStx(deployer.stxAddress);
    if (!faucetOk) {
      console.log("\n❌ Could not request faucet STX. Aborting.");
      console.log(`   💡 Try requesting STX manually from:`);
      console.log(`      https://explorer.hiro.so/sandbox/faucet?chain=testnet`);
      console.log(`   💡 Or set DEPLOYER_KEY to an address with balance.`);
      process.exit(1);
    }

    // 4. Wait for balance
    const hasBalance = await waitForBalance(deployer.stxAddress);
    if (!hasBalance) {
      console.log("\n❌ No STX balance after faucet request. Aborting.");
      console.log(`   💡 Try requesting STX manually from:`);
      console.log(`      https://explorer.hiro.so/sandbox/faucet?chain=testnet`);
      process.exit(1);
    }
  }

  // 5. Get nonce
  const nonce = Number(await getNonce(deployer.stxAddress, TESTNET));
  console.log(`\n📋 Nonce: ${nonce}`);

  // 6. Deploy vault contract
  const deployTxid = await deployVaultContract(deployer.hex, nonce);

  // 7. Wait for deploy to confirm
  const deployed = await waitForTxConfirm(deployTxid);
  if (!deployed) {
    console.log("\n❌ Deploy transaction did not confirm. Aborting.");
    process.exit(1);
  }

  // 8. Generate a test user P-256 keypair (simulates WebAuthn)
  const userKeypair = p256.keygen();
  const userPubkey = new Uint8Array(
    userKeypair.publicRaw.slice(0, 33) // compressed P-256
  );
  console.log(`\n👤 Test user P-256 pubkey: ${Buffer.from(userPubkey).toString("hex")}`);

  // 9. Call onboard()
  const onboardTxid = await onboardUser(
    deployer.hex,
    deployer.stxAddress,
    userPubkey,
    nonce + 1
  );

  // 10. Wait for onboard to confirm
  const onboarded = await waitForTxConfirm(onboardTxid);
  if (!onboarded) {
    console.log("\n❌ Onboard transaction did not confirm. Aborting.");
    process.exit(1);
  }

  // 11. Verify contract state
  await verifyContract(deployer.stxAddress, userPubkey);

  // 12. Save deployment info
  const contractId = `${deployer.stxAddress}.cinex-smart-vault`;
  const deployment = {
    deployer: deployer.stxAddress,
    deployerKey: deployer.hex,
    contractId,
    contractName: "cinex-smart-vault",
    network: "testnet",
    deployTxid,
    onboardTxid,
    userP256Pubkey: Buffer.from(userPubkey).toString("hex"),
    userP256Privkey: Buffer.from(userKeypair.privateRaw).toString("hex"),
    deployedAt: new Date().toISOString(),
    explorerDeployUrl: `${HIRO_EXPLORER}/txid/${deployTxid}?chain=testnet`,
    explorerOnboardUrl: `${HIRO_EXPLORER}/txid/${onboardTxid}?chain=testnet`,
  };

  const outputPath = resolve(PROJECT_ROOT, "testnet-deployment.json");
  writeFileSync(outputPath, JSON.stringify(deployment, null, 2));
  console.log(`\n💾 Deployment info saved to: ${outputPath}`);

  console.log("\n✅ Testnet deployment complete!");
  console.log(`\nNext steps:`);
  console.log(`  1. View contract: ${deployment.explorerDeployUrl}`);
  console.log(`  2. View onboard:  ${deployment.explorerOnboardUrl}`);
  console.log(`  3. Test stx-transfer via relay pattern`);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});

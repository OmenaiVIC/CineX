/**
 * init-campaign-module.ts
 * =======================
 * Calls campaign-module.initialize() using a SECOND account from the mnemonic,
 * because campaign-module blocks CONTRACT-OWNER (deployer account[0]) from
 * calling initialize.
 *
 * Usage: npx tsx scripts/init-campaign-module.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import {
  makeContractCall,
  makeSTXTokenTransfer,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  type SignedContractCallOptions,
  standardPrincipalCV,
  type ClarityValue,
} from "@stacks/transactions";
import { StacksTestnet } from "@stacks/network-v6";
import { generateWallet, getStxAddress } from "@stacks/wallet-sdk";
import { mnemonicToSeed } from "bip39";
import { HDKey } from "@scure/bip32";

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

async function getWallet(index = 0) {
  const wallet = await generateWallet({ secretKey: MNEMONIC, password: "cinex-init" });
  const account = wallet.accounts[index];
  const privateKey = account.stxPrivateKey;
  const address = getStxAddress(account, "testnet");
  return { privateKey, address };
}

const STX_DERIVATION_PATH = "m/44'/5757'/0'/0";

async function getStxKeypair(mnemonic: string, index: number): Promise<{ privateKey: string; address: string }> {
  const seed = await mnemonicToSeed(mnemonic);
  const root = HDKey.fromMasterSeed(new Uint8Array(seed));
  const child = root.derive(STX_DERIVATION_PATH).deriveChild(index);
  if (!child.privateKey) throw new Error("No private key at derivation");

  // compressPrivateKey: 32 bytes raw → add 0x01 suffix (33 bytes)
  const pkBytes = child.privateKey;
  const privateKey = pkBytes.length === 33
    ? Buffer.from(pkBytes).toString("hex")
    : Buffer.from(pkBytes).toString("hex") + "01";

  const address = getStxAddress({ stxPrivateKey: privateKey }, "testnet");
  return { privateKey, address };
}

async function callContract(
  privateKey: string, contractName: string, functionName: string,
  functionArgs: ClarityValue[], label?: string
): Promise<string> {
  const opts: SignedContractCallOptions = {
    contractAddress: DEPLOYER, contractName, functionName, functionArgs,
    senderKey: privateKey, network: NETWORK, anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow, fee: 10000,
  };
  const tx = await makeContractCall(opts);
  const result = await broadcastTransaction(tx, NETWORK);
  const txId = `0x${result.txid}`;
  console.log(`  🚀 ${label || `${contractName}.${functionName}`} → ${txId}`);
  await waitForTx(txId);
  return txId;
}

async function waitForTx(txId: string, maxRetries = 60): Promise<void> {
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
        if (i % 5 === 0) console.log(`  ⏳ ${data.tx_status}... (${i + 1}/${maxRetries})`);
      } else if (["abort_by_response", "abort_by_post_condition"].includes(data.tx_status)) {
        console.error(`  ❌ Failed: ${data.tx_status}`, data.tx_result?.repr || "");
        return;
      }
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 3000));
  }
  console.log(`  ⚠️  Timed out for ${txId} — check explorer`);
}

async function getNonce(address: string): Promise<number> {
  const resp = await fetch(`${API_URL}/extended/v1/address/${address}/nonces`, {
    headers: { Accept: "application/json" },
  });
  const data = await resp.json();
  return data?.possible_next_nonce ?? 0;
}

async function main() {
  console.log("🔧 campaign-module.initialize fix\n");

  const { privateKey: pkDeployer } = await getWallet(0);
  const { privateKey: pkAcc1, address: addrAcc1 } = await getStxKeypair(MNEMONIC, 1);

  console.log(`  Deployer: ${DEPLOYER}`);
  console.log(`  Account[1]: ${addrAcc1}`);

  // Check account[1] balance and fund if needed
  const resp = await fetch(`${API_URL}/extended/v1/address/${addrAcc1}/balances`, {
    headers: { Accept: "application/json" },
  });
  const bal = await resp.json();
  const stxBal = BigInt(bal?.stx?.balance || "0");
  console.log(`  Account[1] STX balance: ${(Number(stxBal) / 1e6).toFixed(2)} STX`);

  if (stxBal < 1_000_000n) {
    console.log(`\n  Funding ${addrAcc1} with 100 STX...`);
    const acc1Nonce = await getNonce(addrAcc1);
    console.log(`  Account[1] nonce: ${acc1Nonce}`);

    // Need to send STX from deployer — first check deployer's nonce
    const deployerNonce = await getNonce(DEPLOYER);
    console.log(`  Deployer nonce: ${deployerNonce}`);

    const transferTx = await makeSTXTokenTransfer({
      recipient: addrAcc1,
      amount: 100_000_000n,
      senderKey: pkDeployer,
      network: NETWORK,
      nonce: deployerNonce,
      anchorMode: AnchorMode.Any,
      memo: "fund acc1 for init",
    });
    const result = await broadcastTransaction(transferTx, NETWORK);
    console.log(`  🚀 STX transfer → 0x${result.txid}`);
    await waitForTx(`0x${result.txid}`);
  }

  // Call campaign-module.initialize from account[1]
  console.log(`\n  Calling campaign-module.initialize from ${addrAcc1}...`);
  const acc1Nonce = await getNonce(addrAcc1);
  console.log(`  Account[1] nonce: ${acc1Nonce}`);

  await callContract(
    pkAcc1, "campaign-module", "initialize",
    [standardPrincipalCV(DEPLOYER)],
    "campaign-module.initialize"
  );

  console.log(`\n✅ campaign-module initialized successfully`);
}

main().catch((err) => {
  console.error(`\n❌ Fatal:`, err.message);
  process.exit(1);
});

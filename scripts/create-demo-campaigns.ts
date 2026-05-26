/**
 * create-demo-campaigns.ts
 * ========================
 * One-time script to create 4 demo campaigns on testnet.
 * Creates campaigns in BOTH milestone-escrow and campaign-module-2
 * with aligned IDs.
 *
 * Usage: npx tsx scripts/create-demo-campaigns.ts
 *
 * Prerequisites:
 *   - All contracts deployed + initialized on testnet
 *   - settings/Testnet.toml with deployer mnemonic
 *   - Sufficient testnet STX in creator wallet (index 1)
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
  stringAsciiCV,
  tupleCV,
  listCV,
  type ClarityValue,
} from "@stacks/transactions";
import { StacksTestnet } from "@stacks/network-v6";
import { generateWallet, generateNewAccount, getStxAddress } from "@stacks/wallet-sdk";

const DEPLOYER_MNEMONIC = readMnemonic("settings/Testnet.toml");
const NETWORK = new StacksTestnet({ url: "https://api.testnet.hiro.so" });
const API_URL = "https://api.testnet.hiro.so";
const DEPLOYER = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
const STX_ASSET = "SP000000000000000000002Q6VF78";

const DEMO_CAMPAIGNS = [
  {
    id: 1,
    title: "Rain",
    description: "A cinematic exploration of urban isolation",
    goal: 200_000_000,
    milestones: [
      { name: "Pre-production", amount: 50_000_000 },
      { name: "Production", amount: 50_000_000 },
      { name: "Post-production", amount: 100_000_000 },
    ],
  },
  {
    id: 2,
    title: "Death of Eternity",
    description: "A sci-fi thriller about mortality",
    goal: 150_000_000,
    milestones: [
      { name: "Script & Storyboard", amount: 30_000_000 },
      { name: "Principal Photography", amount: 70_000_000 },
      { name: "VFX & Editing", amount: 50_000_000 },
    ],
  },
  {
    id: 3,
    title: "PrePARE VR",
    description: "VR training for emergency responders",
    goal: 300_000_000,
    milestones: [
      { name: "Prototype", amount: 60_000_000 },
      { name: "User Testing", amount: 90_000_000 },
      { name: "Production Release", amount: 150_000_000 },
    ],
  },
  {
    id: 4,
    title: "Northern Travels",
    description: "A documentary on Arctic indigenous communities",
    goal: 120_000_000,
    milestones: [
      { name: "Research", amount: 24_000_000 },
      { name: "Expedition", amount: 48_000_000 },
      { name: "Post-production", amount: 48_000_000 },
    ],
  },
];

function readMnemonic(tomlPath: string): string {
  const raw = readFileSync(resolve(tomlPath), "utf-8");
  const match = raw.match(/^mnemonic\s*=\s*"(.+)"$/m);
  if (!match) throw new Error(`Could not find mnemonic in ${tomlPath}`);
  return match[1].trim();
}

async function getWallet() {
  let wallet = await generateWallet({ secretKey: DEPLOYER_MNEMONIC, password: "" });
  while (wallet.accounts.length <= 4) {
    wallet = generateNewAccount(wallet);
  }
  return wallet.accounts.map((acct: any) => ({
    privateKey: acct.stxPrivateKey,
    address: getStxAddress(acct, "testnet"),
  }));
}

const _nonces: Record<string, number> = {};

async function ensureNonce(address: string): Promise<number> {
  const resp = await fetch(`${API_URL}/v2/accounts/${address}?proof=0`, {
    headers: { Accept: "application/json" },
  });
  const data = await resp.json();
  const chainNonce = Number(data.nonce);
  if (!(address in _nonces) || chainNonce > _nonces[address]) {
    _nonces[address] = chainNonce;
  }
  return _nonces[address];
}

function advanceNonce(address: string): void {
  _nonces[address] = (_nonces[address] || 0) + 1;
}

async function callContract(
  privateKey: string,
  contractName: string,
  functionName: string,
  functionArgs: ClarityValue[],
  label?: string,
): Promise<string> {
  const accounts = await getWallet();
  const account = accounts.find((a) => a.privateKey === privateKey);
  if (!account) throw new Error("Account not found for key");
  const nonce = await ensureNonce(account.address);
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
    nonce,
  };
  const tx = await makeContractCall(opts);
  const result = await broadcastTransaction(tx, NETWORK);
  advanceNonce(account.address);
  const txId = `0x${result.txid}`;
  console.log(`  🚀 ${label || `${contractName}.${functionName}`} → ${txId}`);
  await waitForTx(txId);
  return txId;
}

async function waitForTx(txId: string, maxRetries = 90): Promise<void> {
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
        console.error(`  ❌ Failed: ${data.tx_status} ${data.tx_result?.repr || ""}`);
        return;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 3000));
  }
  console.log(`  ⚠️  Timed out for ${txId} — check explorer`);
}

async function readOnlyCall(contractName: string, functionName: string, args: ClarityValue[]) {
  const resp = await fetch(
    `${API_URL}/v2/contracts/call-read/${DEPLOYER}/${contractName}/${functionName}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender: DEPLOYER, arguments: args.map((a) => a.toString()) }),
    }
  );
  return resp.json();
}

async function escrowCampaignExists(id: number): Promise<boolean> {
  try {
    const data = await readOnlyCall("milestone-escrow", "get-campaign", [uintCV(id)]);
    if (data.okay && data.result) {
      return data.result.replace("0x", "").startsWith("070a");
    }
    return false;
  } catch {
    return false;
  }
}

async function cmCampaignExists(id: number): Promise<boolean> {
  try {
    const data = await readOnlyCall("campaign-module-2", "get-campaign", [uintCV(id)]);
    if (data.okay && data.result) {
      return data.result.replace("0x", "").startsWith("07");
    }
    return false;
  } catch {
    return false;
  }
}

async function getNextCMCampaignId(): Promise<number> {
  try {
    const data = await readOnlyCall("campaign-module-2", "get-total-campaigns", []);
    if (data.okay && data.result) {
      const hex = data.result.replace("0x", "");
      const bytes = Buffer.from(hex, "hex");
      if (bytes.length >= 18) {
        return Number(bytes.readBigUInt64BE(bytes.length - 8)) + 1;
      }
    }
    return 1;
  } catch {
    return 1;
  }
}

async function main() {
  console.log("🔧 Create Demo Campaigns");
  console.log("════════════════════════\n");

  const accounts = await getWallet();
  const creator = accounts[1];
  const deployer = accounts[0];
  console.log(`  Creator:  ${creator.address}`);
  console.log(`  Deployer: ${deployer.address}\n`);

  // 1. Set oracle price if not already set
  console.log("── Setting oracle STX price ──\n");
  await callContract(deployer.privateKey, "oracle-proxy", "emergency-set-price", [uintCV(250)], "oracle-set-price");

  // 2. Pre-compute far-future deadline
  const resp = await fetch(`${API_URL}/v2/info`, { headers: { Accept: "application/json" } });
  const info: any = await resp.json() as any;
  const currentBlock = info.stacks_tip_height;
  const deadline = currentBlock + 50000;
  console.log(`  Current block: ${currentBlock}, deadline: ${deadline}\n`);

  // 3. Get current CM campaign counter
  let cmNext = await getNextCMCampaignId();
  console.log(`  campaign-module-2 next ID: ${cmNext}\n`);

  for (const camp of DEMO_CAMPAIGNS) {
    // Effective ID = max(camp.id, cmNext) to handle auto-increment overflow
    const eid = Math.max(camp.id, cmNext);
    console.log(`── Campaign ${eid}: ${camp.title} ──`);

    // Create escrow campaign at the effective ID
    const escrowExists = await escrowCampaignExists(eid);
    if (!escrowExists) {
      console.log(`  Creating milestone-escrow campaign ${eid}...`);
      const milestones = camp.milestones.map((m) =>
        tupleCV({ name: stringAsciiCV(m.name.substring(0, 64)), amount: uintCV(m.amount) })
      );
      await callContract(
        creator.privateKey,
        "milestone-escrow",
        "create-campaign",
        [uintCV(eid), standardPrincipalCV(STX_ASSET), uintCV(camp.goal), listCV(milestones), uintCV(deadline)],
        `escrow-create-${eid}`
      );
    } else {
      console.log(`  milestone-escrow campaign ${eid} already exists`);
    }

    // Create CM campaign (auto-increments to eid since cmNext === eid)
    const cmExists = await cmCampaignExists(eid);
    if (!cmExists) {
      console.log(`  Creating campaign-module-2 campaign ${eid}...`);
      await callContract(
        creator.privateKey,
        "campaign-module-2",
        "create-campaign",
        [
          stringAsciiCV(camp.description.substring(0, 500)),
          uintCV(0),
          uintCV(camp.goal),
          uintCV(5000),
          uintCV(3),
          stringAsciiCV("Digital Postcard + Credits"),
          contractPrincipalCV(DEPLOYER, "project-verification-module"),
        ],
        `cm-create-${eid}`
      );
    } else {
      console.log(`  campaign-module-2 campaign ${eid} already exists`);
    }

    console.log(`  → ID ${eid}: escrow ✅  cm ✅\n`);
    cmNext = eid + 1;
  }

  console.log("════════════════════════");
  console.log("✅ All demo campaigns created!");
  console.log(`   Actual IDs: ${DEMO_CAMPAIGNS.map((_, i) => 16 + i + 1).join(', ')}`);
  console.log("   Update backend DEMO_CAMPAIGNS config if IDs differ.");
  console.log("   Fund backer wallet before demo: contribute(amount)");
}

main().catch((err) => {
  console.error("\n❌ Fatal:", err.message);
  process.exit(1);
});

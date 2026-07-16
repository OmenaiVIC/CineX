/**
 * parameterize-pilot-campaigns.ts
 * ===============================
 * One-time admin script to create pilot campaigns on mainnet.
 * Reads campaign JSON files, converts NGN→USDCx, and creates
 * campaigns in both milestone-escrow and campaign-module-2.
 *
 * Usage:
 *   npx tsx scripts/parameterize-pilot-campaigns.ts              # dry-run
 *   npx tsx scripts/parameterize-pilot-campaigns.ts --execute    # broadcast
 *
 * Prerequisites:
 *   - settings/Mainnet.toml with deployer mnemonic
 *   - CINEX_MAINNET_DEPLOYER env var set
 *   - All contracts deployed and initialized on mainnet
 *   - Campaign JSON files in campaigns/ directory
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
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
import { StacksMainnet } from "@stacks/network-v6";
import { generateWallet, generateNewAccount, getStxAddress } from "@stacks/wallet-sdk";

// ─── Configuration ───────────────────────────────────────────────────────────

const CAMPAIGNS_DIR = resolve("campaigns");
const DEPLOYER_MNEMONIC = readMnemonic(resolve("settings", "Mainnet.toml"));
const API_URL = "https://api.mainnet.hiro.so";
const NETWORK = new StacksMainnet({ url: API_URL });
const USDCX_DECIMALS = 6;

const DRY_RUN = !process.argv.includes("--execute");

// ─── Types ───────────────────────────────────────────────────────────────────

interface MilestoneInput {
  name: string;
  amount_ngn: number;
}

interface CampaignInput {
  id: number;
  title: string;
  description: string;
  goal_ngn: number;
  milestones: MilestoneInput[];
  exchange_rate_ngn_per_usd: number;
  usdcx_principal: string;
  creator_address: string;
  approval_window_blocks: number;
  fee_bps: number;
  network: string;
}

interface MilestoneFinal {
  name: string;
  amount_ngn: number;
  amount_usdcx: number;
}

interface CampaignArtifact extends CampaignInput {
  goal_usdcx: number;
  milestones: MilestoneFinal[];
  artifacts: {
    escrow_tx_id: string | null;
    escrow_contract_id: string | null;
    cm_tx_id: string | null;
    cm_contract_id: string | null;
    verification_fee_stx: number | null;
    created_at: string | null;
    goal_usdcx_final: number | null;
    milestones_final: MilestoneFinal[] | null;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readMnemonic(tomlPath: string): string {
  const raw = readFileSync(tomlPath, "utf-8");
  const match = raw.match(/^mnemonic\s*=\s*"(.+)"$/m);
  if (!match) throw new Error(`Could not find mnemonic in ${tomlPath}`);
  return match[1].trim();
}

function ngnKoboToUsdcx(ngnKobo: number, rate: number): number {
  // NGN kobo → USD → USDCx smallest units
  // ₦1 kobo = ₦0.01 → $0.01/rate → 0.01/rate × 10^6 USDCx
  return Math.round((ngnKobo / 100 / rate) * 10 ** USDCX_DECIMALS);
}

function getDeployerAddress(): string {
  const addr = process.env.CINEX_MAINNET_DEPLOYER;
  if (!addr) throw new Error("CINEX_MAINNET_DEPLOYER env var required");
  return addr;
}

async function getWallet() {
  let wallet = await generateWallet({ secretKey: DEPLOYER_MNEMONIC, password: "" });
  while (wallet.accounts.length <= 4) {
    wallet = generateNewAccount(wallet);
  }
  const deployerAddr = getDeployerAddress();
  const accounts = wallet.accounts.map((acct: any) => ({
    privateKey: acct.stxPrivateKey,
    address: getStxAddress(acct, "mainnet"),
  }));
  const deployer = accounts.find((a) => a.address === deployerAddr);
  if (!deployer) throw new Error(`Deployer ${deployerAddr} not found in wallet`);
  return { deployer, accounts };
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
  fee?: number,
): Promise<string | null> {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] ${contractName}.${functionName}(${functionArgs.map(() => "...").join(", ")})`);
    return null;
  }

  const resp = await fetch(`${API_URL}/v2/accounts/${getDeployerAddress()}?proof=0`);
  const acctData = await resp.json();
  const account = { address: getDeployerAddress(), privateKey };

  const nonce = await ensureNonce(account.address);
  const opts: SignedContractCallOptions = {
    contractAddress: getDeployerAddress(),
    contractName,
    functionName,
    functionArgs,
    senderKey: privateKey,
    network: NETWORK,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    fee: fee ?? 100000,
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

async function waitForTx(txId: string, maxRetries = 120): Promise<void> {
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
        if (i % 10 === 0) console.log(`  ⏳ ${data.tx_status}... (${i + 1}/${maxRetries})`);
      } else if (["abort_by_response", "abort_by_post_condition"].includes(data.tx_status)) {
        console.error(`  ❌ Failed: ${data.tx_status} ${data.tx_result?.repr || ""}`);
        return;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 5000));
  }
  console.log(`  ⚠️  Timed out for ${txId} — check explorer`);
}

async function readOnlyCall(contractName: string, functionName: string, args: ClarityValue[]) {
  const resp = await fetch(
    `${API_URL}/v2/contracts/call-read/${getDeployerAddress()}/${contractName}/${functionName}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender: getDeployerAddress(), arguments: args.map((a) => a.toString()) }),
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

// ─── Validation ──────────────────────────────────────────────────────────────

function validateCampaign(c: CampaignInput): string[] {
  const errors: string[] = [];
  if (!c.id || c.id < 1) errors.push("id must be >= 1");
  if (!c.title || c.title.length > 64) errors.push("title required, max 64 chars");
  if (!c.description || c.description.length > 500) errors.push("description required, max 500 chars");
  if (!c.goal_ngn || c.goal_ngn < 1) errors.push("goal_ngn must be >= 1");
  if (!c.milestones || c.milestones.length < 1 || c.milestones.length > 10) {
    errors.push("milestones: 1-10 required");
  }
  if (!c.exchange_rate_ngn_per_usd || c.exchange_rate_ngn_per_usd <= 0) {
    errors.push("exchange_rate_ngn_per_usd must be > 0");
  }
  if (!c.usdcx_principal) errors.push("usdcx_principal required");
  if (!c.creator_address || c.creator_address === "PLACEHOLDER_PRODUCER_ADDRESS") {
    errors.push("creator_address must be set (PLACEHOLDER not allowed)");
  }
  if (!c.approval_window_blocks || c.approval_window_blocks < 1) {
    errors.push("approval_window_blocks must be >= 1");
  }
  if (c.fee_bps !== undefined && (c.fee_bps < 0 || c.fee_bps > 2500)) {
    errors.push("fee_bps must be between 0 and 2500");
  }
  if (c.network !== "mainnet" && c.network !== "testnet") {
    errors.push("network must be mainnet or testnet");
  }
  return errors;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔧 CineX Pilot Campaign Parameterization");
  console.log("═══════════════════════════════════════════");
  console.log(`  Mode: ${DRY_RUN ? "DRY RUN (use --execute to broadcast)" : "LIVE EXECUTION"}\n`);

  const { deployer } = await getWallet();
  console.log(`  Deployer: ${deployer.address}\n`);

  // Fetch current block height
  const infoResp = await fetch(`${API_URL}/v2/info`, { headers: { Accept: "application/json" } });
  const info: any = await infoResp.json();
  const currentBlock = info.stacks_tip_height;
  console.log(`  Current block: ${currentBlock}\n`);

  // Read campaign JSON files
  const files = readdirSync(CAMPAIGNS_DIR).filter((f) => f.endsWith(".json") && f !== "schema.json");
  console.log(`  Found ${files.length} campaign files\n`);

  const artifacts: CampaignArtifact[] = [];

  for (const file of files) {
    const raw = readFileSync(resolve(CAMPAIGNS_DIR, file), "utf-8");
    const campaign: CampaignInput = JSON.parse(raw);

    console.log(`── Campaign ${campaign.id}: ${campaign.title} ──`);

    // Validate
    const errors = validateCampaign(campaign);
    if (errors.length > 0) {
      console.error(`  ❌ Validation errors:\n${errors.map((e) => `     - ${e}`).join("\n")}`);
      continue;
    }

    // Compute USDCx amounts
    const rate = campaign.exchange_rate_ngn_per_usd;
    const goalUsdcx = ngnKoboToUsdcx(campaign.goal_ngn, rate);
    const milestonesFinal: MilestoneFinal[] = campaign.milestones.map((m) => ({
      name: m.name,
      amount_ngn: m.amount_ngn,
      amount_usdcx: ngnKoboToUsdcx(m.amount_ngn, rate),
    }));

    // Verify milestone sum equals goal
    const milestoneSum = milestonesFinal.reduce((s, m) => s + m.amount_usdcx, 0);
    if (Math.abs(milestoneSum - goalUsdcx) > 1) {
      console.error(`  ❌ Milestone sum (${milestoneSum}) ≠ goal (${goalUsdcx}) — rounding mismatch`);
      continue;
    }

    console.log(`  Goal: ₦${(campaign.goal_ngn / 100).toLocaleString()} → ${goalUsdcx.toLocaleString()} USDCx`);
    console.log(`  Rate: ₦${rate}/$1`);
    for (const m of milestonesFinal) {
      console.log(`    ${m.name}: ₦${(m.amount_ngn / 100).toLocaleString()} → ${m.amount_usdcx.toLocaleString()} USDCx`);
    }

    // Compute deadline
    const deadline = currentBlock + campaign.approval_window_blocks;
    console.log(`  Deadline: block ${deadline} (+${campaign.approval_window_blocks})`);

    // Build artifact
    const artifact: CampaignArtifact = {
      ...campaign,
      goal_usdcx: goalUsdcx,
      milestones: milestonesFinal,
      artifacts: {
        escrow_tx_id: null,
        escrow_contract_id: null,
        cm_tx_id: null,
        cm_contract_id: null,
        verification_fee_stx: null,
        created_at: null,
        goal_usdcx_final: null,
        milestones_final: null,
      },
    };

    // Create milestone-escrow campaign
    const escrowExists = await escrowCampaignExists(campaign.id);
    if (!escrowExists) {
      console.log(`  Creating milestone-escrow campaign ${campaign.id}...`);
      const msClarity = milestonesFinal.map((m) =>
        tupleCV({ name: stringAsciiCV(m.name.substring(0, 64)), amount: uintCV(m.amount_usdcx) })
      );
      const txId = await callContract(
        deployer.privateKey,
        "milestone-escrow",
        "create-campaign",
        [
          uintCV(campaign.id),
          standardPrincipalCV(campaign.usdcx_principal),
          uintCV(goalUsdcx),
          listCV(msClarity),
          uintCV(deadline),
        ],
        `escrow-create-${campaign.id}`,
      );
      if (txId) {
        artifact.artifacts.escrow_tx_id = txId;
        artifact.artifacts.escrow_contract_id = `${deployer.address}.milestone-escrow`;
        artifact.artifacts.verification_fee_stx = 2000000; // approximate
      }
    } else {
      console.log(`  ⏭️  Escrow campaign ${campaign.id} already exists`);
    }

    // Create campaign-module-2 campaign
    const cmExists = await cmCampaignExists(campaign.id);
    if (!cmExists) {
      console.log(`  Creating campaign-module-2 campaign ${campaign.id}...`);
      const txId = await callContract(
        deployer.privateKey,
        "campaign-module-2",
        "create-campaign",
        [
          stringAsciiCV(campaign.description.substring(0, 500)),
          uintCV(campaign.id), // project-id
          uintCV(goalUsdcx),
          uintCV(campaign.approval_window_blocks),
          uintCV(campaign.milestones.length),
          stringAsciiCV(campaign.title.substring(0, 100)),
          contractPrincipalCV(deployer.address, "project-verification-module"),
        ],
        `cm-create-${campaign.id}`,
      );
      if (txId) {
        artifact.artifacts.cm_tx_id = txId;
        artifact.artifacts.cm_contract_id = `${deployer.address}.campaign-module-2`;
      }
    } else {
      console.log(`  ⏭️  Campaign-module-2 campaign ${campaign.id} already exists`);
    }

    // Finalize artifact
    artifact.artifacts.created_at = new Date().toISOString();
    artifact.artifacts.goal_usdcx_final = goalUsdcx;
    artifact.artifacts.milestones_final = milestonesFinal;

    artifacts.push(artifact);
    console.log(`  → ID ${campaign.id}: escrow ${escrowExists ? "⏭️" : "✅"}  cm ${cmExists ? "⏭️" : "✅"}\n`);
  }

  // Write artifacts
  if (artifacts.length > 0) {
    for (const a of artifacts) {
      const slug = a.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const artifactPath = resolve(CAMPAIGNS_DIR, `${slug}-artifact.json`);
      writeFileSync(artifactPath, JSON.stringify(a, null, 2), "utf-8");
      console.log(`📝 Artifact: ${artifactPath}`);
    }
  }

  console.log("\n═══════════════════════════════════════════");
  console.log(DRY_RUN ? "✅ Dry run complete — no transactions broadcast." : "✅ All campaigns created!");
  console.log("═══════════════════════════════════════════");
}

main().catch((err) => {
  console.error("\n❌ Fatal:", err.message);
  process.exit(1);
});

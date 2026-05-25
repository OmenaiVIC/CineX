/**
 * testnet-e2e.ts
 * ==============
 * End-to-end test of the CineX protocol on testnet.
 * Replicates the 5 flows from tests/integration.test.ts
 * using real on-chain transactions.
 *
 * Usage: npx tsx scripts/testnet-e2e.ts
 *
 * Prerequisites:
 *   - All contracts deployed + initialized (Phases A complete)
 *   - settings/Testnet.toml with deployer mnemonic
 *   - Sufficient testnet STX in deployer, creator, backer accounts
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
  boolCV,
  cvToHex,
  cvToString,
  stringAsciiCV,
  tupleCV,
  listCV,
  bufferCV,
  noneCV,
  type ClarityValue,
} from "@stacks/transactions";
import { StacksTestnet } from "@stacks/network-v6";
import { generateWallet, generateNewAccount, getStxAddress } from "@stacks/wallet-sdk";

// ─── Configuration ───────────────────────────────────────────────────────────

const DEPLOYER_MNEMONIC = readMnemonic("settings/Testnet.toml");
const NETWORK = new StacksTestnet({ url: "https://api.testnet.hiro.so" });
const API_URL = "https://api.testnet.hiro.so";

const DEPLOYER = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
const STX_ASSET = "SP000000000000000000002Q6VF78";

const TARGET_AMOUNT = 200000000;  // 200 STX — fits within backer2's balance (~200 STX)
const CAMPAIGN_DURATION = 5000;  // blocks (must be >=4320, <=8640)
const FAR_FUTURE = 2300000000;   // far-future block height
const MIN_API_INTERVAL = 1500;   // ms between API calls (avoid Hiro rate limit)

// ─── Helpers ─────────────────────────────────────────────────────────────────

let lastApiCall = 0;
async function rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastApiCall;
  if (elapsed < MIN_API_INTERVAL) {
    await new Promise(r => setTimeout(r, MIN_API_INTERVAL - elapsed));
  }
  lastApiCall = Date.now();
}

function readMnemonic(tomlPath: string): string {
  const raw = readFileSync(resolve(tomlPath), "utf-8");
  const match = raw.match(/^mnemonic\s*=\s*"(.+)"$/m);
  if (!match) throw new Error(`Could not find mnemonic in ${tomlPath}`);
  return match[1].trim();
}

// Generate wallet with enough accounts up to maxIndex
async function getWallet(maxIndex: number) {
  let wallet = await generateWallet({
    secretKey: DEPLOYER_MNEMONIC,
    password: "cinex-deploy-2026",
  });
  while (wallet.accounts.length <= maxIndex) {
    wallet = generateNewAccount(wallet);
  }
  return wallet.accounts.map((account: any, i: number) => ({
    privateKey: account.stxPrivateKey as string,
    address: getStxAddress(account, "testnet") as string,
    index: i,
  }));
}

async function getCurrentBlockHeight(): Promise<number> {
  const resp = await fetch(`${API_URL}/v2/info`, {
    headers: { Accept: "application/json" },
  });
  const data = await resp.json();
  return data.stacks_tip_height;
}

async function getStxBalance(address: string): Promise<number> {
  try {
    const resp = await fetch(`${API_URL}/extended/v1/address/${address}/stx`, {
      headers: { Accept: "application/json" },
    });
    const data = await resp.json();
    return Number(data.balance);
  } catch {
    return 0;
  }
}

async function transferStx(
  privateKey: string,
  recipient: string,
  amountUstx: number,
  label?: string
): Promise<string> {
  const { makeSTXTokenTransfer } = await import("@stacks/transactions");
  const tx = await makeSTXTokenTransfer({
    recipient,
    amount: BigInt(amountUstx),
    senderKey: privateKey,
    network: NETWORK,
    anchorMode: AnchorMode.Any,
    fee: 10000,
  });
  let result: any;
  for (let attempt = 0; attempt < 5; attempt++) {
    result = await broadcastTransaction(tx, NETWORK);
    if (result.error && typeof result.error === "string" && result.error.includes("Per-minute")) {
      console.log(`    ⏳ Rate-limited, retrying broadcast...`);
      await new Promise((r) => setTimeout(r, 3000));
      continue;
    }
    break;
  }
  const txId = `0x${result.txid}`;
  console.log(`  🚀 ${label || `transfer ${amountUstx} uSTX → ${recipient}`} → ${txId}`);
  await new Promise((r) => setTimeout(r, 2000));
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
        if (i % 5 === 0) console.log(`  ⏳ ${data.tx_status}... (${i + 1}/${maxRetries})`);
      } else if (["abort_by_response", "abort_by_post_condition"].includes(data.tx_status)) {
        const repr = data.tx_result?.repr || "";
        if (repr) {
          console.error(`  ❌ Failed: ${data.tx_status} ${repr}`);
        } else {
          console.error(`  ❌ Failed: ${data.tx_status}`);
        }
        return;
      }
    } catch {
      // API not yet seeing the tx
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  console.log(`  ⚠️  Timed out waiting for ${txId} — check explorer`);
}

// Manually-tracked nonces to avoid gaps after aborted txs
const _nonces: Record<string, number> = {};

async function ensureNonce(address: string): Promise<number> {
  if (!(address in _nonces)) {
    const resp = await fetch(`${API_URL}/v2/accounts/${address}?proof=0`, {
      headers: { Accept: "application/json" },
    });
    const data = await resp.json();
    _nonces[address] = Number(data.nonce);
  }
  const n = _nonces[address];
  // Actually use the API nonce each time in case a prior tx confirmed
  // and the local tracker fell behind
  const resp = await fetch(`${API_URL}/v2/accounts/${address}?proof=0`, {
    headers: { Accept: "application/json" },
  });
  const data = await resp.json();
  const chainNonce = Number(data.nonce);
  if (chainNonce > _nonces[address]) {
    _nonces[address] = chainNonce;
  }
  return _nonces[address];
}

function advanceNonce(address: string): void {
  _nonces[address] = (_nonces[address] || 0) + 1;
}

async function readOnlyCall(
  contractName: string,
  functionName: string,
  args: ClarityValue[],
): Promise<any> {
  await rateLimit();
  const resp = await fetch(
    `${API_URL}/v2/contracts/call-read/${DEPLOYER}/${contractName}/${functionName}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: DEPLOYER,
        arguments: args.map(cvToHex),
      }),
    }
  );
  return resp.json();
}

// Check if an address is registered in the project-verification-module
async function isRegisteredInPVM(address: string): Promise<boolean> {
  try {
    const data = await readOnlyCall("project-verification-module", "get-creator-identity", [
      standardPrincipalCV(address),
    ]);
    // get-creator-identity returns (ok (optional ...))
    // Clarity serialization: 0x07=ResponseOk, 0x09=OptionalNone, 0x0a=OptionalSome
    // (ok (some tuple)) = 070a..., (ok none) = 0709
    if (data.okay && data.result) {
      return data.result.replace("0x", "").startsWith("070a");
    }
    return false;
  } catch {
    return false;
  }
}

// Check if a campaign exists in milestone-escrow (returns new-id if not)
async function getNextEscrowCampaignId(): Promise<number> {
  try {
    const data = await readOnlyCall("milestone-escrow", "get-campaign-counter", []);
    if (data.okay && data.result) {
      const str = cvToString(data.result);
      const match = str.match(/u(\d+)/);
      if (match) return parseInt(match[1]) + 1;
    }
    return 1;
  } catch {
    return 1;
  }
}

async function callContract(
  privateKey: string,
  contractName: string,
  functionName: string,
  functionArgs: ClarityValue[],
  label?: string,
): Promise<string> {
  await rateLimit();
  // Resolve address from privateKey for nonce tracking
  const account = accountsMap.get(privateKey);
  if (!account) {
    throw new Error(`No account found for privateKey`);
  }
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

  // Retry broadcast on rate-limit (max 5 attempts with backoff)
  let result: any;
  for (let attempt = 0; attempt < 5; attempt++) {
    result = await broadcastTransaction(tx, NETWORK);
    if (result.error && typeof result.error === "string" && result.error.includes("Per-minute")) {
      console.log(`    ⏳ Rate-limited, retrying broadcast in ${(attempt + 1) * 3}s...`);
      await new Promise((r) => setTimeout(r, (attempt + 1) * 3000));
      continue;
    }
    break;
  }

  // Advance nonce immediately after broadcast (consumed regardless of outcome)
  advanceNonce(account.address);

  const txId = `0x${result.txid}`;
  const lbl = label || `${contractName}.${functionName}`;
  console.log(`  🚀 ${lbl} → ${txId}`);

  // Small delay between txs to avoid rate-limiting
  await new Promise((r) => setTimeout(r, 2000));

  await waitForTx(txId);
  return txId;
}

// Global account map used by callContract for nonce tracking
const accountsMap: Map<string, { address: string; label: string }> = new Map();

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔧 CineX Testnet E2E Tests");
  console.log("═══════════════════════════════\n");

  // ── Load wallets ─────────────────────────────────────────────────────────

  console.log("── Loading wallets ──\n");
  const accounts = await getWallet(4);  // derive accounts 0-4
  const deployer = accounts[0];  // ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
  const creator = accounts[1];   // wallet_1
  const backer1 = accounts[3];   // wallet_3
  const backer2 = accounts[4];   // wallet_4
  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  Creator:  ${creator.address}`);
  console.log(`  Backer1:  ${backer1.address}`);
  console.log(`  Backer2:  ${backer2.address}\n`);

  // Populate accountsMap for nonce tracking in callContract
  for (const acct of [deployer, creator, backer1, backer2]) {
    accountsMap.set(acct.privateKey, { address: acct.address, label: `account[${acct.index}]` });
  }

  // ── Fund creator & backers from deployer ─────────────────────────────────

  const MIN_STX = 200000000; // 200 STX min for paying fees + contributing (dummy campaigns need ~66 STX)
  for (const { address, label } of [
    { address: creator.address, label: "Creator" },
    { address: backer1.address, label: "Backer1" },
    { address: backer2.address, label: "Backer2" },
  ]) {
    const bal = await getStxBalance(address);
    console.log(`  ${label} balance: ${(bal / 1e6).toFixed(2)} STX`);
    if (bal < MIN_STX) {
      const needed = MIN_STX - bal;
      console.log(`  → Funding ${label} with ${(needed / 1e6).toFixed(2)} STX...`);
      await transferStx(deployer.privateKey, address, needed, `fund ${label}`);
    } else {
      console.log(`  → Sufficient balance, skipping funding\n`);
    }
  }

  // ── Get current block height for scheduling ──────────────────────────────

  const currentBlock = await getCurrentBlockHeight();
  const deadline = currentBlock + 50000; // far enough in the future
  console.log(`\n  Current block height: ${currentBlock}`);
  console.log(`  Campaign deadline: ${deadline}\n`);

  // ── Set oracle price EARLY (before any escrow/verification ops) ──────────

  console.log("── Setting oracle STX price (needed by milestone-escrow) ──\n");
  await callContract(
    deployer.privateKey,
    "oracle-proxy",
    "emergency-set-price",
    [uintCV(250)],
    "oracle-set-price"
  );

  // ── Helpers for state-aware flow ──────────────────────────────────────────

  async function registerAndVerifyCreator(acct: typeof creator, label: string) {
    const registered = await isRegisteredInPVM(acct.address);
    if (registered) {
      console.log(`${label} already registered — skipping register-creator`);
    } else {
      console.log(`${label}: Register creator`);
      await callContract(
        acct.privateKey,
        "project-verification-module",
        "register-creator",
        [
          standardPrincipalCV(acct.address),
          stringAsciiCV(`Test ${label}`),
          stringAsciiCV(`https://cinex.test/${label}`),
          bufferCV(Buffer.alloc(32, 0)),
          stringAsciiCV("film"),
          uintCV(1),
          uintCV(50000),
        ],
        `register-${label}`
      );

      console.log(`\n${label}: Pay verification fee`);
      await callContract(
        acct.privateKey,
        "project-verification-module",
        "pay-verification-fee",
        [uintCV(1)],
        `pay-fee-${label}`
      );
    }

    console.log(`\n${label}: Deployer verifies`);
    await callContract(
      deployer.privateKey,
      "project-verification-module",
      "verify-creator",
      [
        standardPrincipalCV(acct.address),
        uintCV(FAR_FUTURE),
      ],
      `verify-${label}`
    );
  }

  // Helper: check if campaign exists in milestone-escrow
  async function escrowCampaignExists(id: number): Promise<boolean> {
    try {
      const data = await readOnlyCall("milestone-escrow", "get-campaign", [uintCV(id)]);
      // get-campaign returns (ok (optional ...))
      // Clarity serialization: 0x07=ResponseOk, 0x09=OptionalNone, 0x0a=OptionalSome
      // (ok (some tuple)) = 070a..., (ok none) = 0709
      if (data.okay && data.result) {
        return data.result.replace("0x", "").startsWith("070a");
      }
      return false;
    } catch {
      return false;
    }
  }

  // Helper: check if milestone exists in milestone-verification-2
  async function milestoneExists(campaignId: number, index: number): Promise<boolean> {
    try {
      const data = await readOnlyCall("milestone-verification-2", "get-milestone", [uintCV(campaignId), uintCV(index)]);
      // get-milestone returns (ok (optional ...))
      if (data.okay && data.result) {
        return data.result.replace("0x", "").startsWith("070a");
      }
      return false;
    } catch {
      return false;
    }
  }

  // Helper: check if campaign-milestone-state exists in milestone-verification-2
  async function mvCampaignSetup(campaignId: number): Promise<boolean> {
    try {
      const data = await readOnlyCall("milestone-verification-2", "get-creator-standing", [uintCV(campaignId)]);
      // get-creator-standing returns (ok {...}) for existing, (err u5603) for missing
      // 0x07=ResponseOk, 0x08=ResponseErr
      if (data.okay && data.result) {
        return data.result.replace("0x", "").startsWith("07");
      }
      return false;
    } catch {
      return false;
    }
  }

  // Helper: get next campaign ID from campaign-module-2
  async function getNextCampaignModuleId(): Promise<number> {
    try {
      const data = await readOnlyCall("campaign-module-2", "get-total-campaigns", []);
      if (data.okay && data.result) {
        // Parse (ok uN) from hex: remove "0x" prefix
        // Stacks serialization: 0x07=ResponseOk, then uint = 0x01 + 16-byte big-endian
        const hex = data.result.replace("0x", "");
        const bytes = Buffer.from(hex, "hex");
        // uint encoding: 0x01 prefix + 16-byte value (17 bytes total)
        // After 0x07 (ok), the uint starts at offset 1
        if (bytes.length >= 18) {
          const val = bytes.readBigUInt64BE(bytes.length - 8);
          return Number(val) + 1;
        }
      }
      return 1;
    } catch {
      return 1;
    }
  }

  // Helper: get campaign-module-2 total-raised-funds (with retry)
  async function getTotalRaised(id: number, retries = 3): Promise<number> {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const data = await readOnlyCall("campaign-module-2", "get-total-raised-funds", [uintCV(id)]);
        if (data.okay && data.result) {
          // Parse ok response: (ok u<value>)
          const hex = data.result.slice(2);
          const bytes = Buffer.from(hex, "hex");
          // Stacks uint encoding: 0x01 + 16-byte big-endian
          if (bytes.length >= 9) {
            const valBytes = bytes.slice(-8);
            return Number(valBytes.readBigUInt64BE(0));
          }
          return Number(bytes.readBigUInt64BE(1));
        }
        if (data.error || !data.okay) {
          console.log(`    getTotalRaised attempt ${attempt + 1} failed: ${JSON.stringify(data.error || data)}`);
        }
      } catch (e) {
        console.log(`    getTotalRaised attempt ${attempt + 1} error: ${e}`);
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    return 0;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  FLOW 1: Registration + Campaign setup
  // ══════════════════════════════════════════════════════════════════════════

  console.log("── Flow 1: Registration + Campaign setup ──\n");

  // Register & verify creator and backer1
  await registerAndVerifyCreator(creator, "Creator");
  await registerAndVerifyCreator(backer1, "Backer1");

  // ── Initialize milestone-verification-2 (if not already) ──
  console.log("\n── Initializing milestone-verification-2 ──");
  await callContract(
    deployer.privateKey,
    "milestone-verification-2",
    "initialize",
    [
      contractPrincipalCV(DEPLOYER, "campaign-module-2"),
      standardPrincipalCV(DEPLOYER),
      standardPrincipalCV(STX_ASSET),  // yield-escrow (burn address as placeholder)
      contractPrincipalCV(DEPLOYER, "milestone-escrow"),
    ],
    "mv2-init"
  );

  // ── Pre-flight: align campaign IDs between escrow and campaign-module-2 ──
  // Strategy: check what IDs exist in each contract, ensure a matching pair.
  // Start with ID 1 (escrow often has it from prior runs; campaign-module-2 always starts at 1).
  async function cmCampaignExists(id: number): Promise<boolean> {
    try {
      const data = await readOnlyCall("campaign-module-2", "get-campaign", [uintCV(id)]);
      // get-campaign returns (ok (tuple ...)) = 07... or (err ...) = 08...
      if (data.okay && data.result) {
        return data.result.replace("0x", "").startsWith("07");
      }
      return false;
    } catch {
      return false;
    }
  }

  // Pick candidate ID: find one where escrow has it (or can create it) and campaign-module-2 doesn't yet
  async function pickAlignedId(startId: number): Promise<number> {
    for (let id = startId; id < startId + 20; id++) {
      const inEscrow = await escrowCampaignExists(id);
      const inCm = await cmCampaignExists(id);
      if (inEscrow && !inCm) {
        console.log(`  → ID ${id}: escrow has it, campaign-module-2 needs it`);
        return id;
      }
      if (!inEscrow && inCm) {
        console.log(`  → ID ${id}: campaign-module-2 has it, escrow needs it`);
        return id;
      }
    }
    // None of the pre-existing pair found — use the first free slot
    // campaign-module-2 next campaign gets auto-increment; escrow can take any id
    const cmNext = await getNextCampaignModuleId();
    return cmNext;
  }

  const alignedId = await pickAlignedId(1);
  console.log(`\n  Target aligned campaign ID: ${alignedId}`);

  // Create escrow campaign if missing
  const escrowExists = await escrowCampaignExists(alignedId);
  console.log(`  milestone-escrow campaign ${alignedId} exists: ${escrowExists}`);
  if (!escrowExists) {
    console.log(`\nCreating milestone-escrow campaign ${alignedId}...`);
    await callContract(
      creator.privateKey,
      "milestone-escrow",
      "create-campaign",
      [
        uintCV(alignedId),
        standardPrincipalCV(STX_ASSET),
        uintCV(TARGET_AMOUNT),
        listCV([
          tupleCV({
            name: stringAsciiCV("Deliverable"),
            amount: uintCV(TARGET_AMOUNT),
          }),
        ]),
        uintCV(deadline),
      ],
      "milestone-escrow.create-campaign"
    );
  }

  // Create campaign-module-2 campaign if missing
  let cmExists = await cmCampaignExists(alignedId);
  console.log(`  campaign-module-2 campaign ${alignedId} exists: ${cmExists}`);
  if (!cmExists) {
    // Advance campaign-module-2 counter up to alignedId by creating dummy campaigns
    const cmNext = await getNextCampaignModuleId();
    for (let id = cmNext; id < alignedId; id++) {
      console.log(`  → Dummy campaign-module-2 campaign ${id}...`);
      await callContract(
        creator.privateKey,
        "campaign-module-2",
        "create-campaign",
        [
          stringAsciiCV("Dummy"),
          uintCV(0),
          uintCV(1000000),
          uintCV(1000),
          uintCV(1),
          stringAsciiCV("None"),
          contractPrincipalCV(DEPLOYER, "project-verification-module"),
        ],
        `cm-dummy-${id}`
      );
    }
    // Now create the real campaign-module-2 campaign — it gets alignedId
    console.log(`\nCreating campaign-module-2 campaign ${alignedId}...`);
    await callContract(
      creator.privateKey,
      "campaign-module-2",
      "create-campaign",
      [
        stringAsciiCV("Test film campaign"),
        uintCV(0),
        uintCV(TARGET_AMOUNT),
        uintCV(CAMPAIGN_DURATION),
        uintCV(2),
        stringAsciiCV("Postcard"),
        contractPrincipalCV(DEPLOYER, "project-verification-module"),
      ],
      "campaign-module-2.create-campaign"
    );
  } else {
    console.log(`  Reusing existing campaign-module-2 campaign ${alignedId}`);
  }

  // ── Set effectiveCampaignId ──
  let effectiveCampaignId = alignedId;

  // ── Backer1 contributes 1 STX ──
  console.log(`\n1k. Backer1 contributes 1,000,000 uSTX to campaign ${effectiveCampaignId}`);
  await callContract(
    backer1.privateKey,
    "campaign-module-2",
    "contribute-to-campaign",
    [
      uintCV(effectiveCampaignId),
      uintCV(1000000),
      contractPrincipalCV(DEPLOYER, "milestone-escrow"),
      contractPrincipalCV(DEPLOYER, "project-verification-module"),
    ],
    "backer1-contribute"
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  FLOW 1 — VALIDATIONS
  // ══════════════════════════════════════════════════════════════════════════

  console.log("\n── Flow 1 validations ──\n");
  let totalRaisedAfter = await getTotalRaised(effectiveCampaignId);
  console.log(`  total-raised-funds(${effectiveCampaignId}) = ${totalRaisedAfter} uSTX\n`);
  let knownTotalRaised = totalRaisedAfter;

  // ══════════════════════════════════════════════════════════════════════════
  //  FLOW 2: Milestone-escrow backward-compat wrappers
  // ══════════════════════════════════════════════════════════════════════════

  console.log("── Flow 2: Milestone-escrow wrapper tests ──\n");

  // 2a. deposit-to-campaign — implicit in every CM contribution; skip direct call here
  //     to keep escrow total-deposited aligned with campaign-module total-raised.

  // 2b. withdraw-from-campaign (uses as-contract stx-transfer to creator)
  console.log(`\n2b. milestone-escrow.withdraw-from-campaign(${effectiveCampaignId}, 1000)`);
  await callContract(
    deployer.privateKey,
    "milestone-escrow",
    "withdraw-from-campaign",
    [uintCV(effectiveCampaignId), uintCV(1000)],
    "withdraw-from-campaign"
  );

  // 2c. collect-campaign-fee (uses as-contract stx-transfer to collector)
  console.log(`\n2c. milestone-escrow.collect-campaign-fee(${effectiveCampaignId}, 500)`);
  await callContract(
    deployer.privateKey,
    "milestone-escrow",
    "collect-campaign-fee",
    [uintCV(effectiveCampaignId), uintCV(500)],
    "collect-campaign-fee"
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  FLOW 3: Milestone-verification lifecycle
  // ══════════════════════════════════════════════════════════════════════════

  console.log("── Flow 3: Milestone-verification lifecycle ──\n");

  // ── Diagnose existing milestone-verification state ──
  const mvHasCampaign = await mvCampaignSetup(effectiveCampaignId);
  const milestone0Exists = await milestoneExists(effectiveCampaignId, 0);
  console.log(`  campaign-milestone-state(effectiveCampaignId): ${mvHasCampaign}`);
  console.log(`  milestone 0 exists: ${milestone0Exists}`);

  // ── DIAGNOSTIC: print raw API responses ──
  const diagCreatorStanding = await readOnlyCall("milestone-verification-2", "get-creator-standing", [uintCV(effectiveCampaignId)]);
  console.log(`  get-creator-standing(${effectiveCampaignId}) raw: ${JSON.stringify(diagCreatorStanding).slice(0, 200)}`);
  const diagMilestone0 = await readOnlyCall("milestone-verification-2", "get-milestone", [uintCV(effectiveCampaignId), uintCV(0)]);
  console.log(`  get-milestone(${effectiveCampaignId}, 0) raw: ${JSON.stringify(diagMilestone0).slice(0, 200)}`);
  const diagEscrowCampaign = await readOnlyCall("milestone-escrow", "get-campaign", [uintCV(effectiveCampaignId)]);
  console.log(`  get-campaign(${effectiveCampaignId}) raw: ${JSON.stringify(diagEscrowCampaign).slice(0, 200)}`);

  // ── Check backer1's contribution status ──
  console.log("\n  Checking backer1 contribution status...");
  const b1Contrib = await readOnlyCall("campaign-module-2", "get-campaign-contributions", [uintCV(effectiveCampaignId), standardPrincipalCV(backer1.address)]);
  console.log(`  get-campaign-contributions(${effectiveCampaignId}, backer1) → ${JSON.stringify(b1Contrib).slice(0, 200)}`);

  if (!mvHasCampaign) {
    // 3a. Create milestones
    console.log(`\n3a. milestone-verification.create-milestones(${effectiveCampaignId}, 3 deadlines)`);
    await callContract(
      creator.privateKey,
      "milestone-verification-2",
      "create-milestones",
      [
        uintCV(effectiveCampaignId),
        listCV([
          uintCV(deadline),
          uintCV(deadline),
          uintCV(deadline),
        ]),
      ],
      "create-milestones"
    );
  } else {
    console.log("\n  Campaign already set up in milestone-verification — skipping create-milestones");
  }

  // 3b. backer2 contributes 500,000 (needed as contributor for endorse flow)
  console.log(`\n3b. campaign-module-2.contribute-to-campaign (backer2, 500000)`);
  await callContract(
    backer2.privateKey,
    "campaign-module-2",
    "contribute-to-campaign",
    [
      uintCV(effectiveCampaignId),
      uintCV(500000),
      contractPrincipalCV(DEPLOYER, "milestone-escrow"),
      contractPrincipalCV(DEPLOYER, "project-verification-module"),
    ],
    "backer2-contribute-500k"
  );

  // 3c. Submit milestone 0 (if not already submitted)
  if (!milestone0Exists) {
    console.log(`\n3c. milestone-verification.submit-milestone(${effectiveCampaignId}, 0)`);
    await callContract(
      creator.privateKey,
      "milestone-verification-2",
      "submit-milestone",
      [uintCV(effectiveCampaignId), uintCV(0)],
      "submit-milestone"
    );
  } else {
    console.log("\n  Milestones already exist — checking submission status...");
    // Try submit-milestone anyway — it will fail with u5611 if already submitted
    // This validates the submission-buffer flow
    console.log(`\n3c. milestone-verification.submit-milestone(${effectiveCampaignId}, 0) — expected to fail (buffer)`);
    await callContract(
      creator.privateKey,
      "milestone-verification-2",
      "submit-milestone",
      [uintCV(effectiveCampaignId), uintCV(0)],
      "submit-milestone"
    );
  }

  // 3d. Endorse milestone 0 (backer1)
  console.log(`\n3d. milestone-verification.endorse-milestone(${effectiveCampaignId}, 0, true)`);
  await callContract(
    backer1.privateKey,
    "milestone-verification-2",
    "endorse-milestone",
    [uintCV(effectiveCampaignId), uintCV(0), boolCV(true)],
    "endorse-milestone"
  );

  // 3e. Finalize milestone 0 — expected to fail (deadline not passed)
  console.log(`\n3e. milestone-verification.finalize-milestone(${effectiveCampaignId}, 0) — expected fail`);
  await callContract(
    deployer.privateKey,
    "milestone-verification-2",
    "finalize-milestone",
    [uintCV(effectiveCampaignId), uintCV(0)],
    "finalize-milestone"
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  FLOW 4: Campaign-module claim
  // ══════════════════════════════════════════════════════════════════════════

  console.log("── Flow 4: Campaign-module claim ──\n");

  // Re-read from chain — backer2 may have contributed in Flow 3
  const currentRaised = await getTotalRaised(effectiveCampaignId);
  // Outstanding must be calculated from escrow total-deposited (source of truth),
  // because Flow 2a deposited directly to escrow, bypassing campaign-module.
  const escrowCamp = await readOnlyCall("milestone-escrow", "get-campaign", [uintCV(effectiveCampaignId)]);
  console.log(`  escrow get-campaign(${effectiveCampaignId}) raw: ${escrowCamp.result?.slice(0, 100)}`);
  const escrowBal = await readOnlyCall("milestone-escrow", "get-campaign-balance", [uintCV(effectiveCampaignId)]);
  console.log(`  escrow get-campaign-balance(${effectiveCampaignId}) raw: ${escrowBal.result?.slice(0, 100)}`);
  const escrowDeposited = escrowBal?.result
    ? parseInt(escrowBal.result.replace("0x", "").slice(4), 16)  // skip 0x07 (ResponseOk) + 0x01 (uint prefix)
    : currentRaised;
  const outstanding = TARGET_AMOUNT > escrowDeposited ? TARGET_AMOUNT - escrowDeposited : TARGET_AMOUNT > currentRaised ? TARGET_AMOUNT - currentRaised : 0;
  console.log(`  Current total-raised (campaign-module): ${currentRaised} uSTX`);
  console.log(`  Current total-deposited (escrow): ${escrowDeposited} uSTX`);
  console.log(`  Outstanding (using escrow): ${outstanding} / ${TARGET_AMOUNT} uSTX`);

  const b2bal = await getStxBalance(backer2.address);
  console.log(`  backer2 STX balance: ${(b2bal / 1e6).toFixed(2)} STX`);

  if (outstanding > 0) {
    console.log(`\n4a. campaign-module-2.contribute-to-campaign (backer2, ${outstanding})`);
    await callContract(
      backer2.privateKey,
      "campaign-module-2",
      "contribute-to-campaign",
      [
        uintCV(effectiveCampaignId),
        uintCV(outstanding),
        contractPrincipalCV(DEPLOYER, "milestone-escrow"),
        contractPrincipalCV(DEPLOYER, "project-verification-module"),
      ],
      "backer2-contribute-to-goal"
    );
  } else {
    console.log("  Goal already reached — skipping additional contribution");
  }

  // 4b. Claim campaign funds
  console.log(`\n4b. campaign-module-2.claim-campaign-funds(${effectiveCampaignId})`);
  await callContract(
    deployer.privateKey,
    "campaign-module-2",
    "claim-campaign-funds",
    [
      uintCV(effectiveCampaignId),
      contractPrincipalCV(DEPLOYER, "milestone-escrow"),
    ],
    "claim-campaign-funds"
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  FLOW 5: Edge cases
  // ══════════════════════════════════════════════════════════════════════════

  console.log("── Flow 5: Edge cases ──\n");

  // 5a. Contribute to non-existent campaign-module campaign
  console.log("5a. Contribute to non-existent campaign (expect error 302)");
  await callContract(
    backer1.privateKey,
    "campaign-module-2",
    "contribute-to-campaign",
    [
      uintCV(999),
      uintCV(100000),
      contractPrincipalCV(DEPLOYER, "milestone-escrow"),
      contractPrincipalCV(DEPLOYER, "project-verification-module"),
    ],
    "contribute-to-nonexistent"
  );

  // 5b. Deposit to non-existent milestone-escrow campaign
  console.log("\n5b. Deposit to non-existent milestone-escrow campaign (expect error 5400)");
  await callContract(
    backer1.privateKey,
    "milestone-escrow",
    "deposit",
    [uintCV(999), uintCV(1000)],
    "deposit-nonexistent"
  );

  // 5c. Double-claim should fail (campaign already claimed)
  console.log("\n5c. Double-claim (expect error 303)");
  await callContract(
    deployer.privateKey,
    "campaign-module-2",
    "claim-campaign-funds",
    [
      uintCV(effectiveCampaignId),
      contractPrincipalCV(DEPLOYER, "milestone-escrow"),
    ],
    "double-claim"
  );

  // 5d. Deployer (CONTRACT-OWNER) contribute should fail (is-valid-module check)
  console.log("\n5d. Deployer contributes (expect error 313)");
  await callContract(
    deployer.privateKey,
    "campaign-module-2",
    "contribute-to-campaign",
    [
      uintCV(effectiveCampaignId),
      uintCV(100000),
      contractPrincipalCV(DEPLOYER, "milestone-escrow"),
      contractPrincipalCV(DEPLOYER, "project-verification-module"),
    ],
    "deployer-contribute"
  );

  // ══════════════════════════════════════════════════════════════════════════

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  ✅ All e2e test flows completed!");
  console.log("  (Check outputs above for individual pass/fail)");
  console.log("═══════════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("\n❌ Fatal:", err.message);
  process.exit(1);
});

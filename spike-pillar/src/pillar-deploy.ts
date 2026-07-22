/**
 * Path A: Pillar Vault Deployment
 *
 * Deploys cinex-smart-vault.clar to testnet and calls onboard().
 * Uses @stacks/transactions + Hiro API (same pattern as CineX backend).
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  makeContractDeploy,
  makeContractCall,
  signWithKey,
  broadcastTransaction,
  getAddressFromPrivateKey,
  privateKeyToString,
  createStacksPrivateKey,
  bufferCV,
  principalCV,
  fetchAccountNonce,
} from "@stacks/transactions";
import { StacksTestnet } from "@stacks/network";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface DeployResult {
  /** Contract ID (ST...{deployer}.{contract-name}) */
  contractId: string;
  /** Deploy transaction ID */
  deployTxid: string;
  /** Onboard transaction ID (null if not yet called) */
  onboardTxid: string | null;
  /** Network used */
  network: string;
}

export interface DeployOptions {
  /** Deployer private key (hex string, 32 bytes) */
  deployerKey: string;
  /** Contract name (e.g., "cinex-smart-vault-001") */
  contractName: string;
  /** User's P-256 compressed public key (33 bytes hex) */
  userPubkey: string;
  /** User's Stacks address (where onboard owner is set) */
  userAddress: string;
  /** Network */
  network?: "testnet" | "mainnet";
}

/**
 * Read the Clarity contract source code.
 */
function readContractSource(): string {
  const contractsDir = resolve(__dirname, "..", "contracts");
  return readFileSync(
    resolve(contractsDir, "cinex-smart-vault.clar"),
    "utf-8"
  );
}

/**
 * Deploy cinex-smart-vault.clar and onboard the user.
 *
 * Flow:
 * 1. Build + sign contract deploy transaction
 * 2. Broadcast to Hiro API
 * 3. Wait for confirmation (poll tx status)
 * 4. Build + sign onboard() call
 * 5. Broadcast onboard tx
 */
export async function deployVault(
  options: DeployOptions
): Promise<DeployResult> {
  const {
    deployerKey,
    contractName,
    userPubkey,
    userAddress,
    network = "testnet",
  } = options;

  const networkObj = new StacksTestnet();

  // Derive deployer address from private key
  const deployerPrivKey = createStacksPrivateKey(
    Buffer.from(deployerKey, "hex")
  );
  const deployerAddress = getAddressFromPrivateKey(deployerPrivKey);
  const contractId = `${deployerAddress}.${contractName}`;

  console.log(`Deploying ${contractId} to ${network}...`);

  // Read contract source
  const contractSource = readContractSource();

  // Fetch deployer nonce
  const nonce = await fetchAccountNonce({
    address: deployerAddress,
    network: networkObj,
  });

  // Build + sign contract deploy transaction
  const deployTx = makeContractDeploy({
    contractName,
    codeBody: contractSource,
    senderKey: privateKeyToString(deployerPrivKey),
    nonce,
    fee: 100000, // 0.1 STX for deploy
    network: networkObj,
  });

  const signedDeployTx = signWithKey({
    transaction: deployTx,
    privateKey: deployerPrivKey,
  });

  const deployResult = await broadcastTransaction(
    signedDeployTx.transaction,
    networkObj
  );

  if (!deployResult.ok) {
    const errText = await deployResult.error.text();
    throw new Error(`Deploy broadcast failed: ${errText}`);
  }

  const deployData = await deployResult.json();
  const deployTxid = deployData.txid;
  console.log(`Deploy txid: ${deployTxid}`);

  // Wait for deploy to confirm
  await waitForConfirmation(deployTxid, network);
  console.log("Deploy confirmed.");

  // Fetch fresh nonce (incremented after deploy)
  const onboardNonce = await fetchAccountNonce({
    address: deployerAddress,
    network: networkObj,
  });

  const pubkeyBuffer = Buffer.from(userPubkey, "hex");

  // Build + sign onboard() call
  const onboardTx = makeContractCall({
    contractAddress: deployerAddress,
    contractName,
    functionName: "onboard",
    functionArgs: [
      bufferCV(pubkeyBuffer),
      principalCV(userAddress),
    ],
    senderKey: privateKeyToString(deployerPrivKey),
    nonce: onboardNonce,
    fee: 10000, // 0.01 STX
    network: networkObj,
  });

  const signedOnboardTx = signWithKey({
    transaction: onboardTx,
    privateKey: deployerPrivKey,
  });

  const onboardResult = await broadcastTransaction(
    signedOnboardTx.transaction,
    networkObj
  );

  if (!onboardResult.ok) {
    const errText = await onboardResult.error.text();
    throw new Error(`Onboard broadcast failed: ${errText}`);
  }

  const onboardData = await onboardResult.json();
  console.log(`Onboard txid: ${onboardData.txid}`);

  return {
    contractId,
    deployTxid,
    onboardTxid: onboardData.txid,
    network,
  };
}

/**
 * Wait for a transaction to confirm by polling Hiro API.
 */
async function waitForConfirmation(
  txid: string,
  network: string,
  maxAttempts = 30,
  intervalMs = 5000
): Promise<void> {
  const baseUrl = network === "mainnet"
    ? "https://stacks-node-api.mainnet.stacks.co"
    : "https://stacks-node-api.testnet.stacks.co";

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${baseUrl}/extended/v1/tx/${txid}`);
      if (response.ok) {
        const data = await response.json() as any;
        if (data.tx_status === "success") {
          return;
        }
        if (
          data.tx_status === "abort_by_response" ||
          data.tx_status === "abort_by_post_condition"
        ) {
          throw new Error(`Transaction failed: ${data.tx_status}`);
        }
      }
    } catch (e) {
      if (i === maxAttempts - 1) throw e;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Timeout waiting for tx ${txid}`);
}

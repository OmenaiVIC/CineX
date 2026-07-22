/**
 * @stacks.connect Spike — Broadcast via Hiro API
 * CineX Wallet Abstraction Task 1.1
 *
 * Broadcasts signed transactions via standard Hiro API.
 * Uses standard Stacks transaction serialization.
 */

import type { HiroTxStatus } from './types.js';

const TESTNET_STACKS_API = 'https://api.testnet.hiro.so';
const MAINNET_STACKS_API = 'https://api.hiro.so';

/**
 * Broadcast a signed transaction via Hiro API.
 *
 * Flow:
 * 1. Serialize transaction (standard format)
 * 2. POST to Hiro API
 * 3. Wait for broadcast acceptance
 * 4. Return transaction ID
 */
export async function broadcastViaHiro(
  tx: unknown,
  network: 'testnet' | 'mainnet' = 'testnet'
): Promise<{ txId: string; status: string }> {
  const baseUrl = network === 'testnet' ? TESTNET_STACKS_API : MAINNET_STACKS_API;

  // TODO: Implement Hiro API broadcast
  // Step 1: Serialize tx
  // const serializedTx = serializeTransaction(tx);

  // Step 2: POST to Hiro API
  // const response = await fetch(`${baseUrl}/extended/v1/tx`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ tx: serializedTx })
  // });

  // Step 3: Parse response
  // const result = await response.json();

  throw new Error('Not implemented — requires @stacks/transactions');
}

/**
 * Wait for transaction confirmation on Stacks.
 */
export async function waitForConfirmation(
  txId: string,
  maxWaitMs: number = 60000
): Promise<HiroTxStatus> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    // TODO: Poll Hiro API for tx status
    // const response = await fetch(`https://api.testnet.hiro.so/extended/v1/tx/${txId}`);
    // const tx: HiroTxStatus = await response.json();
    // if (tx.tx_status === 'success' || tx.tx_status === 'failed') {
    //   return tx;
    // }

    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  throw new Error(`Transaction ${txId} did not confirm within ${maxWaitMs}ms`);
}

/**
 * Get transaction status from Hiro API.
 */
export async function getTransactionStatus(txId: string): Promise<HiroTxStatus> {
  // TODO: Fetch tx status
  // const response = await fetch(`https://api.testnet.hiro.so/extended/v1/tx/${txId}`);
  // return await response.json();

  throw new Error('Not implemented — requires Hiro API');
}

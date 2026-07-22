/**
 * @stacks.connect Spike — Transaction Signing
 * CineX Wallet Abstraction Task 1.1
 *
 * Signs transactions with secp256k1 via wallet extension.
 * Uses standard Stacks transaction format.
 */

import type { ConnectTransaction } from './types.js';

/**
 * Sign a transaction with extension.
 *
 * Flow:
 * 1. Build transaction payload
 * 2. Open extension popup
 * 3. User approves signature
 * 4. Return signed transaction
 */
export async function signTransaction(
  contractAddress: string,
  contractName: string,
  functionName: string,
  args: unknown[]
): Promise<{ tx: unknown; txId: string }> {
  // TODO: Implement with @stacks/connect
  // Step 1: Build payload
  // const tx = await openContractCall({
  //   contractAddress,
  //   contractName,
  //   functionName,
  //   functionArgs: args,
  //   onFinish: (data) => data,
  // });

  // Step 2: Extension popup opens
  // Step 3: User approves
  // Step 4: Return signed tx

  throw new Error('Not implemented — requires @stacks/connect + extension');
}

/**
 * Verify a secp256k1 signature.
 */
export function verifySecp256k1Signature(
  message: string,
  signature: string,
  publicKey: string
): boolean {
  // TODO: Implement secp256k1 signature verification
  // Use @stacks/transactions verifyStandardSignature or similar

  throw new Error('Not implemented');
}

/**
 * @stacks.connect Spike — Transaction Signing Tests
 * CineX Wallet Abstraction Task 1.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { signTransaction, verifySecp256k1Signature } from '../src/connect-sign.js';

describe('Connect Transaction Signing', () => {
  beforeEach(() => {
    // TODO: Mock @stacks/connect for testing
  });

  it('should sign a transaction with extension', async () => {
    // ARRANGE
    const contractAddress = 'ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE';
    const contractName = 'milestone-escrow';
    const functionName = 'create-campaign';
    const args = ['test-campaign', 1000000];

    // ACT
    const { tx, txId } = await signTransaction(
      contractAddress,
      contractName,
      functionName,
      args
    );

    // ASSERT
    expect(tx).toBeDefined();
    expect(txId).toBeDefined();
    expect(txId.length).toBe(64); // 32 bytes hex
  });

  it('should produce a valid secp256k1 signature', async () => {
    // ARRANGE
    const mockMessage = 'Sign in to CineX';
    const mockSignature = 'a1b2c3d4...'; // 65 bytes hex
    const mockPubkey = 'a1b2c3d4...'; // 33 bytes hex

    // ACT
    const valid = verifySecp256k1Signature(mockMessage, mockSignature, mockPubkey);

    // ASSERT
    expect(valid).toBe(true);
  });

  it('should fail signing if extension not connected', async () => {
    // ARRANGE
    // Mock no extension connection

    // ACT & ASSERT
    await expect(
      signTransaction('SP...', 'contract', 'func', [])
    ).rejects.toThrow();
  });

  it('should fail signing if user rejects', async () => {
    // ARRANGE
    // Mock user rejection in extension popup

    // ACT & ASSERT
    await expect(
      signTransaction('SP...', 'contract', 'func', [])
    ).rejects.toThrow();
  });
});

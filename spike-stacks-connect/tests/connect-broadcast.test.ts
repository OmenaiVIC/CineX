/**
 * @stacks.connect Spike — Broadcast Tests
 * CineX Wallet Abstraction Task 1.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { broadcastViaHiro, waitForConfirmation, getTransactionStatus } from '../src/connect-broadcast.js';

describe('Connect Broadcast', () => {
  beforeEach(() => {
    // TODO: Mock Hiro API for testing
  });

  it('should broadcast via Hiro API', async () => {
    // ARRANGE
    const mockTx = {
      contract: 'SP1234.milestone-escrow',
      function: 'create-campaign',
      args: ['test', 1000000],
    };

    // ACT
    const result = await broadcastViaHiro(mockTx, 'testnet');

    // ASSERT
    expect(result.txId).toBeDefined();
    expect(result.txId.length).toBe(64); // 32 bytes hex
    expect(result.status).toBe('pending');
  });

  it('should confirm tx on testnet', async () => {
    // ARRANGE
    const mockTxId = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

    // ACT
    const confirmed = await waitForConfirmation(mockTxId, 60000);

    // ASSERT
    expect(confirmed.tx_id).toBe(mockTxId);
    expect(confirmed.tx_status).toBe('success');
    expect(confirmed.block_height).toBeGreaterThan(0);
  }, 60000); // 60s timeout

  it('should get transaction status', async () => {
    // ARRANGE
    const mockTxId = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

    // ACT
    const status = await getTransactionStatus(mockTxId);

    // ASSERT
    expect(status.tx_id).toBe(mockTxId);
    expect(status.tx_status).toBeDefined();
  });

  it('should handle broadcast failure', async () => {
    // ARRANGE
    const mockTx = null; // Invalid transaction

    // ACT & ASSERT
    await expect(
      broadcastViaHiro(mockTx, 'testnet')
    ).rejects.toThrow();
  });

  it('should timeout if tx does not confirm', async () => {
    // ARRANGE
    const mockTxId = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

    // ACT & ASSERT
    await expect(
      waitForConfirmation(mockTxId, 1000) // 1s timeout
    ).rejects.toThrow('did not confirm');
  }, 5000);
});

/**
 * @stacks.connect Spike — Account Creation Tests
 * CineX Wallet Abstraction Task 1.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { connectLeather, connectXverse, connectAuto } from '../src/connect-account.js';

describe('Connect Account Creation', () => {
  beforeEach(() => {
    // TODO: Mock window.LeatherProvider / window.XverseProviders for testing
  });

  it('should connect to Leather extension', async () => {
    // ARRANGE
    // Mock Leather provider

    // ACT
    const account = await connectLeather();

    // ASSERT
    expect(account.stxAddress).toMatch(/^ST/);
    expect(account.walletType).toBe('leather');
    expect(account.publicKey).toBeDefined();
    expect(account.appDetails.name).toBe('CineX');
  });

  it('should connect to Xverse extension', async () => {
    // ARRANGE
    // Mock Xverse provider

    // ACT
    const account = await connectXverse();

    // ASSERT
    expect(account.stxAddress).toMatch(/^ST/);
    expect(account.walletType).toBe('xverse');
    expect(account.publicKey).toBeDefined();
  });

  it('should auto-detect and connect to available extension', async () => {
    // ARRANGE
    // Mock one extension as available

    // ACT
    const account = await connectAuto();

    // ASSERT
    expect(account.stxAddress).toMatch(/^ST/);
    expect(['leather', 'xverse']).toContain(account.walletType);
  });

  it('should fail if no extension installed', async () => {
    // ARRANGE
    // Mock no extensions available

    // ACT & ASSERT
    await expect(connectAuto()).rejects.toThrow('No Stacks wallet extension');
  });

  it('should fail if user rejects connection', async () => {
    // ARRANGE
    // Mock user rejection

    // ACT & ASSERT
    await expect(connectLeather()).rejects.toThrow();
  });
});

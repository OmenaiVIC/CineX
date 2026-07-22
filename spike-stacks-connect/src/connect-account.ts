/**
 * @stacks.connect Spike — Account Creation
 * CineX Wallet Abstraction Task 1.1
 *
 * Creates account via Leather/Xverse browser extension.
 * Requires extension to be installed and user to approve connection.
 */

import type { ConnectAccount } from './types.js';

/**
 * Connect to Leather extension.
 *
 * Flow:
 * 1. Check if Leather is installed
 * 2. Request connection approval
 * 3. Get STX address and public key
 * 4. Return account details
 */
export async function connectLeather(): Promise<ConnectAccount> {
  // TODO: Implement with @stacks/connect
  // Step 1: Check Leather availability
  // if (!window.LeatherProvider) {
  //   throw new Error('Leather extension not installed');
  // }

  // Step 2: Request connection
  // const userData = await showConnect({
  //   appDetails: { name: 'CineX', icon: '/logo.png' },
  //   onFinish: (data) => data,
  // });

  // Step 3: Extract account
  // return {
  //   stxAddress: userData.profile.stacksAddress,
  //   publicKey: userData.profile.publicKey,
  //   walletType: 'leather',
  //   appDetails: { name: 'CineX', icon: '/logo.png' }
  // };

  throw new Error('Not implemented — requires @stacks/connect + Leather extension');
}

/**
 * Connect to Xverse extension.
 */
export async function connectXverse(): Promise<ConnectAccount> {
  // TODO: Implement with @stacks/connect
  // Similar flow to Leather but with Xverse-specific API

  throw new Error('Not implemented — requires @stacks/connect + Xverse extension');
}

/**
 * Auto-detect available extension and connect.
 */
export async function connectAuto(): Promise<ConnectAccount> {
  // TODO: Detect which extension is available
  // if (window.LeatherProvider) return connectLeather();
  // if (window.XverseProviders) return connectXverse();
  // throw new Error('No Stacks wallet extension installed');

  throw new Error('Not implemented — no extension detection');
}

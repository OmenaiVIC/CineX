export type ContractKey =
  | 'milestone_escrow'
  | 'yield_escrow'
  | 'milestone_verification'
  | 'bitflow_strategy'
  | 'usdcx'
  | 'asset_registry';

export interface ContractEntry {
  address: string;
  name: string;
}

export const CONTRACT_NAMES: Record<ContractKey, string> = {
  milestone_escrow: 'milestone-escrow',
  yield_escrow: 'yield-escrow',
  milestone_verification: 'milestone-verification',
  bitflow_strategy: 'bitflow-strategy',
  usdcx: 'usdcx',
  asset_registry: 'asset-registry',
};

export const TESTNET_DEFAULTS: Record<ContractKey, ContractEntry> = {
  milestone_escrow: { address: '', name: 'milestone-escrow' },
  yield_escrow: { address: '', name: 'yield-escrow' },
  milestone_verification: { address: '', name: 'milestone-verification' },
  bitflow_strategy: { address: '', name: 'bitflow-strategy' },
  usdcx: { address: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', name: 'usdcx' },
  asset_registry: { address: '', name: 'asset-registry' },
};

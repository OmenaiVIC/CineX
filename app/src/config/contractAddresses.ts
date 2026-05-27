export type ContractKey =
  | 'milestone_escrow'
  | 'yield_escrow'
  | 'milestone_verification'
  | 'bitflow_strategy';

export interface ContractEntry {
  address: string;
  name: string;
}

export const CONTRACT_NAMES: Record<ContractKey, string> = {
  milestone_escrow: 'milestone-escrow',
  yield_escrow: 'yield-escrow',
  milestone_verification: 'milestone-verification',
  bitflow_strategy: 'bitflow-strategy',
};

export const TESTNET_DEFAULTS: Record<ContractKey, ContractEntry> = {
  milestone_escrow: { address: '', name: 'milestone-escrow' },
  yield_escrow: { address: '', name: 'yield-escrow' },
  milestone_verification: { address: '', name: 'milestone-verification' },
  bitflow_strategy: { address: '', name: 'bitflow-strategy' },
};

export type NetworkType = 'devnet' | 'testnet' | 'mainnet';

type ContractType = 'milestone_escrow' | 'yield_escrow' | 'milestone_verification' | 'bitflow_strategy' | 'usdcx' | 'asset_registry';

const CONTRACT_ENV_MAP: Record<string, string> = {
  milestone_escrow: 'VITE_MILESTONE_ESCROW_CONTRACT_ADDRESS',
  yield_escrow: 'VITE_YIELD_ESCROW_CONTRACT_ADDRESS',
  milestone_verification: 'VITE_MILESTONE_VERIFICATION_CONTRACT_ADDRESS',
  bitflow_strategy: 'VITE_BITFLOW_STRATEGY_CONTRACT_ADDRESS',
  usdcx: 'VITE_USDCX_CONTRACT_ADDRESS',
  asset_registry: 'VITE_ASSET_REGISTRY_CONTRACT_ADDRESS',
};

const CONTRACT_NAME_MAP: Record<string, string> = {
  milestone_escrow: 'milestone-escrow',
  yield_escrow: 'yield-escrow',
  milestone_verification: 'milestone-verification',
  bitflow_strategy: 'bitflow-strategy',
  usdcx: 'usdcx',
  asset_registry: 'asset-registry',
};

function isValid(t: string): t is ContractType {
  return t in CONTRACT_ENV_MAP;
}

export function getContractAddress(contractType: string): string {
  if (!isValid(contractType)) return '';
  return import.meta.env[CONTRACT_ENV_MAP[contractType]] || '';
}

export function getContractName(contractType: string): string {
  if (!isValid(contractType)) return 'unknown';
  return CONTRACT_NAME_MAP[contractType];
}

export function getContractIdentifier(contractType: string): string {
  const address = getContractAddress(contractType);
  const name = getContractName(contractType);
  return address ? `${address}.${name}` : name;
}

export function getNetworkType(): NetworkType {
  return (import.meta.env.VITE_NETWORK || 'testnet') as NetworkType;
}

export function getExplorerTxUrl(txId: string): string {
  return `https://explorer.hiro.so/txid/${txId}?chain=${getNetworkType()}`;
}

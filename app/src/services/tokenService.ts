import { getNetworkType } from '../utils/network';
import type { ServiceResponse } from '../types';

const HIRO_API = 'https://api.testnet.hiro.so';

function hiroBase(): string {
  const net = getNetworkType();
  return net === 'mainnet'
    ? 'https://api.hiro.so'
    : 'https://api.testnet.hiro.so';
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function microToUnit(micro: number, decimals: number): string {
  return (micro / Math.pow(10, decimals)).toFixed(decimals);
}

function unitToMicro(unit: string, decimals: number): number {
  return Math.round(parseFloat(unit) * Math.pow(10, decimals));
}

export interface TokenBalance {
  balance: string;
  decimals: number;
  symbol: string;
  rawMicro: number;
}

export interface TxStatusResult {
  txid: string;
  status: 'success' | 'pending' | 'abort_by_response' | 'problem_processing' | 'not_found';
  blockHeight?: number;
  fee?: string;
  error?: string;
}

export async function getSip010Balance(
  contractAddress: string,
  contractName: string,
  ownerAddress: string,
  decimals = 6,
): Promise<ServiceResponse<TokenBalance>> {
  try {
    const url = `${hiroBase()}/extended/v1/ft/balances/${ownerAddress}`;
    const data = await fetchJson<{ ft_balances: Record<string, { balance: string; total_sent: string; total_received: string }> }>(url);
    const key = `${contractAddress}.${contractName}`;
    const entry = data.ft_balances[key];
    const raw = entry ? parseInt(entry.balance, 10) : 0;
    return {
      success: true,
      data: {
        balance: microToUnit(raw, decimals),
        decimals,
        symbol: contractName.toUpperCase(),
        rawMicro: raw,
      },
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function getStxBalance(address: string): Promise<ServiceResponse<TokenBalance>> {
  try {
    const url = `${hiroBase()}/extended/v1/address/${address}/stx`;
    const data = await fetchJson<{ balance: string }>(url);
    const raw = parseInt(data.balance, 10);
    return {
      success: true,
      data: {
        balance: microToUnit(raw, 6),
        decimals: 6,
        symbol: 'STX',
        rawMicro: raw,
      },
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function getTxStatus(txid: string): Promise<TxStatusResult> {
  try {
    const url = `${hiroBase()}/extended/v1/tx/${txid}`;
    const data = await fetchJson<{
      tx_status: string;
      block_height: number;
      tx_fee: string;
      error_data?: { code?: string; description?: string };
    }>(url);
    return {
      txid,
      status: data.tx_status as TxStatusResult['status'],
      blockHeight: data.block_height,
      fee: data.tx_fee,
      error: data.error_data?.description,
    };
  } catch {
    return { txid, status: 'not_found' };
  }
}

import { useState, useCallback, useRef, useEffect } from 'react';
import type { TxLifecycleState, PendingTx } from '../types';
import { getTxStatus, type TxStatusResult } from '../services/tokenService';
import { getExplorerTxUrl } from '../utils/network';
import { contractErrorToHuman } from '../utils/ContractErrorMap';

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 30;
const PENDING_TX_KEY = 'cinex_pending_txs';

function loadPendingTxs(): PendingTx[] {
  try {
    const raw = localStorage.getItem(PENDING_TX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function savePendingTxs(txs: PendingTx[]): void {
  try { localStorage.setItem(PENDING_TX_KEY, JSON.stringify(txs)); } catch { /* */ }
}

function removePendingTx(id: string): void {
  const txs = loadPendingTxs().filter(t => t.id !== id);
  savePendingTxs(txs);
}

function addPendingTx(tx: PendingTx): void {
  const txs = loadPendingTxs();
  txs.push(tx);
  savePendingTxs(txs);
}

function updatePendingTx(id: string, patch: Partial<PendingTx>): void {
  const txs = loadPendingTxs().map(t => t.id === id ? { ...t, ...patch } : t);
  savePendingTxs(txs);
}

export interface UseTransactionReturn {
  state: TxLifecycleState;
  txid: string | null;
  explorerUrl: string | null;
  error: string | null;
  pendingTxs: PendingTx[];

  start: (type: PendingTx['type'], amount: number, token: PendingTx['token']) => void;
  broadcast: (txid: string) => void;
  confirm: () => void;
  fail: (err: unknown) => void;
  cancel: () => void;
  reset: () => void;

  resumePending: () => void;
  clearPending: (id: string) => void;
}

export function useTransaction(): UseTransactionReturn {
  const [state, setState] = useState<TxLifecycleState>('idle');
  const [txid, setTxid] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingTxs, setPendingTxs] = useState<PendingTx[]>(loadPendingTxs);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);
  const currentIdRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    pollCountRef.current = 0;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const start = useCallback((type: PendingTx['type'], amount: number, token: PendingTx['token']) => {
    const id = crypto.randomUUID();
    currentIdRef.current = id;
    const tx: PendingTx = { id, type, status: 'building', amount, token, createdAt: Date.now() };
    addPendingTx(tx);
    setPendingTxs(loadPendingTxs());
    setState('building');
    setTxid(null);
    setExplorerUrl(null);
    setError(null);
  }, []);

  const broadcast = useCallback((newTxid: string) => {
    const id = currentIdRef.current;
    if (id) {
      updatePendingTx(id, { txid: newTxid, status: 'broadcasting', explorerUrl: getExplorerTxUrl(newTxid) });
      setPendingTxs(loadPendingTxs());
    }
    setTxid(newTxid);
    setExplorerUrl(getExplorerTxUrl(newTxid));
    setState('broadcasting');

    setState('confirming');
    if (id) { updatePendingTx(id, { status: 'confirming' }); setPendingTxs(loadPendingTxs()); }
    pollCountRef.current = 0;
    pollRef.current = setInterval(async () => {
      pollCountRef.current++;
      if (pollCountRef.current > MAX_POLL_ATTEMPTS) {
        cleanup();
        const msg = 'Confirmation is taking longer than expected. You can check back later — your transaction is still processing.';
        setError(msg);
        setState('confirmed');
        if (id) { updatePendingTx(id, { status: 'confirmed', error: msg, confirmedAt: Date.now() }); setPendingTxs(loadPendingTxs()); removePendingTx(id); }
        return;
      }
      try {
        const result = await getTxStatus(newTxid);
        if (result.status === 'success') {
          cleanup();
          setState('confirmed');
          if (id) { updatePendingTx(id, { status: 'confirmed', confirmedAt: Date.now() }); setPendingTxs(loadPendingTxs()); removePendingTx(id); }
        } else if (result.status === 'abort_by_response' || result.status === 'problem_processing') {
          cleanup();
          const msg = contractErrorToHuman(result.error || 'Transaction was rejected by the network.');
          setError(msg);
          setState('failed');
          if (id) { updatePendingTx(id, { status: 'failed', error: msg }); setPendingTxs(loadPendingTxs()); }
        }
      } catch { /* retry on next tick */ }
    }, POLL_INTERVAL_MS);
  }, [cleanup]);

  const confirm = useCallback(() => {
    const id = currentIdRef.current;
    cleanup();
    setState('confirmed');
    if (id) { removePendingTx(id); setPendingTxs(loadPendingTxs()); }
  }, [cleanup]);

  const fail = useCallback((err: unknown) => {
    const id = currentIdRef.current;
    cleanup();
    const msg = contractErrorToHuman(err);
    setError(msg);
    setState('failed');
    if (id) { updatePendingTx(id, { status: 'failed', error: msg }); setPendingTxs(loadPendingTxs()); }
  }, [cleanup]);

  const cancel = useCallback(() => {
    const id = currentIdRef.current;
    cleanup();
    setError(null);
    setState('idle');
    setTxid(null);
    setExplorerUrl(null);
    if (id) { removePendingTx(id); setPendingTxs(loadPendingTxs()); }
  }, [cleanup]);

  const reset = useCallback(() => {
    cleanup();
    setState('idle');
    setTxid(null);
    setExplorerUrl(null);
    setError(null);
    currentIdRef.current = null;
  }, [cleanup]);

  const resumePending = useCallback(() => {
    const txs = loadPendingTxs().filter(t => t.status === 'confirming' && t.txid);
    setPendingTxs(txs);
    for (const tx of txs) {
      if (!tx.txid) continue;
      const id = tx.id;
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        if (attempts > MAX_POLL_ATTEMPTS) { clearInterval(interval); removePendingTx(id); setPendingTxs(loadPendingTxs()); return; }
        try {
          const result = await getTxStatus(tx.txid!);
          if (result.status === 'success') { clearInterval(interval); updatePendingTx(id, { status: 'confirmed', confirmedAt: Date.now() }); removePendingTx(id); setPendingTxs(loadPendingTxs()); }
          else if (result.status === 'abort_by_response' || result.status === 'problem_processing') { clearInterval(interval); updatePendingTx(id, { status: 'failed', error: result.error }); setPendingTxs(loadPendingTxs()); }
        } catch { /* */ }
      }, POLL_INTERVAL_MS);
    }
  }, []);

  const clearPending = useCallback((id: string) => {
    removePendingTx(id);
    setPendingTxs(loadPendingTxs());
  }, []);

  return { state, txid, explorerUrl, error, pendingTxs, start, broadcast, confirm, fail, cancel, reset, resumePending, clearPending };
}

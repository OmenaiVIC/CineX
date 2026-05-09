// Transaction status tracking system for CineX platform
// Handles transaction lifecycle from initiation to completion with user feedback

import { useState, useEffect, useCallback, useRef } from 'react';

export type TransactionStatus = 
  | 'idle'
  | 'pending'
  | 'broadcasting'
  | 'submitted'
  | 'confirming'
  | 'confirmed'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'timeout';

export type TransactionType =
  | 'campaign-create'
  | 'campaign-contribute'
  | 'campaign-update'
  | 'pool-create'
  | 'pool-join'
  | 'pool-contribute'
  | 'escrow-deposit'
  | 'escrow-withdraw'
  | 'verification-submit'
  | 'verification-update'
  | 'nft-mint'
  | 'token-transfer';

export interface Transaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  title: string;
  description?: string;
  amount?: string;
  createdAt: number;
  updatedAt: number;
  txId?: string;
  error?: string;
}

class TransactionTracker {
  private transactions: Record<string, Transaction> = {};

  createTransaction(config: Partial<Transaction>): string {
    const id = `tx_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    this.transactions[id] = {
      id,
      type: config.type || 'campaign-create',
      status: 'idle',
      title: config.title || '',
      description: config.description,
      amount: config.amount,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    return id;
  }

  updateTransactionStatus(id: string, status: TransactionStatus, error?: string, txId?: string) {
    if (this.transactions[id]) {
      this.transactions[id].status = status;
      this.transactions[id].updatedAt = Date.now();
      if (error) this.transactions[id].error = error;
      if (txId) this.transactions[id].txId = txId;
    }
  }

  updateTransaction(id: string, updates: Partial<Transaction>) {
    if (this.transactions[id]) {
      Object.assign(this.transactions[id], updates);
      this.transactions[id].updatedAt = Date.now();
    }
  }

  getTransaction(id: string): Transaction | undefined {
    return this.transactions[id];
  }
}

export const transactionTracker = new TransactionTracker();

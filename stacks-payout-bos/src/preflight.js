import { ERROR_CODES } from './types.js';

export async function checkPreflight(ctx, disbursement) {
  const { db, logger, config } = ctx;
  const issues = [];

  if (!disbursement.recipient_bank_account) {
    issues.push({ field: 'recipient_bank_account', message: 'Missing bank account number', code: ERROR_CODES.MISSING_RECIPIENT });
  }

  if (!disbursement.recipient_bank_code) {
    issues.push({ field: 'recipient_bank_code', message: 'Missing bank code', code: ERROR_CODES.MISSING_RECIPIENT });
  }

  if (!disbursement.amount_usdcx || disbursement.amount_usdcx <= 0) {
    issues.push({ field: 'amount_usdcx', message: 'Invalid or zero amount', code: ERROR_CODES.INVALID_AMOUNT });
  }

  if (disbursement.amount_ngn_expected && disbursement.amount_ngn_expected <= 0) {
    issues.push({ field: 'amount_ngn_expected', message: 'Invalid expected NGN amount', code: ERROR_CODES.INVALID_AMOUNT });
  }

  try {
    const adapterStatus = {
      stacks: await ctx.adapters?.stacks?.getTransactionStatus('health').then(() => true).catch(() => false),
    };

    if (!adapterStatus.stacks && !config.bridgeAdapterEnv === 'mock') {
      issues.push({ field: 'stacks_adapter', message: 'Stacks adapter unreachable', code: ERROR_CODES.ADAPTER_UNAVAILABLE });
    }
  } catch {
    issues.push({ field: 'adapter_health', message: 'Could not verify adapter health', code: ERROR_CODES.ADAPTER_UNAVAILABLE });
  }

  try {
    const rate = await db.get('SELECT rate FROM exchange_rates WHERE pair = $1 ORDER BY updated_at DESC LIMIT 1', ['USDCx/NGN']);
    if (!rate) {
      issues.push({ field: 'exchange_rate', message: 'No USDCx/NGN exchange rate available', code: ERROR_CODES.PAYOUT_RATE_EXPIRED });
    }
  } catch {
    issues.push({ field: 'exchange_rate_db', message: 'Could not query exchange rate', code: ERROR_CODES.DB_ERROR });
  }

  return {
    passed: issues.length === 0,
    issues,
    requiresManualReview: issues.some(i => i.code === ERROR_CODES.ADAPTER_UNAVAILABLE),
  };
}

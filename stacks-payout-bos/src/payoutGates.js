export function createPayoutGates(ctx) {
  const { db, logger, config } = ctx;

  const MAX_PAYOUT_AMOUNT_USDCX = BigInt(config.maxPayoutAmountUsdcx || '500000000000');
  const MIN_PAYOUT_AMOUNT_USDCX = BigInt(config.minPayoutAmountUsdcx || '1000000');

  async function checkAmountTolerance(disbursement) {
    const amount = BigInt(disbursement.amount_usdcx);
    if (amount > MAX_PAYOUT_AMOUNT_USDCX) {
      return { passed: false, reason: `Amount ${amount} exceeds max ${MAX_PAYOUT_AMOUNT_USDCX}` };
    }
    if (amount < MIN_PAYOUT_AMOUNT_USDCX) {
      return { passed: false, reason: `Amount ${amount} below min ${MIN_PAYOUT_AMOUNT_USDCX}` };
    }
    return { passed: true };
  }

  async function checkBeneficiaryPayload(disbursement) {
    if (!disbursement.recipient_bank_account) {
      return { passed: false, reason: 'Missing bank account number' };
    }
    if (!disbursement.recipient_bank_code) {
      return { passed: false, reason: 'Missing bank code' };
    }
    return { passed: true };
  }

  async function checkDuplicatePrevention(disbursement) {
    if (!disbursement.idempotency_key) return { passed: true };

    try {
      const existing = await db.get(
        `SELECT COUNT(*) AS count FROM disbursements
         WHERE idempotency_key = $1 AND id != $2 AND status IN ('settled', 'burn_submitted', 'yellowcard_payout_submitted')`,
        [disbursement.idempotency_key, disbursement.id]
      );
      if (existing && existing.count > 0) {
        return { passed: false, reason: 'Duplicate disbursement detected by idempotency_key' };
      }
    } catch (err) {
      logger.warn(`[bos:gates] Duplicate check failed: ${err.message}`);
    }
    return { passed: true };
  }

  async function checkExchangeRateFreshness(disbursement) {
    if (!disbursement.exchange_rate) return { passed: true };

    const rateAgeMs = Date.now() - new Date(disbursement.created_at).getTime();
    if (rateAgeMs > 300_000) {
      return { passed: false, reason: 'Exchange rate older than 5 minutes' };
    }
    return { passed: true };
  }

  async function runAllGates(disbursement) {
    const results = await Promise.all([
      checkAmountTolerance(disbursement),
      checkBeneficiaryPayload(disbursement),
      checkDuplicatePrevention(disbursement),
      checkExchangeRateFreshness(disbursement),
    ]);

    const failures = results.filter(r => !r.passed);
    return {
      passed: failures.length === 0,
      gates: results,
      failures,
    };
  }

  async function check(disbursement) {
    return await runAllGates(disbursement);
  }

  return {
    checkAmountTolerance,
    checkBeneficiaryPayload,
    checkDuplicatePrevention,
    checkExchangeRateFreshness,
    runAllGates,
    check,
  };
}

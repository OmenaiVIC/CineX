import { BOS_STATES, ERROR_CODES } from './types.js';

export function getTransitionActions(ctx) {
  const { db, logger, adapters, config, pipelineWorker } = ctx;

  async function executeBurn(disbursement) {
    try {
      logger.info(`[bos:action] Executing burn for disbursement ${disbursement.id}`);

      const result = await adapters.stacks.burnUsdcx({
        amount: String(disbursement.amount_usdcx),
        memo: `DISBURSE:${disbursement.id}`,
        idempotencyKey: disbursement.idempotency_key,
      });

      const txid = result?.txid || result?.tx_hash || result?.txId;
      if (!txid) {
        return { success: false, message: 'No txid returned from burn', requiresManualReview: true };
      }

      await recordExternalRef(ctx, disbursement.id, 'stacks', 'tx_id', txid);

      return { success: true, message: txid };
    } catch (err) {
      logger.error(`[bos:action] Burn failed for ${disbursement.id}: ${err.message}`);
      return { success: false, message: `Burn execution failed: ${err.message}`, requiresManualReview: false };
    }
  }

  async function executeAttestation(disbursement) {
    try {
      logger.info(`[bos:action] Requesting attestation for disbursement ${disbursement.id}`);

      const result = await adapters.xreserve.requestAttestation(
        String(disbursement.amount_usdcx),
        `DISBURSE:${disbursement.id}`
      );

      const attestationId = result?.attestationId || result?.attestation_id || result?.id;
      if (!attestationId) {
        return { success: false, message: 'No attestationId returned', requiresManualReview: true };
      }

      await recordExternalRef(ctx, disbursement.id, 'xreserve', 'attestation_id', attestationId);

      return { success: true, message: attestationId };
    } catch (err) {
      logger.error(`[bos:action] Attestation request failed for ${disbursement.id}: ${err.message}`);
      return { success: false, message: `Attestation failed: ${err.message}`, requiresManualReview: false };
    }
  }

  async function executeDestinationRelease(disbursement) {
    try {
      logger.info(`[bos:action] Releasing destination for disbursement ${disbursement.id}`);

      const result = await adapters.xreserve.releaseDestination(disbursement.attestation_id);
      const releaseId = result?.releaseId || result?.release_id || result?.id;
      if (!releaseId) {
        return { success: false, message: 'No releaseId returned', requiresManualReview: true };
      }

      await recordExternalRef(ctx, disbursement.id, 'xreserve', 'release_id', releaseId);

      return { success: true, message: releaseId };
    } catch (err) {
      logger.error(`[bos:action] Destination release failed for ${disbursement.id}: ${err.message}`);
      return { success: false, message: `Release failed: ${err.message}`, requiresManualReview: false };
    }
  }

  async function executeYellowCardPayout(disbursement) {
    try {
      logger.info(`[bos:action] Initiating Yellow Card payout for disbursement ${disbursement.id}`);

      let rate = config.defaultUsdcxNgnRate || 1650;
      try {
        const rateRow = await db.get('SELECT rate FROM exchange_rates WHERE pair = $1 ORDER BY updated_at DESC LIMIT 1', ['USDCx/NGN']);
        if (rateRow?.rate) rate = Number(rateRow.rate);
      } catch {
        logger.warn('[bos:action] Could not fetch exchange rate, using default');
      }

      const amountNgn = Math.round(Number(disbursement.amount_usdcx) * rate);

      const recipient = disbursement.ngn_recipient || {
        bank_account: disbursement.recipient_bank_account,
        bank_code: disbursement.recipient_bank_code,
      };

      const result = await adapters.yellowcard.initiatePayout({
        amount: amountNgn,
        currency: 'NGN',
        recipient,
        reference: `DISBURSE:${disbursement.id}`,
      });

      const payoutId = result?.payoutId || result?.payout_id || result?.id || result?.reference;
      if (!payoutId) {
        return { success: false, message: 'No payoutId returned from Yellow Card', requiresManualReview: true };
      }

      await recordExternalRef(ctx, disbursement.id, 'yellowcard', 'payout_id', payoutId);

      return { success: true, message: payoutId };
    } catch (err) {
      logger.error(`[bos:action] Yellow Card payout failed for ${disbursement.id}: ${err.message}`);
      return { success: false, message: `Payout failed: ${err.message}`, requiresManualReview: false };
    }
  }

  async function executeSettle(disbursement) {
    try {
      logger.info(`[bos:action] Settling disbursement ${disbursement.id}`);
      return { success: true, message: 'Disbursement settled' };
    } catch (err) {
      return { success: false, message: `Settlement failed: ${err.message}`, requiresManualReview: false };
    }
  }

  async function recordExternalRef(ctx, disbursementId, system, type, value) {
    try {
      await ctx.db.query(
        `INSERT INTO external_refs (disbursement_id, external_system, identifier_type, identifier_value)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (disbursement_id, external_system, identifier_type)
         DO UPDATE SET identifier_value = EXCLUDED.identifier_value, updated_at = NOW()`,
        [disbursementId, system, type, value]
      );
    } catch (err) {
      ctx.logger.warn(`[bos:action] Failed to record external ref: ${err.message}`);
    }
  }

  const actionMap = {
    [BOS_STATES.BURN_SUBMITTED]: executeBurn,
    [BOS_STATES.ATTESTATION_REQUESTED]: executeAttestation,
    [BOS_STATES.DESTINATION_RELEASE_SUBMITTED]: executeDestinationRelease,
    [BOS_STATES.YELLOWCARD_PAYOUT_SUBMITTED]: executeYellowCardPayout,
    [BOS_STATES.SETTLED]: executeSettle,
  };

  async function execute(disbursement, targetState) {
    const actionFn = actionMap[targetState];
    if (!actionFn) {
      return { success: true, message: 'No action required for this transition' };
    }

    if (targetState === BOS_STATES.BURN_SUBMITTED) {
      return await executeBurn(disbursement);
    }
    if (targetState === BOS_STATES.ATTESTATION_REQUESTED) {
      return await executeAttestation(disbursement);
    }
    if (targetState === BOS_STATES.DESTINATION_RELEASE_SUBMITTED) {
      return await executeDestinationRelease(disbursement);
    }
    if (targetState === BOS_STATES.YELLOWCARD_PAYOUT_SUBMITTED) {
      return await executeYellowCardPayout(disbursement);
    }

    return { success: true, message: 'ok' };
  }

  return { execute, executeBurn, executeAttestation, executeDestinationRelease, executeYellowCardPayout };
}

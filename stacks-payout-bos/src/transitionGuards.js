import { BOS_STATES, ERROR_CODES } from './types.js';

export function getTransitionGuards(ctx) {
  const { db, logger, adapters } = ctx;

  async function checkBurnSubmitted(disbursement) {
    if (!disbursement.amount_usdcx || disbursement.amount_usdcx <= 0) {
      return { allowed: false, reason: 'Invalid amount_usdcx', errorCode: ERROR_CODES.INVALID_AMOUNT };
    }

    if (!disbursement.creator_btc_address && !disbursement.ngn_recipient) {
      return { allowed: false, reason: 'Missing recipient destination', errorCode: ERROR_CODES.MISSING_RECIPIENT };
    }

    try {
      const healthy = await adapters.stacks.getTransactionStatus('health');
      if (!healthy) {
        return { allowed: false, reason: 'Stacks adapter unhealthy', errorCode: ERROR_CODES.ADAPTER_UNAVAILABLE };
      }
    } catch {
      return { allowed: false, reason: 'Stacks adapter unreachable', errorCode: ERROR_CODES.ADAPTER_UNAVAILABLE };
    }

    return { allowed: true };
  }

  async function checkBurnConfirmed(disbursement) {
    if (!disbursement.external_tx_id) {
      return { allowed: false, reason: 'No burn txid recorded', errorCode: ERROR_CODES.BURN_TX_FAILED };
    }

    try {
      const status = await adapters.stacks.getTransactionStatus(disbursement.external_tx_id);
      if (status?.status === 'success' || status?.tx_status === 'success') {
        return { allowed: true };
      }
      if (status?.status === 'pending' || status?.tx_status === 'pending') {
        return { allowed: false, reason: 'Burn tx still pending', requiresManualReview: false };
      }
      return { allowed: false, reason: `Burn tx status: ${status?.status || 'unknown'}`, errorCode: ERROR_CODES.BURN_NOT_CONFIRMED };
    } catch (err) {
      return { allowed: false, reason: `Failed to check burn status: ${err.message}`, requiresManualReview: true };
    }
  }

  async function checkAttestationRequested(disbursement) {
    if (!disbursement.external_tx_id) {
      return { allowed: false, reason: 'No burn tx confirmed', errorCode: ERROR_CODES.BURN_NOT_CONFIRMED };
    }

    try {
      const healthy = await adapters.xreserve.healthCheck();
      if (!healthy) {
        return { allowed: false, reason: 'xReserve adapter unhealthy', errorCode: ERROR_CODES.ADAPTER_UNAVAILABLE };
      }
    } catch {
      return { allowed: false, reason: 'xReserve adapter unreachable', errorCode: ERROR_CODES.ADAPTER_UNAVAILABLE };
    }

    return { allowed: true };
  }

  async function checkAttestationConfirmed(disbursement) {
    const attestationId = disbursement.attestation_id;
    if (!attestationId) {
      return { allowed: false, reason: 'No attestation_id recorded', errorCode: ERROR_CODES.ATTESTATION_INVALID };
    }

    try {
      const status = await adapters.xreserve.getAttestationStatus(attestationId);
      if (status?.status === 'completed' || status?.status === 'confirmed') {
        return { allowed: true };
      }
      if (status?.status === 'pending' || status?.status === 'processing') {
        return { allowed: false, reason: 'Attestation still pending' };
      }
      return { allowed: false, reason: `Attestation status: ${status?.status || 'unknown'}`, errorCode: ERROR_CODES.ATTESTATION_REJECTED };
    } catch (err) {
      return { allowed: false, reason: `Failed to check attestation: ${err.message}`, requiresManualReview: true };
    }
  }

  async function checkDestinationReleaseSubmitted(disbursement) {
    if (!disbursement.attestation_id) {
      return { allowed: false, reason: 'No attestation confirmed', errorCode: ERROR_CODES.ATTESTATION_INVALID };
    }

    try {
      const healthy = await adapters.xreserve.healthCheck();
      if (!healthy) {
        return { allowed: false, reason: 'xReserve adapter unhealthy', errorCode: ERROR_CODES.ADAPTER_UNAVAILABLE };
      }
    } catch {
      return { allowed: false, reason: 'xReserve adapter unreachable', errorCode: ERROR_CODES.ADAPTER_UNAVAILABLE };
    }

    return { allowed: true };
  }

  async function checkDestinationReleaseConfirmed(disbursement) {
    const releaseId = disbursement.release_id;
    if (!releaseId) {
      return { allowed: false, reason: 'No release_id recorded', errorCode: ERROR_CODES.PAYOUT_INVALID_RECIPIENT };
    }

    try {
      const status = await adapters.xreserve.getReleaseStatus(releaseId);
      if (status?.status === 'completed' || status?.status === 'confirmed') {
        return { allowed: true };
      }
      if (status?.status === 'pending' || status?.status === 'processing') {
        return { allowed: false, reason: 'Destination release still pending' };
      }
      return { allowed: false, reason: `Release status: ${status?.status || 'unknown'}`, requiresManualReview: true };
    } catch (err) {
      return { allowed: false, reason: `Failed to check release: ${err.message}`, requiresManualReview: true };
    }
  }

  async function checkYellowCardPayoutSubmitted(disbursement) {
    if (!disbursement.recipient_bank_account || !disbursement.recipient_bank_code) {
      return { allowed: false, reason: 'Missing bank recipient details', errorCode: ERROR_CODES.PAYOUT_INVALID_RECIPIENT };
    }

    try {
      const healthy = await adapters.yellowcard.healthCheck();
      if (!healthy) {
        return { allowed: false, reason: 'Yellow Card adapter unhealthy', errorCode: ERROR_CODES.ADAPTER_UNAVAILABLE };
      }
    } catch {
      return { allowed: false, reason: 'Yellow Card adapter unreachable', errorCode: ERROR_CODES.ADAPTER_UNAVAILABLE };
    }

    return { allowed: true };
  }

  async function checkYellowCardPayoutConfirmed(disbursement) {
    const payoutId = disbursement.payout_id;
    if (!payoutId) {
      return { allowed: false, reason: 'No payout_id recorded', errorCode: ERROR_CODES.PAYOUT_FAILED };
    }

    try {
      const status = await adapters.yellowcard.getPayoutStatus(payoutId);
      if (status?.status === 'completed' || status?.status === 'successful') {
        return { allowed: true };
      }
      if (status?.status === 'pending' || status?.status === 'processing') {
        return { allowed: false, reason: 'Payout still pending' };
      }
      return { allowed: false, reason: `Payout status: ${status?.status || 'unknown'}`, requiresManualReview: true };
    } catch (err) {
      return { allowed: false, reason: `Failed to check payout: ${err.message}`, requiresManualReview: true };
    }
  }

  const guardMap = {
    [BOS_STATES.BURN_SUBMITTED]: checkBurnSubmitted,
    [BOS_STATES.BURN_CONFIRMED]: checkBurnConfirmed,
    [BOS_STATES.ATTESTATION_REQUESTED]: checkAttestationRequested,
    [BOS_STATES.ATTESTATION_CONFIRMED]: checkAttestationConfirmed,
    [BOS_STATES.DESTINATION_RELEASE_SUBMITTED]: checkDestinationReleaseSubmitted,
    [BOS_STATES.DESTINATION_RELEASE_CONFIRMED]: checkDestinationReleaseConfirmed,
    [BOS_STATES.YELLOWCARD_PAYOUT_SUBMITTED]: checkYellowCardPayoutSubmitted,
    [BOS_STATES.YELLOWCARD_PAYOUT_CONFIRMED]: checkYellowCardPayoutConfirmed,
  };

  async function check(disbursement, targetState) {
    const guardFn = guardMap[targetState];
    if (!guardFn) {
      return { allowed: true };
    }
    return await guardFn(disbursement);
  }

  return { check, guardMap };
}

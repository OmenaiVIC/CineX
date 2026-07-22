/**
 * BOS Transition Actions — Side-effect functions
 * Each action performs the real work: DB writes, external API calls, chain txs
 * All actions are idempotent — safe to re-run under duplicate worker execution.
 */

import { DisbursementState } from './types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Action: submitBurn
// disbursement_initiated → burn_submitted
// Broadcasts USDCx burn tx on Stacks chain
// ─────────────────────────────────────────────────────────────────────────────
export async function submitBurn(disbursement, ctx) {
  const log = ctx.getLogger('transition:submitBurn');
  const db = ctx.getDb();

  log.info({ id: disbursement.id, amount_usdcx: disbursement.amount_usdcx }, 'Submitting burn tx');

  const burnTxId = await ctx.adapters.stacks.burnUsdcx({
    amount: disbursement.amount_usdcx,
    recipient: disbursement.creator_address,
    memo: `BOS:${disbursement.id}`,
    idempotencyKey: `burn:${disbursement.id}`,
  });

  await upsertExternalRef(db, disbursement.id, 'stacks', 'tx_id', burnTxId, {
    burn_amount: disbursement.amount_usdcx,
    submitted_at: new Date().toISOString(),
  });

  log.info({ id: disbursement.id, burnTxId }, 'Burn tx submitted');
  return { external_tx_id: burnTxId };
}

// ─────────────────────────────────────────────────────────────────────────────
// Action: recordBurnConfirmation
// burn_submitted → burn_confirmed
// Writes burn block height into external_refs metadata
// ─────────────────────────────────────────────────────────────────────────────
export async function recordBurnConfirmation(disbursement, ctx) {
  const log = ctx.getLogger('transition:recordBurnConfirmation');
  const db = ctx.getDb();

  const details = await isBurnConfirmed(disbursement, ctx);
  const meta = { confirmed_at: new Date().toISOString(), block_height: details.burn_block_height };

  await upsertExternalRef(db, disbursement.id, 'stacks', 'tx_id', disbursement.external_tx_id, meta);

  log.info({ id: disbursement.id, block_height: details.burn_block_height }, 'Burn confirmed');
  return { burn_block_height: details.burn_block_height };
}

// ─────────────────────────────────────────────────────────────────────────────
// Action: requestAttestation
// burn_confirmed → attestation_requested
// Requests attestation from xReserve
// ─────────────────────────────────────────────────────────────────────────────
export async function requestAttestation(disbursement, ctx) {
  const log = ctx.getLogger('transition:requestAttestation');
  const db = ctx.getDb();

  log.info({ id: disbursement.id }, 'Requesting xReserve attestation');

  const attestation = await ctx.adapters.xreserve.requestAttestation({
    tx_id: disbursement.external_tx_id,
    token_contract: process.env.USDCX_CONTRACT || 'SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx',
    amount_sats: disbursement.amount_usdcx,
  });

  await upsertExternalRef(db, disbursement.id, 'xreserve', 'attestation_id', attestation.attestation_id, {
    requested_at: new Date().toISOString(),
    attestation_data: attestation,
  });

  log.info({ id: disbursement.id, attestation_id: attestation.attestation_id }, 'Attestation requested');
  return { attestation_id: attestation.attestation_id };
}

// ─────────────────────────────────────────────────────────────────────────────
// Action: confirmAttestation
// attestation_requested → attestation_confirmed
// Records xReserve confirmation metadata
// ─────────────────────────────────────────────────────────────────────────────
export async function confirmAttestation(disbursement, ctx) {
  const log = ctx.getLogger('transition:confirmAttestation');
  const db = ctx.getDb();

  const ref = await getExternalRef(db, disbursement.id, 'xreserve', 'attestation_id');
  const attestation = await ctx.adapters.xreserve.getAttestationStatus(ref.identifier_value);

  await upsertExternalRef(db, disbursement.id, 'xreserve', 'attestation_id', ref.identifier_value, {
    ...ref.metadata,
    confirmed_at: new Date().toISOString(),
    attestation_data: attestation,
  });

  log.info({ id: disbursement.id, attestation_id: ref.identifier_value }, 'Attestation confirmed');
  return { attestation_id: ref.identifier_value };
}

// ─────────────────────────────────────────────────────────────────────────────
// Action: submitDestinationRelease
// attestation_confirmed → destination_release_submitted
// Requests xReserve to release funds to creator's BTC address
// ─────────────────────────────────────────────────────────────────────────────
export async function submitDestinationRelease(disbursement, ctx) {
  const log = ctx.getLogger('transition:submitDestinationRelease');
  const db = ctx.getDb();

  log.info({ id: disbursement.id }, 'Submitting destination release');

  const release = await ctx.adapters.xreserve.releaseDestination({
    attestation_id: await _getAttestationId(db, disbursement.id),
    recipient_btc: disbursement.creator_btc_address || disbursement.creator_address,
    amount_sats: disbursement.amount_usdcx,
    idempotencyKey: `release:${disbursement.id}`,
  });

  await upsertExternalRef(db, disbursement.id, 'xreserve', 'release_id', release.release_id, {
    submitted_at: new Date().toISOString(),
    release_data: release,
  });

  log.info({ id: disbursement.id, release_id: release.release_id }, 'Destination release submitted');
  return { release_id: release.release_id };
}

// ─────────────────────────────────────────────────────────────────────────────
// Action: confirmDestinationRelease
// destination_release_submitted → destination_release_confirmed
// Records release confirmation from xReserve
// ─────────────────────────────────────────────────────────────────────────────
export async function confirmDestinationRelease(disbursement, ctx) {
  const log = ctx.getLogger('transition:confirmDestinationRelease');
  const db = ctx.getDb();

  const ref = await getExternalRef(db, disbursement.id, 'xreserve', 'release_id');
  const release = await ctx.adapters.xreserve.getReleaseStatus(ref.identifier_value);

  await upsertExternalRef(db, disbursement.id, 'xreserve', 'release_id', ref.identifier_value, {
    ...ref.metadata,
    confirmed_at: new Date().toISOString(),
    release_data: release,
  });

  log.info({ id: disbursement.id, release_id: ref.identifier_value }, 'Destination release confirmed');
  return { release_id: ref.identifier_value };
}

// ─────────────────────────────────────────────────────────────────────────────
// Action: submitYellowCardPayout
// destination_release_confirmed → yellowcard_payout_submitted
// Initiates NGN payout via Yellow Card
// ─────────────────────────────────────────────────────────────────────────────
export async function submitYellowCardPayout(disbursement, ctx) {
  const log = ctx.getLogger('transition:submitYellowCardPayout');
  const db = ctx.getDb();

  // Fetch current exchange rate for NGN calculation
  const rateRow = await db.get(
    `SELECT rate FROM exchange_rates WHERE pair = 'USDCx/NGN' ORDER BY updated_at DESC LIMIT 1`
  );
  if (!rateRow) throw new Error('No exchange rate available');

  const amount_ngn = Math.round(disbursement.amount_usd * rateRow.rate * 100);

  log.info({ id: disbursement.id, amount_usd: disbursement.amount_usd, amount_ngn }, 'Submitting Yellow Card payout');

  const payout = await ctx.adapters.yellowcard.initiatePayout({
    idempotency_key: `payout:${disbursement.id}`,
    amount: disbursement.amount_usdcx,
    recipient_type: 'mobile_money',
    recipient: disbursement.ngn_recipient || {},
    currency: 'NGN',
    callback_url: `${process.env.BASE_URL || 'http://localhost:3001'}/api/bos/webhooks/yellowcard`,
  });

  await upsertExternalRef(db, disbursement.id, 'yellowcard', 'payout_id', payout.payout_id, {
    submitted_at: new Date().toISOString(),
    amount_ngn,
    exchange_rate: rateRow.rate,
    payout_data: payout,
  });

  log.info({ id: disbursement.id, payout_id: payout.payout_id }, 'Yellow Card payout submitted');
  return { payout_id: payout.payout_id, amount_ngn };
}

// ─────────────────────────────────────────────────────────────────────────────
// Action: confirmYellowCardPayout
// yellowcard_payout_submitted → yellowcard_payout_confirmed
// Records Yellow Card payout confirmation
// ─────────────────────────────────────────────────────────────────────────────
export async function confirmYellowCardPayout(disbursement, ctx) {
  const log = ctx.getLogger('transition:confirmYellowCardPayout');
  const db = ctx.getDb();

  const ref = await getExternalRef(db, disbursement.id, 'yellowcard', 'payout_id');
  const payout = await ctx.adapters.yellowcard.getPayoutStatus(ref.identifier_value);

  await upsertExternalRef(db, disbursement.id, 'yellowcard', 'payout_id', ref.identifier_value, {
    ...ref.metadata,
    confirmed_at: new Date().toISOString(),
    payout_data: payout,
  });

  log.info({ id: disbursement.id, payout_id: ref.identifier_value }, 'Yellow Card payout confirmed');
  return { payout_id: ref.identifier_value };
}

// ─────────────────────────────────────────────────────────────────────────────
// Action: markSettled
// yellowcard_payout_confirmed → settled
// Terminal: records settlement timestamp
// ─────────────────────────────────────────────────────────────────────────────
export async function markSettled(disbursement, ctx) {
  const log = ctx.getLogger('transition:markSettled');
  log.info({ id: disbursement.id }, 'Disbursement settled');
  return { settled_at: new Date().toISOString() };
}

// ─────────────────────────────────────────────────────────────────────────────
// Action: markFailed
// Any non-terminal → failed
// Terminal: records failure reason
// ─────────────────────────────────────────────────────────────────────────────
export async function markFailed(disbursement, ctx) {
  const log = ctx.getLogger('transition:markFailed');
  log.warn({ id: disbursement.id, reason: disbursement.last_error }, 'Disbursement marked failed');
  return { failed_at: new Date().toISOString() };
}

// ─────────────────────────────────────────────────────────────────────────────
// Action: markCancelled
// Any non-terminal → cancelled
// Terminal: user/system requested cancellation
// ─────────────────────────────────────────────────────────────────────────────
export async function markCancelled(disbursement, ctx) {
  const log = ctx.getLogger('transition:markCancelled');
  log.info({ id: disbursement.id }, 'Disbursement cancelled');
  return { cancelled_at: new Date().toISOString() };
}

// ─────────────────────────────────────────────────────────────────────────────
// Action: moveToManualReview
// Any non-terminal → manual_review
// Background reaper or explicit operator action
// ─────────────────────────────────────────────────────────────────────────────
export async function moveToManualReview(disbursement, ctx) {
  const log = ctx.getLogger('transition:moveToManualReview');
  log.warn({ id: disbursement.id, from_status: disbursement.status }, 'Moving to manual review');
  return { manual_review_at: new Date().toISOString() };
}

// ─────────────────────────────────────────────────────────────────────────────
// DB Helpers — external_refs upsert (idempotent)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upsert an external reference. If a row with the same
 * (disbursement_id, external_system, identifier_type) already exists,
 * the metadata is merged (JSONB patch).
 */
export async function upsertExternalRef(db, disbursementId, system, idType, idValue, metadata = {}) {
  await db.run(
    `INSERT INTO external_refs (disbursement_id, external_system, identifier_type, identifier_value, metadata, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     ON CONFLICT (disbursement_id, external_system, identifier_type)
     DO UPDATE SET
       identifier_value = EXCLUDED.identifier_value,
       metadata = external_refs.metadata || EXCLUDED.metadata,
       updated_at = NOW()`,
    [disbursementId, system, idType, idValue, JSON.stringify(metadata)]
  );
}

/**
 * Get an external reference by (disbursement_id, system, type)
 */
export async function getExternalRef(db, disbursementId, system, idType) {
  return db.get(
    `SELECT * FROM external_refs
     WHERE disbursement_id = $1 AND external_system = $2 AND identifier_type = $3`,
    [disbursementId, system, idType]
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

async function _getAttestationId(db, disbursementId) {
  const ref = await getExternalRef(db, disbursementId, 'xreserve', 'attestation_id');
  if (!ref) throw new Error(`No attestation_id ref for disbursement ${disbursementId}`);
  return ref.identifier_value;
}

async function isBurnConfirmed(disbursement, ctx) {
  const status = await ctx.adapters.stacks.getTransactionStatus(disbursement.external_tx_id);
  return { burn_block_height: status.block_height };
}

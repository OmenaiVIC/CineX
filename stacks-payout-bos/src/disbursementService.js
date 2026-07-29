import {
  BOS_STATES, TERMINAL_STATES, ACTIVE_STATES, ERROR_CODES, isValidTransition,
} from './types.js';
import { createStateMachine } from './stateMachine.js';
import { checkPreflight } from './preflight.js';
import { getTransitionActions } from './transitionActions.js';
import { getTransitionGuards } from './transitionGuards.js';
import { getAllowedTransition } from './bridgeAdapterFactory.js';

const DEFAULT_MAX_RETRIES = 3;

export function createDisbursementService(ctx) {
  const { db, logger, config, adapters } = ctx;
  const machine = createStateMachine();
  const actions = getTransitionActions(ctx);
  const guards = getTransitionGuards(ctx);

  function formatError(err) {
    if (err && typeof err === 'object' && err.code) {
      return { code: err.code, message: err.message || String(err) };
    }
    return { code: ERROR_CODES.INTERNAL_ERROR, message: String(err || 'unknown error') };
  }

  async function createDisbursement(params) {
    const {
      campaignId, milestoneIndex, creatorAddress, recipientBankAccount,
      recipientBankCode, amountUsdcx, amountNgnExpected, exchangeRate,
      idempotencyKey, initiatedBy = 'system', metadata = {},
      creatorBtcAddress, ngnRecipient,
    } = params;

    if (!campaignId || !milestoneIndex || !creatorAddress || !idempotencyKey) {
      const err = new Error('Missing required fields: campaignId, milestoneIndex, creatorAddress, idempotencyKey');
      err.code = ERROR_CODES.INVALID_CAMPAIGN;
      throw err;
    }

    if (!recipientBankAccount || !recipientBankCode) {
      const err = new Error('Missing recipient banking details');
      err.code = ERROR_CODES.MISSING_RECIPIENT;
      throw err;
    }

    if (!amountUsdcx || amountUsdcx <= 0) {
      const err = new Error('Invalid amount: must be positive');
      err.code = ERROR_CODES.INVALID_AMOUNT;
      throw err;
    }

    try {
      const existing = await db.get(
        'SELECT id, status FROM disbursements WHERE idempotency_key = $1',
        [idempotencyKey]
      );
      if (existing) {
        return existing;
      }
    } catch (dbErr) {
      const err = new Error(`DB error checking idempotency: ${dbErr.message}`);
      err.code = ERROR_CODES.DB_ERROR;
      throw err;
    }

    try {
      const burnDeadline = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const attestationDeadline = new Date(Date.now() + 25 * 60 * 1000).toISOString();
      const payoutDeadline = new Date(Date.now() + 90 * 60 * 1000).toISOString();

      const result = await db.query(
        `INSERT INTO disbursements
         (campaign_id, milestone_index, creator_address, recipient_bank_account,
          recipient_bank_code, amount_usdcx, amount_ngn_expected, exchange_rate,
          status, idempotency_key, initiated_by, metadata, creator_btc_address,
          ngn_recipient, burn_deadline_at, attestation_deadline_at, payout_deadline_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         RETURNING id`,
        [campaignId, milestoneIndex, creatorAddress, recipientBankAccount,
         recipientBankCode, amountUsdcx, amountNgnExpected, exchangeRate,
         BOS_STATES.DISBURSEMENT_INITIATED, idempotencyKey, initiatedBy,
         JSON.stringify(metadata), creatorBtcAddress || null,
         ngnRecipient ? JSON.stringify(ngnRecipient) : null,
         burnDeadline, attestationDeadline, payoutDeadline]
      );

      const disbursementId = result.rows?.[0]?.id || result.id;

      await recordAuditEvent(ctx, {
        disbursementId,
        eventType: 'disbursement_created',
        fromStatus: null,
        toStatus: BOS_STATES.DISBURSEMENT_INITIATED,
        guardResult: 'pass',
      });

      const disbursement = await getDisbursement(disbursementId);
      logger.info(`[bos] Disbursement ${disbursementId} created for campaign ${campaignId}`);
      return disbursement;
    } catch (dbErr) {
      if (dbErr.constraint === 'disbursements_idempotency_key_key' ||
          dbErr.message?.includes('unique') ||
          dbErr.message?.includes('duplicate')) {
        return await getDisbursementByIdempotencyKey(idempotencyKey);
      }
      const err = new Error(`DB error creating disbursement: ${dbErr.message}`);
      err.code = ERROR_CODES.DB_ERROR;
      throw err;
    }
  }

  async function getDisbursement(id) {
    try {
      const row = await db.get('SELECT * FROM disbursements WHERE id = $1', [id]);
      return row || null;
    } catch (dbErr) {
      const err = new Error(`DB error fetching disbursement: ${dbErr.message}`);
      err.code = ERROR_CODES.DB_ERROR;
      throw err;
    }
  }

  async function getDisbursementByIdempotencyKey(key) {
    try {
      return await db.get('SELECT * FROM disbursements WHERE idempotency_key = $1', [key]);
    } catch (dbErr) {
      const err = new Error(`DB error: ${dbErr.message}`);
      err.code = ERROR_CODES.DB_ERROR;
      throw err;
    }
  }

  async function getActiveDisbursements({ limit = 50, offset = 0 } = {}) {
    try {
      const statuses = [...ACTIVE_STATES].map((_, i) => `$${i + 1}`);
      const params = [...ACTIVE_STATES, limit, offset];
      const rows = await db.all(
        `SELECT * FROM disbursements
         WHERE status IN (${statuses.join(', ')})
         ORDER BY updated_at DESC
         LIMIT $${ACTIVE_STATES.size + 1} OFFSET $${ACTIVE_STATES.size + 2}`,
        params
      );
      return rows;
    } catch (dbErr) {
      const err = new Error(`DB error: ${dbErr.message}`);
      err.code = ERROR_CODES.DB_ERROR;
      throw err;
    }
  }

  async function recordAuditEvent(ctx, { disbursementId, eventType, fromStatus, toStatus, guardResult, guardReason, metadata }) {
    const db = ctx.db;
    try {
      await db.query(
        `INSERT INTO disbursement_audit
         (disbursement_id, event_type, from_status, to_status, worker_id, guard_result, guard_reason, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [disbursementId, eventType, fromStatus, toStatus, 'disbursementService', guardResult || 'pass', guardReason || null, metadata ? JSON.stringify(metadata) : null]
      );
    } catch (err) {
      logger.error(`[bos:audit] Failed to record audit event: ${err.message}`);
    }
  }

  async function advanceDisbursement(id) {
    const disbursement = await getDisbursement(id);
    if (!disbursement) {
      throw Object.assign(new Error(`Disbursement ${id} not found`), { code: ERROR_CODES.INVALID_CAMPAIGN });
    }

    if (isTerminal(disbursement.status)) {
      logger.info(`[bos] Disbursement ${id} already in terminal state: ${disbursement.status}`);
      return disbursement;
    }

    if (disbursement.retry_count > (disbursement.max_retries || DEFAULT_MAX_RETRIES)) {
      await transitionTo(ctx, id, disbursement.status, BOS_STATES.FAILED, ERROR_CODES.RETRY_EXHAUSTED, 'Retry count exceeded');
      return await getDisbursement(id);
    }

    const allowedTransitions = machine.getTransitions(disbursement.status);
    if (!allowedTransitions || allowedTransitions.length === 0) {
      logger.warn(`[bos] No transitions from ${disbursement.status} for disbursement ${id}`);
      return disbursement;
    }

    let targetState = null;
    for (const candidate of allowedTransitions) {
      if (candidate === BOS_STATES.FAILED) continue;
      const allowed = await getAllowedTransition(ctx, disbursement, candidate);
      if (allowed) {
        targetState = candidate;
        break;
      }
    }

    if (!targetState) {
      targetState = BOS_STATES.FAILED;
    }

    const guardsPassed = await guards.check(disbursement, targetState);
    if (!guardsPassed.allowed) {
      if (guardsPassed.requiresManualReview) {
        await transitionTo(ctx, id, disbursement.status, BOS_STATES.MANUAL_REVIEW_REQUIRED, null, guardsPassed.reason);
      } else {
        await transitionTo(ctx, id, disbursement.status, BOS_STATES.FAILED, guardsPassed.errorCode, guardsPassed.reason);
      }
      return await getDisbursement(id);
    }

    const result = await actions.execute(disbursement, targetState);
    if (result.success) {
      await transitionTo(ctx, id, disbursement.status, targetState, null, result.message);
    } else {
      if (result.requiresManualReview) {
        await transitionTo(ctx, id, disbursement.status, BOS_STATES.MANUAL_REVIEW_REQUIRED, null, result.message);
      } else {
        await incrementRetry(ctx, id, result.message);
        if ((disbursement.retry_count || 0) + 1 > (disbursement.max_retries || DEFAULT_MAX_RETRIES)) {
          await transitionTo(ctx, id, disbursement.status, BOS_STATES.FAILED, ERROR_CODES.RETRY_EXHAUSTED, result.message);
        }
      }
    }

    return await getDisbursement(id);
  }

  async function transitionTo(ctx, id, fromStatus, toStatus, errorCode, reason) {
    const db = ctx.db;
    const logger = ctx.logger;

    if (!isValidTransition(fromStatus, toStatus)) {
      logger.error(`[bos] Invalid transition: ${fromStatus} -> ${toStatus} for ${id}`);
      return;
    }

    try {
      const updates = {
        status: toStatus,
        updated_at: new Date().toISOString(),
      };
      if (errorCode) updates.last_error = `${errorCode}: ${reason || ''}`;
      if (toStatus === BOS_STATES.FAILED) updates.failed_at = new Date().toISOString();
      if (toStatus === BOS_STATES.CANCELLED) updates.cancelled_at = new Date().toISOString();
      if (toStatus === BOS_STATES.MANUAL_REVIEW_REQUIRED) updates.manual_review_at = new Date().toISOString();
      if (toStatus === BOS_STATES.SETTLED) updates.settled_at = new Date().toISOString();
      if (toStatus === BOS_STATES.BURN_SUBMITTED) updates.external_tx_id = reason;
      updates.last_heartbeat_at = new Date().toISOString();

      const setClauses = Object.entries(updates)
        .filter(([k]) => k !== 'id')
        .map(([k], i) => `${k} = $${i + 1}`);

      const values = Object.entries(updates)
        .filter(([k]) => k !== 'id')
        .map(([, v]) => v);

      values.push(id);

      await db.query(
        `UPDATE disbursements SET ${setClauses.join(', ')} WHERE id = $${values.length}`,
        values
      );

      await recordAuditEvent(ctx, {
        disbursementId: id,
        eventType: 'state_transition',
        fromStatus,
        toStatus,
        guardResult: errorCode ? 'fail' : 'pass',
        guardReason: reason,
      });

      if (toStatus === BOS_STATES.FAILED || toStatus === BOS_STATES.SETTLED) {
        if (ctx.emit) {
          ctx.emit(toStatus === BOS_STATES.SETTLED ? 'disbursement:settled' : 'disbursement:failed', { id, fromStatus, reason });
        }
      }

      logger.info(`[bos] ${id}: ${fromStatus} -> ${toStatus}${reason ? ` (${reason})` : ''}`);
    } catch (dbErr) {
      logger.error(`[bos] DB error during transition ${id}: ${dbErr.message}`);
    }
  }

  async function incrementRetry(ctx, id, reason) {
    const db = ctx.db;
    try {
      await db.query(
        `UPDATE disbursements SET retry_count = retry_count + 1, last_error = $1, updated_at = NOW(), last_heartbeat_at = NOW() WHERE id = $2`,
        [reason, id]
      );
    } catch (err) {
      ctx.logger.error(`[bos] Failed to increment retry for ${id}: ${err.message}`);
    }
  }

  async function failDisbursement(id, errorCode, reason) {
    const disbursement = await getDisbursement(id);
    if (!disbursement) throw Object.assign(new Error('Not found'), { code: ERROR_CODES.INVALID_CAMPAIGN });
    await transitionTo(ctx, id, disbursement.status, BOS_STATES.FAILED, errorCode, reason);
  }

  async function cancelDisbursement(id, reason) {
    const disbursement = await getDisbursement(id);
    if (!disbursement) throw Object.assign(new Error('Not found'), { code: ERROR_CODES.INVALID_CAMPAIGN });
    if (isTerminal(disbursement.status)) {
      throw Object.assign(new Error('Already in terminal state'), { code: ERROR_CODES.TRANSITION_FORBIDDEN });
    }
    await transitionTo(ctx, id, disbursement.status, BOS_STATES.CANCELLED, null, reason);
  }

  async function getDisbursementsByStatus(status, { limit = 50, offset = 0 } = {}) {
    try {
      return await db.all(
        'SELECT * FROM disbursements WHERE status = $1 ORDER BY updated_at ASC LIMIT $2 OFFSET $3',
        [status, limit, offset]
      );
    } catch (dbErr) {
      const err = new Error(`DB error: ${dbErr.message}`);
      err.code = ERROR_CODES.DB_ERROR;
      throw err;
    }
  }

  return {
    createDisbursement,
    getDisbursement,
    getDisbursementByIdempotencyKey,
    getActiveDisbursements,
    advanceDisbursement,
    transitionTo: (id, fromStatus, toStatus, errorCode, reason) =>
      transitionTo(ctx, id, fromStatus, toStatus, errorCode, reason),
    failDisbursement,
    cancelDisbursement,
    getDisbursementsByStatus,
    recordAuditEvent: (params) => recordAuditEvent(ctx, params),
  };
}

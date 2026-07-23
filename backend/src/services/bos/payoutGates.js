import { DisbursementState } from './types.js';

export async function amountTolerance(disbursement, ctx) {
  const log = ctx.getLogger('gate:amountTolerance');
  const amountUsd = Number(disbursement.amount_usd);

  if (!amountUsd || amountUsd <= 0) {
    return { ok: false, error_code: 'u8241', reason: 'amount_usd is zero or negative', details: { amount_usd: disbursement.amount_usd } };
  }

  try {
    const db = ctx.getDb();
    const milestone = await db.get(
      `SELECT amount_usd as expected_amount FROM disbursements WHERE campaign_id = $1 AND id != $2 AND amount_usd IS NOT NULL ORDER BY created_at DESC LIMIT 1`,
      [disbursement.campaign_id, disbursement.id]
    );

    if (!milestone) {
      log?.warn({ id: disbursement.id }, 'No milestone amount found for campaign — passing with warning');
      return { ok: true, warning: 'no_milestone_amount_found', details: { campaign_id: disbursement.campaign_id } };
    }

    const expected = Number(milestone.expected_amount);
    if (!expected || expected <= 0) {
      return { ok: true, warning: 'milestone_amount_invalid', details: { expected } };
    }

    const deviation = Math.abs(amountUsd - expected) / expected;
    if (deviation > 0.02) {
      return {
        ok: false,
        error_code: 'u8242',
        reason: `Amount deviation ${(deviation * 100).toFixed(2)}% exceeds 2% tolerance`,
        details: { expected, actual: amountUsd, deviation_pct: (deviation * 100).toFixed(4) },
      };
    }

    return { ok: true, details: { expected, actual: amountUsd, deviation_pct: (deviation * 100).toFixed(4) } };
  } catch (err) {
    log?.error({ id: disbursement.id, error: err.message }, 'Amount tolerance check failed');
    return { ok: false, error_code: 'u8241', reason: `Amount check failed: ${err.message}` };
  }
}

export async function attributableFunds(disbursement, ctx) {
  const log = ctx.getLogger('gate:attributableFunds');
  const amountUsdcx = Number(disbursement.amount_usdcx);

  try {
    const db = ctx.getDb();

    const escrowRow = await db.get(
      `SELECT d.id FROM disbursements d WHERE d.campaign_id = $1 AND d.id != $2 LIMIT 1`,
      [disbursement.campaign_id, disbursement.id]
    );

    if (!escrowRow) {
      return {
        ok: false,
        error_code: 'u8244',
        reason: `Campaign ${disbursement.campaign_id} not found in escrow`,
        details: { campaign_id: disbursement.campaign_id },
      };
    }

    const campaignDisbursements = await db.get(
      `SELECT COALESCE(SUM(amount_usdcx), 0) as total_disbursed FROM disbursements WHERE campaign_id = $1 AND status NOT IN ($2, $3, $4)`,
      [disbursement.campaign_id, DisbursementState.FAILED, DisbursementState.CANCELLED, DisbursementState.MANUAL_REVIEW]
    );

    const totalDisbursed = Number(campaignDisbursements?.total_disbursed || 0);

    const fundingRow = await db.get(
      `SELECT COALESCE(SUM(amount_usdcx), 0) as total_funded FROM disbursements WHERE campaign_id = $1`,
      [disbursement.campaign_id]
    );

    const totalFunded = Number(fundingRow?.total_funded || 0);

    if (totalFunded < amountUsdcx) {
      return {
        ok: false,
        error_code: 'u8243',
        reason: `Escrow balance ${totalFunded} < disbursement amount ${amountUsdcx}`,
        details: { escrow_balance: totalFunded, requested: amountUsdcx },
      };
    }

    if (totalFunded > 0 && totalFunded !== amountUsdcx) {
      return {
        ok: false,
        error_code: 'u8245',
        reason: `Escrow funds ${totalFunded} don't match disbursement amount ${amountUsdcx}`,
        details: { escrow_balance: totalFunded, requested: amountUsdcx },
      };
    }

    return { ok: true, details: { escrow_balance: totalFunded, requested: amountUsdcx } };
  } catch (err) {
    log?.error({ id: disbursement.id, error: err.message }, 'Attributable funds check failed');
    return { ok: false, error_code: 'u8243', reason: `Attributable funds check failed: ${err.message}` };
  }
}

export function beneficiaryPayload(disbursement, _ctx) {
  const creatorAddress = disbursement.creator_address;
  const amountUsdcx = Number(disbursement.amount_usdcx);
  const campaignId = disbursement.campaign_id;

  if (!creatorAddress || typeof creatorAddress !== 'string' || creatorAddress.trim().length === 0) {
    return { ok: false, error_code: 'u8246', reason: 'creator_address is missing or empty' };
  }

  if (!/^(SP|ST)[A-Z0-9]{38,}$/.test(creatorAddress)) {
    return {
      ok: false,
      error_code: 'u8246',
      reason: `Invalid Stacks address format: ${creatorAddress}`,
      details: { creator_address: creatorAddress },
    };
  }

  if (!amountUsdcx || amountUsdcx <= 0) {
    return {
      ok: false,
      error_code: 'u8247',
      reason: `amount_usdcx must be > 0, got ${disbursement.amount_usdcx}`,
      details: { amount_usdcx: disbursement.amount_usdcx },
    };
  }

  if (campaignId === null || campaignId === undefined) {
    return { ok: false, error_code: 'u8248', reason: 'campaign_id is null or undefined' };
  }

  return { ok: true };
}

export async function whitelistPrerequisite(disbursement, ctx) {
  const log = ctx.getLogger('gate:whitelistPrerequisite');

  try {
    const db = ctx.getDb();
    const profile = await db.get(
      `SELECT * FROM profiles WHERE address = $1`,
      [disbursement.creator_address]
    );

    if (!profile) {
      return {
        ok: false,
        error_code: 'u8249',
        reason: `Creator ${disbursement.creator_address} not found in profiles`,
        details: { creator_address: disbursement.creator_address },
      };
    }

    if (!profile.verified) {
      return {
        ok: false,
        error_code: 'u8249',
        reason: `Creator ${disbursement.creator_address} is not verified`,
        details: { creator_address: disbursement.creator_address },
      };
    }

    if (profile.verification_expires_at && new Date(profile.verification_expires_at) < new Date()) {
      return {
        ok: false,
        error_code: 'u824A',
        reason: `Creator verification expired at ${profile.verification_expires_at}`,
        details: { creator_address: disbursement.creator_address, expires_at: profile.verification_expires_at },
      };
    }

    return { ok: true, details: { verified: true } };
  } catch (err) {
    log?.error({ id: disbursement.id, error: err.message }, 'Whitelist check failed');
    return { ok: false, error_code: 'u8249', reason: `Whitelist check failed: ${err.message}` };
  }
}

export async function runAllGates(disbursement, ctx) {
  const log = ctx.getLogger('gate:runAll');
  const gateResults = [];

  const gates = [
    { name: 'amount_tolerance', fn: amountTolerance },
    { name: 'attributable_funds', fn: attributableFunds },
    { name: 'beneficiary_payload', fn: beneficiaryPayload },
    { name: 'whitelist', fn: whitelistPrerequisite },
  ];

  for (const gate of gates) {
    const result = await gate.fn(disbursement, ctx);
    gateResults.push({
      gate: gate.name,
      ok: result.ok,
      error_code: result.error_code || null,
      reason: result.reason || null,
      warning: result.warning || null,
      details: result.details || null,
    });

    if (!result.ok) {
      log?.warn(
        { id: disbursement.id, gate: gate.name, error_code: result.error_code },
        `Gate failed: ${result.reason}`
      );
      break;
    }
  }

  const allPassed = gateResults.every(r => r.ok);
  return { ok: allPassed, gate_results: gateResults };
}

function rows(result) {
  return result?.rows || result || [];
}

export async function overallStateDistribution(db) {
  const r = await db.query(
    `SELECT status, COUNT(*)::int AS count
     FROM disbursements
     GROUP BY status
     ORDER BY count DESC`
  );
  return rows(r);
}

export async function totalVolumeDisbursed(db) {
  const r = await db.query(
    `SELECT SUM(amount_usd)::float AS total_usd,
            COUNT(*)::int AS total_disbursements
     FROM disbursements
     WHERE status = 'settled'`
  );
  return r.rows?.[0] || { total_usd: 0, total_disbursements: 0 };
}

export async function recentActivity(db, limit = 50) {
  const r = await db.query(
    `SELECT d.id, d.status, d.amount_usd, d.creator_btc_address,
            d.ngn_recipient, d.updated_at,
            COALESCE((SELECT COUNT(*) FROM disbursement_audit da WHERE da.disbursement_id = d.id), 0) AS audit_events
     FROM disbursements d
     ORDER BY d.updated_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows(r);
}

export async function failureBreakdown(db) {
  const r = await db.query(
    `SELECT COALESCE(last_error, 'unknown') AS error,
            COUNT(*)::int AS count
     FROM disbursements
     WHERE status = 'failed'
     GROUP BY last_error
     ORDER BY count DESC`
  );
  return rows(r);
}

export async function stuckDisbursements(db, thresholdMinutes = 60) {
  const r = await db.query(
    `SELECT id, status, updated_at, retry_count,
            EXTRACT(EPOCH FROM (NOW() - updated_at)) / 60 AS minutes_stuck
     FROM disbursements
     WHERE status NOT IN ('settled', 'failed', 'cancelled')
       AND manual_review_at IS NULL
       AND updated_at < NOW() - ($1 || ' minutes')::interval
     ORDER BY updated_at ASC`,
    [thresholdMinutes]
  );
  return rows(r);
}

export async function manualReviewQueue(db) {
  const r = await db.query(
    `SELECT * FROM disbursements
     WHERE manual_review_at IS NOT NULL
     ORDER BY manual_review_at ASC`
  );
  return rows(r);
}

export async function adapterHealthSnapshot(db) {
  const r = await db.query(
    `SELECT external_system,
            status,
            COUNT(*)::int AS count,
            MAX(captured_at) AS last_seen
     FROM external_status_snapshots
     WHERE captured_at > NOW() - interval '24 hours'
     GROUP BY external_system, status
     ORDER BY external_system, count DESC`
  );
  return rows(r);
}

export async function exchangeRateHistory(db, days = 7) {
  const r = await db.query(
    `SELECT * FROM exchange_rates
     WHERE updated_at > NOW() - ($1 || ' days')::interval
     ORDER BY updated_at ASC`,
    [days]
  );
  return rows(r);
}

export default {
  overallStateDistribution,
  totalVolumeDisbursed,
  recentActivity,
  failureBreakdown,
  stuckDisbursements,
  manualReviewQueue,
  adapterHealthSnapshot,
  exchangeRateHistory,
};

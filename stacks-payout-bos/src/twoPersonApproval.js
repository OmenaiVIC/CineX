export function createTwoPersonApproval(ctx) {
  const { db, logger, config } = ctx;
  const requiredApprovers = config.requiredApprovers || 2;

  const APPROVAL_THRESHOLD_USDCX = BigInt(config.approvalThresholdUsdcx || '100000000000');

  async function requiresApproval(disbursement) {
    const amount = BigInt(disbursement.amount_usdcx || '0');
    return amount >= APPROVAL_THRESHOLD_USDCX;
  }

  async function getApprovals(disbursementId) {
    try {
      return await db.all(
        'SELECT * FROM two_person_approvals WHERE disbursement_id = $1 ORDER BY created_at ASC',
        [disbursementId]
      );
    } catch (err) {
      logger.warn(`[bos:approval] Failed to get approvals: ${err.message}`);
      return [];
    }
  }

  async function addApproval(disbursementId, approver, reason) {
    try {
      await db.query(
        `INSERT INTO two_person_approvals (disbursement_id, approved_by, reason)
         VALUES ($1, $2, $3)
         ON CONFLICT (disbursement_id, approved_by) DO NOTHING`,
        [disbursementId, approver, reason || null]
      );
      return true;
    } catch (err) {
      logger.error(`[bos:approval] Failed to add approval: ${err.message}`);
      return false;
    }
  }

  async function isApproved(disbursement) {
    if (!await requiresApproval(disbursement)) {
      return { approved: true, required: 0, current: 0 };
    }

    const approvals = await getApprovals(disbursement.id);
    const current = approvals.length;
    return {
      approved: current >= requiredApprovers,
      required: requiredApprovers,
      current,
      approvals,
    };
  }

  return {
    requiresApproval,
    getApprovals,
    addApproval,
    isApproved,
  };
}

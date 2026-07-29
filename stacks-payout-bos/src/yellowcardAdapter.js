export function createYellowCardAdapter(ctx) {
  const { logger, config } = ctx;
  const baseUrl = config.yellowCardApiUrl || 'https://api.yellowcard.com/v1';
  const apiKey = config.yellowCardApiKey || '';

  async function initiatePayout({ amount, currency = 'NGN', recipient, reference }) {
    logger.info(`[bos:yellowcard] Initiating payout: ${amount} ${currency} ref=${reference}`);

    if (!apiKey) {
      logger.warn('[bos:yellowcard] No API key configured — returning mock payout');
      return { payoutId: `mock-pay-${Date.now()}`, status: 'pending', reference };
    }

    try {
      const resp = await fetch(`${baseUrl}/payouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({ amount, currency, recipient, reference }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Yellow Card payout failed: ${resp.status} ${text}`);
      }

      return await resp.json();
    } catch (err) {
      logger.error(`[bos:yellowcard] Payout error: ${err.message}`);
      throw err;
    }
  }

  async function getPayoutStatus(payoutId) {
    if (payoutId.startsWith('mock-')) {
      return { status: 'completed', payoutId };
    }

    try {
      const resp = await fetch(`${baseUrl}/payouts/${payoutId}`, {
        headers: { 'X-API-Key': apiKey },
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Yellow Card status failed: ${resp.status} ${text}`);
      }

      return await resp.json();
    } catch (err) {
      logger.error(`[bos:yellowcard] Status error: ${err.message}`);
      throw err;
    }
  }

  async function healthCheck() {
    try {
      const resp = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(5000) });
      return resp.ok;
    } catch {
      return !!apiKey;
    }
  }

  return {
    initiatePayout,
    getPayoutStatus,
    healthCheck,
  };
}

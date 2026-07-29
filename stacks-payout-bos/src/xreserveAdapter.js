export function createXReserveAdapter(ctx) {
  const { logger, config } = ctx;
  const baseUrl = config.xreserveApiUrl || 'https://api.xreserve.co/v1';
  const apiKey = config.xreserveApiKey || '';

  async function requestAttestation(amount, memo) {
    logger.info(`[bos:xreserve] Requesting attestation for ${amount} USDCx`);

    if (!apiKey) {
      logger.warn('[bos:xreserve] No API key configured — returning mock attestation');
      return { attestationId: `mock-attr-${Date.now()}`, status: 'pending' };
    }

    try {
      const resp = await fetch(`${baseUrl}/attestations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({ amount_usdcx: amount, memo }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`xReserve attestation request failed: ${resp.status} ${text}`);
      }

      return await resp.json();
    } catch (err) {
      logger.error(`[bos:xreserve] Attestation request error: ${err.message}`);
      throw err;
    }
  }

  async function getAttestationStatus(attestationId) {
    logger.info(`[bos:xreserve] Checking attestation status: ${attestationId}`);

    if (attestationId.startsWith('mock-')) {
      return { status: 'completed', attestationId };
    }

    try {
      const resp = await fetch(`${baseUrl}/attestations/${attestationId}`, {
        headers: { 'X-API-Key': apiKey },
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`xReserve attestation status failed: ${resp.status} ${text}`);
      }

      return await resp.json();
    } catch (err) {
      logger.error(`[bos:xreserve] Attestation status error: ${err.message}`);
      throw err;
    }
  }

  async function releaseDestination(attestationId) {
    logger.info(`[bos:xreserve] Releasing destination for attestation: ${attestationId}`);

    if (attestationId.startsWith('mock-')) {
      return { releaseId: `mock-rel-${Date.now()}`, status: 'pending' };
    }

    try {
      const resp = await fetch(`${baseUrl}/releases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({ attestation_id: attestationId }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`xReserve release failed: ${resp.status} ${text}`);
      }

      return await resp.json();
    } catch (err) {
      logger.error(`[bos:xreserve] Release error: ${err.message}`);
      throw err;
    }
  }

  async function getReleaseStatus(releaseId) {
    logger.info(`[bos:xreserve] Checking release status: ${releaseId}`);

    if (releaseId.startsWith('mock-')) {
      return { status: 'confirmed', releaseId };
    }

    try {
      const resp = await fetch(`${baseUrl}/releases/${releaseId}`, {
        headers: { 'X-API-Key': apiKey },
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`xReserve release status failed: ${resp.status} ${text}`);
      }

      return await resp.json();
    } catch (err) {
      logger.error(`[bos:xreserve] Release status error: ${err.message}`);
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
    requestAttestation,
    getAttestationStatus,
    releaseDestination,
    getReleaseStatus,
    healthCheck,
  };
}

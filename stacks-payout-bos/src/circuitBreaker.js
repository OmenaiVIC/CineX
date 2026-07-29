export function createCircuitBreaker(ctx) {
  const { db, logger, config } = ctx;

  const FAILURE_THRESHOLD = config.circuitBreakerFailureThreshold || 5;
  const RESET_TIMEOUT_MS = config.circuitBreakerResetTimeoutMs || 300_000;
  const HALF_OPEN_MAX = config.circuitBreakerHalfOpenMax || 3;

  const STATE = { CLOSED: 'closed', OPEN: 'open', HALF_OPEN: 'half_open' };
  const stores = new Map();

  function getStore(name) {
    if (!stores.has(name)) {
      stores.set(name, { state: STATE.CLOSED, failures: 0, halfOpenAttempts: 0, lastFailure: null, lastStateChange: Date.now() });
    }
    return stores.get(name);
  }

  function isOpen(name) {
    const store = getStore(name);
    if (store.state === STATE.CLOSED) return false;
    if (store.state === STATE.OPEN) {
      if (Date.now() - store.lastStateChange > RESET_TIMEOUT_MS) {
        store.state = STATE.HALF_OPEN;
        store.halfOpenAttempts = 0;
        store.lastStateChange = Date.now();
        logger.info(`[bos:circuit] ${name} OPEN -> HALF_OPEN (timeout elapsed)`);
        return false;
      }
      return true;
    }
    if (store.state === STATE.HALF_OPEN) {
      if (store.halfOpenAttempts >= HALF_OPEN_MAX) {
        store.state = STATE.OPEN;
        store.lastStateChange = Date.now();
        logger.warn(`[bos:circuit] ${name} HALF_OPEN -> OPEN (max attempts reached)`);
        return true;
      }
      return false;
    }
    return false;
  }

  function recordSuccess(name) {
    const store = getStore(name);
    store.failures = 0;
    if (store.state === STATE.HALF_OPEN) {
      store.state = STATE.CLOSED;
      store.lastStateChange = Date.now();
      logger.info(`[bos:circuit] ${name} HALF_OPEN -> CLOSED (success)`);
    }
  }

  function recordFailure(name) {
    const store = getStore(name);
    store.failures++;
    store.lastFailure = Date.now();

    if (store.state === STATE.HALF_OPEN) {
      store.halfOpenAttempts++;
      if (store.halfOpenAttempts >= HALF_OPEN_MAX) {
        store.state = STATE.OPEN;
        store.lastStateChange = Date.now();
        logger.warn(`[bos:circuit] ${name} HALF_OPEN -> OPEN (failure threshold in half-open)`);
      }
    } else if (store.failures >= FAILURE_THRESHOLD) {
      store.state = STATE.OPEN;
      store.lastStateChange = Date.now();
      logger.warn(`[bos:circuit] ${name} CLOSED -> OPEN (${store.failures} failures)`);
    }
  }

  function reset(name) {
    const store = getStore(name);
    store.state = STATE.CLOSED;
    store.failures = 0;
    store.halfOpenAttempts = 0;
    store.lastFailure = null;
    store.lastStateChange = Date.now();
    logger.info(`[bos:circuit] ${name} manually reset to CLOSED`);
  }

  function getState(name) {
    const store = getStore(name);
    return {
      name,
      state: store.state,
      failures: store.failures,
      halfOpenAttempts: store.halfOpenAttempts,
      lastFailure: store.lastFailure,
      lastStateChange: store.lastStateChange,
    };
  }

  async function executeWithProtection(name, fn) {
    if (isOpen(name)) {
      throw new Error(`Circuit breaker OPEN for ${name}`);
    }

    try {
      const result = await fn();
      if (storeExists(name)) {
        recordSuccess(name);
      }
      return result;
    } catch (err) {
      recordFailure(name);
      throw err;
    }
  }

  function storeExists(name) {
    return stores.has(name);
  }

  return {
    isOpen,
    recordSuccess,
    recordFailure,
    reset,
    getState,
    executeWithProtection,
    STATE,
  };
}

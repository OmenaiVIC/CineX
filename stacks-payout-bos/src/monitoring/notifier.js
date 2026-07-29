const DEFAULT_OPTIONS = {
  rateLimitWindowMs: 3600_1000,
  maxNotificationsPerWindow: 10,
  minSeverity: 'warn',
};

const SEVERITY_ORDER = ['debug', 'info', 'warn', 'error', 'critical'];

let notificationCounter = 0;

function meetsSeverityThreshold(severity, minSeverity) {
  const sIdx = SEVERITY_ORDER.indexOf(severity);
  const mIdx = SEVERITY_ORDER.indexOf(minSeverity);
  if (sIdx === -1) return false;
  if (mIdx === -1) return true;
  return sIdx >= mIdx;
}

export function createNotifier(ctx, options = {}) {
  const logger = ctx?.logger || console;
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const notifiedKeys = new Map();
  let windowCount = 0;
  let windowStart = Date.now();

  function resetWindow() {
    windowStart = Date.now();
    windowCount = 0;
    notifiedKeys.clear();
  }

  function isRateLimited() {
    if (Date.now() - windowStart > opts.rateLimitWindowMs) {
      resetWindow();
      return false;
    }
    return windowCount >= opts.maxNotificationsPerWindow;
  }

  function notify({ type, severity, message, metadata }) {
    if (type !== undefined && type !== null) {
      return send({ type, severity, message, metadata });
    }
    return send({ type: null, severity, message, metadata });
  }

  async function send({ type, severity, message, metadata }) {
    const sev = severity || 'info';
    if (!meetsSeverityThreshold(sev, opts.minSeverity)) return false;

    if (isRateLimited()) {
      logger.warn(`[bos:notifier] Rate limited for: ${type || 'unknown'}`);
      return false;
    }

    notificationCounter++;

    if (type) {
      const dedupKey = `${type}:${message?.substring(0, 60)}`;
      const lastSent = notifiedKeys.get(dedupKey);
      if (lastSent && (Date.now() - lastSent) < opts.rateLimitWindowMs) {
        logger.debug(`[bos:notifier] Deduped: ${dedupKey}`);
        return false;
      }
      notifiedKeys.set(dedupKey, Date.now());
    }

    windowCount++;

    const logMsg = `[bos:${sev}] ${message}${metadata ? ' ' + JSON.stringify(metadata) : ''}`;
    if (sev === 'error' || sev === 'critical') {
      logger.error(logMsg);
    } else if (sev === 'warn') {
      logger.warn(logMsg);
    } else {
      logger.info(logMsg);
    }

    if (ctx?.alertHandler) {
      try {
        await ctx.alertHandler({ type, severity: sev, message, metadata });
      } catch (err) {
        logger.error(`[bos:notifier] Alert handler failed: ${err.message}`);
      }
    }

    return true;
  }

  function getStats() {
    return { totalSent: notificationCounter, windowCount };
  }

  return { notify, getStats };
}

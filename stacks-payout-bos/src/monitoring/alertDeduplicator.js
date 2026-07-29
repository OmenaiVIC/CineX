const IN_MEMORY_LOG = [];
const MAX_LOG_SIZE = 500;
const DEDUP_WINDOW_MS = 3600_1000;

export function createAlertDeduplicator(ctx) {
  const logger = ctx?.logger || console;
  let dedupLog = [...IN_MEMORY_LOG];

  function getKey(alert) {
    return `${alert.type}:${alert.severity}:${alert.message?.substring(0, 80)}`;
  }

  function isDuplicate(alert) {
    const key = getKey(alert);
    const now = Date.now();
    const recent = dedupLog.find(
      e => e.key === key && (now - e.timestamp) < DEDUP_WINDOW_MS
    );
    return !!recent;
  }

  function record(alert) {
    const key = getKey(alert);
    dedupLog.push({ key, timestamp: Date.now() });

    if (dedupLog.length > MAX_LOG_SIZE) {
      dedupLog = dedupLog.slice(-Math.floor(MAX_LOG_SIZE / 2));
    }
  }

  function shouldSend(alert) {
    if (isDuplicate(alert)) {
      logger.debug(`[bos:alerts] Deduped alert: ${getKey(alert)}`);
      return false;
    }
    record(alert);
    return true;
  }

  function getStats() {
    return { logSize: dedupLog.length, windowMs: DEDUP_WINDOW_MS };
  }

  return { shouldSend, getStats, isDuplicate };
}
